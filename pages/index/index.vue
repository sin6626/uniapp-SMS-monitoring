<template>
	<view class="content">
		<view class="panel">
			<view class="header">
				<text class="title">短信监听</text>
				<text :class="['badge', listening ? 'badge-on' : '']">{{ listening ? '监听中' : '未监听' }}</text>
			</view>

			<view class="meta">
				<text>权限：{{ permissionText }}</text>
				<text>平台：{{ platformText }}</text>
			</view>

			<view class="actions">
				<button class="primary" :disabled="listening" @click="startListening">开始监听</button>
				<button class="secondary" :disabled="!listening" @click="stopListening">停止监听</button>
			</view>

			<view class="logs">
				<view v-if="!logs.length" class="empty">暂无短信</view>
				<view v-for="item in logs" :key="item.id" class="log-item">
					<view class="log-head">
						<text class="sender">{{ item.sender || '未知号码' }}</text>
						<text class="time">{{ item.time }}</text>
					</view>
					<text class="body">{{ item.body }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import { ref } from 'vue'
	import { onLoad, onUnload } from '@dcloudio/uni-app'

	const SMS_PERMISSION = 'android.permission.RECEIVE_SMS'
	const SMS_RECEIVED_ACTION = 'android.provider.Telephony.SMS_RECEIVED'

	const listening = ref(false)
	const logs = ref([])
	const permissionText = ref('未申请')
	const platformText = ref('非 Android App')

	let mainActivity = null
	let smsReceiver = null
	let smsFilter = null
	let registered = false

	onLoad(() => {
		// #ifdef APP-PLUS
		platformText.value = uni.getSystemInfoSync().platform === 'android' ? 'Android App' : '非 Android'
		// #endif
	})

	onUnload(() => {
		stopListening()
	})

	function startListening() {
		// #ifndef APP-PLUS
		uni.showToast({ title: '请运行到 Android App', icon: 'none' })
		return
		// #endif

		// #ifdef APP-PLUS
		if (uni.getSystemInfoSync().platform !== 'android') {
			uni.showToast({ title: '仅支持 Android', icon: 'none' })
			return
		}

		runWithPlus(async () => {
			if (registered) {
				listening.value = true
				return
			}

			const granted = await requestSmsPermission()
			if (!granted) return

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
			listening.value = true
			uni.showToast({ title: '已开始监听', icon: 'none' })
		})
		// #endif
	}

	function stopListening() {
		// #ifdef APP-PLUS
		if (registered && mainActivity && smsReceiver) {
			mainActivity.unregisterReceiver(smsReceiver)
		}
		registered = false
		smsReceiver = null
		smsFilter = null
		mainActivity = null
		// #endif

		listening.value = false
	}

	function runWithPlus(callback) {
		if (typeof plus !== 'undefined' && plus.android) {
			callback()
			return
		}

		document.addEventListener('plusready', callback, { once: true })
	}

	function requestSmsPermission() {
		return new Promise((resolve) => {
			plus.android.requestPermissions(
				[SMS_PERMISSION],
				(result) => {
					const denied = [...(result.deniedAlways || []), ...(result.deniedPresent || [])]
					permissionText.value = denied.length ? '已拒绝' : '已授权'
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
					permissionText.value = '申请失败'
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
		logs.value.unshift(sms)
		logs.value = logs.value.slice(0, 20)
		uni.$emit('sms:received', sms)
		uni.showToast({ title: '收到短信', icon: 'none' })
	}

	function formatTime(timestamp) {
		const date = timestamp ? new Date(Number(timestamp)) : new Date()
		const pad = (value) => String(value).padStart(2, '0')
		return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
	}
</script>

<style>
	.content {
		display: flex;
		min-height: 100vh;
		padding: 32rpx;
		background: #f6f7fb;
		box-sizing: border-box;
	}

	.panel {
		width: 100%;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 28rpx;
	}

	.title {
		font-size: 44rpx;
		font-weight: 700;
		color: #111827;
	}

	.badge {
		min-width: 112rpx;
		padding: 10rpx 16rpx;
		border-radius: 8rpx;
		background: #e5e7eb;
		color: #374151;
		font-size: 24rpx;
		text-align: center;
	}

	.badge-on {
		background: #d1fae5;
		color: #047857;
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
		margin-bottom: 28rpx;
		color: #4b5563;
		font-size: 28rpx;
	}

	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16rpx;
		margin-bottom: 32rpx;
	}

	button {
		height: 88rpx;
		border-radius: 8rpx;
		font-size: 30rpx;
		line-height: 88rpx;
	}

	.primary {
		background: #2563eb;
		color: #ffffff;
	}

	.secondary {
		background: #ffffff;
		color: #111827;
	}

	.logs {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.empty,
	.log-item {
		padding: 24rpx;
		border: 1rpx solid #e5e7eb;
		border-radius: 8rpx;
		background: #ffffff;
	}

	.empty {
		color: #6b7280;
		text-align: center;
	}

	.log-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		margin-bottom: 12rpx;
	}

	.sender {
		max-width: 430rpx;
		color: #111827;
		font-size: 30rpx;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.time {
		color: #6b7280;
		font-size: 24rpx;
	}

	.body {
		color: #374151;
		font-size: 28rpx;
		line-height: 1.5;
		word-break: break-all;
	}
</style>
