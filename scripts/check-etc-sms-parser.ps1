$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$storeSource = [System.IO.File]::ReadAllText("$projectRoot\utils\etcSmsStore.js", [System.Text.UTF8Encoding]::new($false))
$storeSource = $storeSource -replace "export function ", "function "
$listenerSource = [System.IO.File]::ReadAllText("$projectRoot\utils\smsListener.js", [System.Text.UTF8Encoding]::new($false))
$listenerSource = $listenerSource -replace "import \{ getEtcSmsRecords, saveEtcSms \} from './etcSmsStore.js'\r?\n", ""
$listenerSource = $listenerSource -replace "export function ", "function "

$check = @'
const writes = new Map()
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
globalThis.uni = {
  getStorageSync(key) { return writes.get(key) || '' },
  setStorageSync(key, value) { writes.set(key, value) },
  removeStorageSync(key) { writes.delete(key) },
  $emit(event, payload) { writes.set(`event:${event}`, payload) },
  showToast() {}
}

const raw = '\u5c0a\u656c\u7684ETC\u5ba2\u6237\uff1a\u60a8\u597d\uff01\u60a8\u7684\u8f66\u8f86\uff08****9R0\uff09\u4e8e2025\u5e7411\u670830\u65e5\u5728\u6e56\u5357\u704c\u6eaa\u7ad9\u9a76\u5165\uff0c\u81f3\u6e56\u5357\u957f\u6c99\u897f\u7ad9\u9a76\u51fa\uff0c\u5171\u8ba1\u6d88\u8d3971.85\u5143\u3002\u3010\u5de5\u5546\u94f6\u884c\u3011'
assert(parseEtcSms(raw).rawText === raw, 'parse etc raw')
assert(parseEtcSms('etc lower case').rawText === 'etc lower case', 'parse lower etc raw')
assert(parseEtcSms('code123456') === null, 'ignore non-etc')
assert(parseEtcSms('PASS notice', ['PASS']).rawText === 'PASS notice', 'custom keyword parsed')
assert(shouldSaveSms({ sender: '10690000', body: raw }) === true, 'official etc accepted')
assert(shouldSaveSms({ sender: '+8610690000', body: raw }) === true, 'official etc with country code accepted')
assert(shouldSaveSms({ sender: '13800138000', body: raw }) === false, 'private phone rejected')
assert(shouldSaveSms({ sender: '10690000', body: 'code123456' }) === false, 'missing keyword rejected')
assert(shouldSaveSms({ sender: '95588', body: raw }, { senderPrefix: '955', keywords: ['ETC'] }) === true, 'custom prefix accepted')

Date.now = () => new Date(2025, 10, 30, 8, 0, 0).getTime()
saveEtcSms({ sender: '10690000', body: raw, receivedAt: Date.now() })
assert(writes.has('etc_sms_record_dates'), 'date index key')
assert(writes.has('etc_sms_records:2025-11-30'), 'day key')
assert(getEtcSmsRecords().length === 1, 'records length')
assert(getEtcSmsRecords()[0].rawText === raw, 'rawText')

saveEtcSms({ sender: '10690000', body: raw, receivedAt: Date.now() })
assert(getEtcSmsRecords().length === 1, 'dedupe same sms')

Date.now = () => new Date(2025, 11, 1, 8, 0, 0).getTime()
saveEtcSms({ sender: '10690000', body: 'ETC\u7b7e\u7ea6\u6210\u529f', receivedAt: Date.now() })
Date.now = () => new Date(2025, 10, 29, 8, 0, 0).getTime()
saveEtcSms({ sender: '10690000', body: 'ETC\u8001\u8bb0\u5f55', receivedAt: Date.now() })

assert(getEtcSmsRecords().length === 3, 'all etc stored')
assert(getEtcSmsRecords('2025\u5e7411\u670830\u65e5').length === 2, 'filter chinese date')
assert(getEtcSmsRecords('2025-11-30').length === 2, 'filter dashed date')
assert(getEtcSmsRecords('2025-1-3').length === 3, 'filter dashed date without zero')
assert(normalizeDateKey('2025\u5e741\u67083\u65e5') === '2025-01-03', 'normalize chinese date')
assert(saveEtcSms({ sender: '10086', body: 'code123456', receivedAt: Date.now() }) === null, 'skip non-etc save')
assert(saveEtcSms({ sender: '13800138000', body: 'ETC fake', receivedAt: Date.now() }) === null, 'skip private phone etc')
assert(getEtcSmsRecords().length === 3, 'non-etc not stored')
assert(saveEtcSms({ sender: '95588', body: 'PASS notice', receivedAt: Date.now() }, { senderPrefix: '955', keywords: ['PASS'] }).rawText === 'PASS notice', 'custom keyword stored')
assert(getEtcSmsRecords().length === 4, 'custom keyword record stored')
writes.clear()
registered = false
assert(simulateSmsReceived({ sender: '10690000', body: 'ETC mock' }) === null, 'mock needs active listener')
registered = true
assert(simulateSmsReceived({ sender: '13800138000', body: 'ETC fake' }) === null, 'mock private phone rejected')
assert(simulateSmsReceived({ sender: '10690000', body: 'ETC mock' }).rawText === 'ETC mock', 'mock official etc accepted')
assert(writes.has('event:sms:received'), 'mock emits sms event')
console.log('ETC store check passed')
'@

$tempCheck = "$PSScriptRoot\.etc-sms-check.mjs"
try {
	[System.IO.File]::WriteAllText($tempCheck, ($storeSource + "`n" + $listenerSource + "`n" + $check), [System.Text.UTF8Encoding]::new($false))
	node $tempCheck
	if ($LASTEXITCODE -ne 0) {
		throw "ETC store check failed"
	}
} finally {
	if (Test-Path -LiteralPath $tempCheck) {
		Remove-Item -LiteralPath $tempCheck
	}
}
