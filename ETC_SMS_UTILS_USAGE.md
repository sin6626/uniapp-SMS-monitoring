# ETC 短信监听工具使用说明

## 对外方法

业务同事主要使用 `utils/smsListener.js` 暴露的三个方法：

```js
import {
	startListening,
	stopListening,
	getListeningContent
} from '@/utils/smsListener.js'
```

- `startListening()`：申请短信权限并开始监听 Android 短信广播。
- `stopListening()`：停止监听。
- `getListeningContent(date)`：读取本地缓存的 ETC 短信记录，可按收到短信日期筛选。

## 监听规则

App 端仍然会收到系统短信广播，但工具层只处理短信正文里包含 `ETC` 的短信。

- 包含 `ETC`：写入本地缓存，并触发 `sms:received` / `etc-sms:received`。
- 不包含 `ETC`：直接忽略，不写缓存，不触发事件。

## 本地缓存 key

缓存使用 `uni.setStorageSync` / `uni.getStorageSync`。

日期索引 key：

```js
etc_sms_record_dates
```

value 示例：

```js
['2025-12-01', '2025-11-30']
```

每天一份记录 key：

```js
etc_sms_records:2025-11-30
etc_sms_records:2025-12-01
```

日期来自短信收到时间 `receivedAt`，不是短信原文里的通行日期。

## 每天记录 value

`etc_sms_records:2025-11-30` 的 value 是当天收到的 ETC 短信数组：

```js
[
	{
		id: 'etc_xxx',
		receivedAt: 1764460800000,
		smsSender: '95588',
		rawText: '尊敬的ETC客户：您好！...'
	}
]
```

前端只保存后端需要的原文和必要元信息：

- `id`：根据短信发送方和原文生成，用于去重。
- `receivedAt`：收到短信的时间戳。
- `smsSender`：短信发送方号码。
- `rawText`：短信原文，给后端解析。

## 日期筛选

支持这些输入格式：

```js
getListeningContent('2025年11月30日')
getListeningContent('2025-11-30')
getListeningContent('2025年1月3日')
getListeningContent('2025-1-3')
```

内部会统一成：

```js
YYYY-MM-DD
```

例如：

```js
getListeningContent('2025年11月30日')
```

等价于读取日期索引里 `2025-11-30` 及之后的所有日期 key，然后合并这些日期下的记录返回。

## 给后端同步

同步某天及之后的数据：

```js
const { etcRecords } = getListeningContent('2025-11-30')

await uni.request({
	url: '后端接口地址',
	method: 'POST',
	data: {
		records: etcRecords
	}
})
```

如果后端只要原文：

```js
const rawTexts = getListeningContent('2025-11-30').etcRecords.map((item) => item.rawText)
```

## 页面测试

“记录”tab 顶部有日期输入框，可以输入：

```text
2025年11月30日
```

或：

```text
2025-11-30
```

点击“筛选”后，页面会调用 `getListeningContent(date)` 展示筛选结果。

## 注意事项

- 只支持 Android App 端，H5、小程序、iOS 不支持短信监听。
- App 被系统杀进程后，纯 JS 动态广播不能保证继续监听。
- 不要在页面 `onUnload` 里调用 `stopListening()`，否则切页面会停止监听。
- 不包含 `ETC` 的短信不会进入缓存。
