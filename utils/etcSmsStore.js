const ETC_INDEX_KEY = 'etc_sms_record_index'
const ETC_RECORD_KEY_PREFIX = 'etc_sms_record:'
const MAX_RECORDS = 500

export function parseEtcSms(rawText) {
	const text = String(rawText || '').replace(/\s+/g, '')
	if (!text.includes('ETC')) {
		return null
	}

	const matched = text.match(/车辆（(.+?)）于(\d{4}年\d{1,2}月\d{1,2}日)在(.+?)驶入，至(.+?)驶出，共计消费([\d.]+)元/)
	if (!matched) return createRawEtcRecord(rawText)

	const [, plateNo, passDateText, entryStation, exitStation, amountText] = matched
	const bankMatched = text.match(/【(.+?)】$/)
	return {
		parsed: true,
		plateNo,
		passDateText,
		entryStation,
		exitStation,
		amount: Number(amountText),
		amountText,
		sender: bankMatched ? bankMatched[1] : '',
		rawText
	}
}

function createRawEtcRecord(rawText) {
	return {
		parsed: false,
		plateNo: '',
		passDateText: '',
		entryStation: '',
		exitStation: '',
		amount: null,
		amountText: '',
		sender: '',
		rawText
	}
}

export function saveEtcSms(rawSms) {
	const parsed = parseEtcSms(rawSms.body)
	if (!parsed) return null

	const record = {
		id: createRecordId(rawSms, parsed),
		receivedAt: Date.now(),
		smsSender: rawSms.sender || '',
		smsTime: rawSms.time || '',
		...parsed
	}
	const oldIndex = getEtcSmsIndex()
	if (oldIndex.some((item) => item.id === record.id)) return record

	uni.setStorageSync(`${ETC_RECORD_KEY_PREFIX}${record.id}`, record)
	const nextIndex = [
		toIndexItem(record),
		...oldIndex
	].slice(0, MAX_RECORDS)
	trimOldRecords(oldIndex, nextIndex)
	uni.setStorageSync(ETC_INDEX_KEY, nextIndex)
	return record
}

export function getEtcSmsRecords(receivedDateFrom) {
	const sinceTime = parseReceivedDateFrom(receivedDateFrom)
	return getEtcSmsIndex()
		.map((item) => uni.getStorageSync(`${ETC_RECORD_KEY_PREFIX}${item.id}`))
		.filter(Boolean)
		.filter((item) => sinceTime === null || item.receivedAt >= sinceTime)
}

function getEtcSmsIndex() {
	const value = uni.getStorageSync(ETC_INDEX_KEY)
	return Array.isArray(value) ? value : []
}

function toIndexItem(record) {
	return {
		id: record.id,
		receivedAt: record.receivedAt,
		plateNo: record.plateNo,
		passDateText: record.passDateText,
		entryStation: record.entryStation,
		exitStation: record.exitStation,
		amount: record.amount
	}
}

function trimOldRecords(oldIndex, nextIndex) {
	const keptIds = new Set(nextIndex.map((item) => item.id))
	oldIndex
		.filter((item) => !keptIds.has(item.id))
		.forEach((item) => uni.removeStorageSync(`${ETC_RECORD_KEY_PREFIX}${item.id}`))
}

function createRecordId(rawSms, parsed) {
	return `etc_${hashText([rawSms.sender || '', rawSms.body || '', parsed.amountText].join('|'))}`
}

function hashText(text) {
	let hash = 5381
	for (let index = 0; index < text.length; index += 1) {
		hash = ((hash << 5) + hash) + text.charCodeAt(index)
		hash >>>= 0
	}
	return hash.toString(36)
}

function parseReceivedDateFrom(value) {
	if (!value) return null
	if (typeof value === 'number') return startOfDay(value)
	if (value instanceof Date) return startOfDay(value.getTime())

	const matched = String(value).match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/)
	if (!matched) return null

	const [, year, month, day] = matched
	return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
}

function startOfDay(timestamp) {
	const date = new Date(timestamp)
	date.setHours(0, 0, 0, 0)
	return date.getTime()
}
