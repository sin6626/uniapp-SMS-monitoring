import { getEtcSmsRecords, saveEtcSms } from './etcSmsStore.js'

const SMS_PERMISSION = 'android.permission.RECEIVE_SMS'
const SMS_RECEIVED_ACTION = 'android.provider.Telephony.SMS_RECEIVED'

let mainActivity = null
let smsReceiver = null
let smsFilter = null
let registered = false
let permissionText = '未申请'
let platformText = '非 Android App'

export function startListening() {
	// #ifndef APP-PLUS
	uni.showToast({ title: '请运行到 Android App', icon: 'none' })
	return Promise.resolve({ ok: false, reason: 'not-app-plus' })
	// #endif

	// #ifdef APP-PLUS
	refreshPlatformText()
	if (uni.getSystemInfoSync().platform !== 'android') {
		uni.showToast({ title: '仅支持 Android', icon: 'none' })
		return Promise.resolve({ ok: false, reason: 'not-android' })
	}

	return runWithPlus(async () => {
		if (registered) return { ok: true }

		const granted = await requestSmsPermission()
		if (!granted) return { ok: false, reason: 'permission-denied' }

		const IntentFilter = plus.android.importClass('android.content.IntentFilter')
		mainActivity = plus.android.runtimeMainActivity()

		smsFilter = new IntentFilter()
		smsFilter.addAction(SMS_RECEIVED_ACTION)
		smsReceiver = plus.android.implements('io.dcloud.feature.internal.reflect.BroadcastReceiver', {
			onReceive: (context, intent) => {
				handleSmsIntent(intent)
			}
		})

		mainActivity.registerReceiver(smsReceiver, smsFilter)
		registered = true
		uni.showToast({ title: '已开始监听', icon: 'none' })
		return { ok: true }
	})
	// #endif
}

export function stopListening() {
	// #ifdef APP-PLUS
	if (registered && mainActivity && smsReceiver) {
		mainActivity.unregisterReceiver(smsReceiver)
	}
	// #endif

	registered = false
	mainActivity = null
	smsReceiver = null
	smsFilter = null
	return getListeningContent()
}

export function getListeningContent(receivedDateFrom) {
	refreshPlatformText()
	const etcRecords = getEtcSmsRecords(receivedDateFrom)
	return {
		listening: registered,
		permissionText,
		platformText,
		messages: etcRecords.map(toSmsMessage),
		etcRecords
	}
}

function refreshPlatformText() {
	// #ifdef APP-PLUS
	platformText = uni.getSystemInfoSync().platform === 'android' ? 'Android App' : '非 Android'
	// #endif
}

function runWithPlus(callback) {
	if (typeof plus !== 'undefined' && plus.android) return callback()

	return new Promise((resolve) => {
		document.addEventListener('plusready', () => resolve(callback()), { once: true })
	})
}

function requestSmsPermission() {
	return new Promise((resolve) => {
		plus.android.requestPermissions(
			[SMS_PERMISSION],
			(result) => {
				const denied = [...(result.deniedAlways || []), ...(result.deniedPresent || [])]
				permissionText = denied.length ? '已拒绝' : '已授权'
				if (denied.length) {
					uni.showModal({
						title: '需要短信权限',
						content: '请授权接收短信权限后再监听。',
						showCancel: false
					})
				}
				resolve(!denied.length)
			},
			() => {
				permissionText = '申请失败'
				resolve(false)
			}
		)
	})
}

function handleSmsIntent(intent) {
	plus.android.importClass(intent)
	if (intent.getAction() !== SMS_RECEIVED_ACTION) return

	const SmsIntents = plus.android.importClass('android.provider.Telephony$Sms$Intents')
	const messages = SmsIntents.getMessagesFromIntent(intent) || []
	for (let index = 0; index < messages.length; index += 1) {
		const message = messages[index]
		plus.android.importClass(message)
		handleSmsReceived({
			id: `${Date.now()}-${index}`,
			sender: message.getDisplayOriginatingAddress(),
			body: message.getDisplayMessageBody(),
			time: formatTime(message.getTimestampMillis())
		})
	}
}

function handleSmsReceived(sms) {
	const etcRecord = saveEtcSms(sms)
	if (!etcRecord) return

	uni.$emit('sms:received', toSmsMessage(etcRecord))
	uni.$emit('etc-sms:received', etcRecord)
	uni.showToast({ title: '收到ETC短信', icon: 'none' })
}

function formatTime(timestamp) {
	const date = timestamp ? new Date(Number(timestamp)) : new Date()
	const pad = (value) => String(value).padStart(2, '0')
	return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function toSmsMessage(record) {
	return {
		id: record.id,
		sender: record.smsSender || record.sender || '',
		body: record.rawText,
		time: record.smsTime || formatTime(record.receivedAt),
		etcRecord: record
	}
}
