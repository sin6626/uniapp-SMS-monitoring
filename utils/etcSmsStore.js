const ETC_DATE_INDEX_KEY = 'etc_sms_record_dates'
const ETC_DAY_KEY_PREFIX = 'etc_sms_records:'
const DEFAULT_FILTER = {
	senderPrefix: '106',
	keywords: ['ETC']
}

export function parseEtcSms(rawText, keywords = DEFAULT_FILTER.keywords) {
	const text = String(rawText || '')
	const normalizedKeywords = normalizeList(keywords)
	if (!normalizedKeywords.every((keyword) => text.toUpperCase().includes(keyword.toUpperCase()))) return null

	return {
		rawText
	}
}

export function saveEtcSms(rawSms, filterOptions = DEFAULT_FILTER) {
	const options = normalizeFilterOptions(filterOptions)
	if (!shouldSaveSms(rawSms, options)) return null

	const parsed = parseEtcSms(rawSms.body, options.keywords)
	if (!parsed) return null

	const receivedAt = Number(rawSms.receivedAt) || Date.now()
	const record = {
		id: createRecordId(rawSms),
		receivedAt,
		smsSender: rawSms.sender || '',
		rawText: parsed.rawText
	}
	const dateKey = formatDateKey(receivedAt)
	const dayKey = `${ETC_DAY_KEY_PREFIX}${dateKey}`
	const records = getDayRecords(dateKey)
	if (records.some((item) => item.id === record.id)) return record

	uni.setStorageSync(dayKey, [record, ...records])
	saveDateKey(dateKey)
	return record
}

export function shouldSaveSms(rawSms, filterOptions = DEFAULT_FILTER) {
	const options = normalizeFilterOptions(filterOptions)
	const sender = normalizeSender(rawSms.sender)
	const body = String(rawSms.body || '')

	return options.senderPrefixes.some((prefix) => sender.startsWith(prefix)) &&
		options.keywords.every((keyword) => body.toUpperCase().includes(keyword.toUpperCase()))
}

export function getEtcSmsRecords(receivedDateFrom) {
	const fromDateKey = normalizeDateKey(receivedDateFrom)
	return getDateKeys()
		.filter((dateKey) => !fromDateKey || dateKey >= fromDateKey)
		.flatMap((dateKey) => getDayRecords(dateKey))
		.sort((left, right) => right.receivedAt - left.receivedAt)
}

export function normalizeDateKey(value) {
	if (!value) return ''
	if (typeof value === 'number') return formatDateKey(value)
	if (value instanceof Date) return formatDateKey(value.getTime())

	const text = String(value).trim()
	const matched = text.match(/^(\d{4})(?:年|-)(\d{1,2})(?:月|-)(\d{1,2})(?:日)?$/)
	if (!matched) return ''

	const [, year, month, day] = matched
	return `${year}-${pad(month)}-${pad(day)}`
}

function getDayRecords(dateKey) {
	const value = uni.getStorageSync(`${ETC_DAY_KEY_PREFIX}${dateKey}`)
	return Array.isArray(value) ? value : []
}

function getDateKeys() {
	const value = uni.getStorageSync(ETC_DATE_INDEX_KEY)
	return Array.isArray(value) ? value : []
}

function saveDateKey(dateKey) {
	const nextDates = Array.from(new Set([dateKey, ...getDateKeys()])).sort().reverse()
	uni.setStorageSync(ETC_DATE_INDEX_KEY, nextDates)
}

function createRecordId(rawSms) {
	return `etc_${hashText([rawSms.sender || '', rawSms.body || ''].join('|'))}`
}

function hashText(text) {
	let hash = 5381
	for (let index = 0; index < text.length; index += 1) {
		hash = ((hash << 5) + hash) + text.charCodeAt(index)
		hash >>>= 0
	}
	return hash.toString(36)
}

function formatDateKey(timestamp) {
	const date = new Date(timestamp)
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function pad(value) {
	return String(value).padStart(2, '0')
}

function normalizeFilterOptions(filterOptions) {
	const options = {
		...DEFAULT_FILTER,
		...(filterOptions || {})
	}
	return {
		senderPrefixes: normalizeList(options.senderPrefixes || options.senderPrefix),
		keywords: normalizeList(options.keywords || options.keyword)
	}
}

function normalizeList(value) {
	if (Array.isArray(value)) return value.map(String).filter(Boolean)
	if (value) return [String(value)]
	return []
}

function normalizeSender(sender) {
	return String(sender || '').trim().replace(/^\+86/, '')
}
