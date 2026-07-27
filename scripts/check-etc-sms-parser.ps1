$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$source = [System.IO.File]::ReadAllText("$projectRoot\utils\etcSmsStore.js", [System.Text.UTF8Encoding]::new($false))
$source = $source -replace "export function ", "function "

$check = @'
const writes = new Map()
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
globalThis.uni = {
  getStorageSync(key) { return writes.get(key) || '' },
  setStorageSync(key, value) { writes.set(key, value) },
  removeStorageSync(key) { writes.delete(key) }
}

const raw = '\u5c0a\u656c\u7684ETC\u5ba2\u6237\uff1a\u60a8\u597d\uff01\u60a8\u7684\u8f66\u8f86\uff08****9R0\uff09\u4e8e2025\u5e7411\u670830\u65e5\u5728\u6e56\u5357\u704c\u6eaa\u7ad9\u9a76\u5165\uff0c\u81f3\u6e56\u5357\u957f\u6c99\u897f\u7ad9\u9a76\u51fa\uff0c\u5171\u8ba1\u6d88\u8d3971.85\u5143\u3002\u5982\u60a8\u6709\u4efb\u4f55\u7591\u95ee\u53ef\u901a\u8fc7\u201c\u6e56\u5357\u9ad8\u901fETC\u201d\u5fae\u4fe1\u516c\u4f17\u53f7\u3001\u201c\u6e56\u5357ETC\u52a9\u624b\u201d\u5fae\u4fe1\u5c0f\u7a0b\u5e8f\u3001\u201c\u6e56\u5357\u9ad8\u901f\u901a\u201dAPP\u300124\u5c0f\u65f6\u5ba2\u670d\u70ed\u7ebf\uff1a12328\u548c0731-96528\u8fdb\u884c\u54a8\u8be2\u548c\u6295\u8bc9\uff0c\u6211\u4eec\u5c06\u7aed\u8bda\u4e3a\u60a8\u670d\u52a1\u3002\u3010\u5de5\u5546\u94f6\u884c\u3011'
const parsed = parseEtcSms(raw)
assert(parsed.plateNo === '****9R0', 'plateNo')
assert(parsed.passDateText === '2025\u5e7411\u670830\u65e5', 'passDateText')
assert(parsed.entryStation === '\u6e56\u5357\u704c\u6eaa\u7ad9', 'entryStation')
assert(parsed.exitStation === '\u6e56\u5357\u957f\u6c99\u897f\u7ad9', 'exitStation')
assert(parsed.amount === 71.85, 'amount')
assert(parsed.sender === '\u5de5\u5546\u94f6\u884c', 'sender')
assert(parsed.parsed === true, 'parsed true')

Date.now = () => new Date(2025, 10, 30, 8, 0, 0).getTime()
saveEtcSms({ sender: '95588', body: raw, time: '10:00:00' })
const records = getEtcSmsRecords()
assert(records.length === 1, 'records length')
assert(records[0].rawText === raw, 'rawText')
assert(parseEtcSms('code123456') === null, 'ignore non-etc')
assert(saveEtcSms({ sender: '10086', body: 'code123456', time: '10:01:00' }) === null, 'skip non-etc save')
assert(getEtcSmsRecords().length === 1, 'non-etc not stored')
Date.now = () => new Date(2025, 11, 1, 8, 0, 0).getTime()
const rawEtc = saveEtcSms({ sender: '95588', body: 'ETC\u7b7e\u7ea6\u6210\u529f', time: '10:02:00' })
assert(rawEtc.parsed === false, 'raw etc saved')
assert(rawEtc.rawText === 'ETC\u7b7e\u7ea6\u6210\u529f', 'raw etc text')
assert(getEtcSmsRecords().length === 2, 'raw etc stored')
Date.now = () => new Date(2025, 10, 29, 8, 0, 0).getTime()
saveEtcSms({ sender: '95588', body: 'ETC\u8001\u8bb0\u5f55', time: '10:03:00' })
assert(getEtcSmsRecords().length === 3, 'old etc stored')
assert(getEtcSmsRecords('2025\u5e7411\u670830\u65e5').length === 2, 'filter receivedAt from date')
console.log('ETC parser check passed')
'@

$tempCheck = "$PSScriptRoot\.etc-sms-check.mjs"
try {
	[System.IO.File]::WriteAllText($tempCheck, ($source + "`n" + $check), [System.Text.UTF8Encoding]::new($false))
	node $tempCheck
	if ($LASTEXITCODE -ne 0) {
		throw "ETC parser check failed"
	}
} finally {
	if (Test-Path -LiteralPath $tempCheck) {
		Remove-Item -LiteralPath $tempCheck
	}
}
