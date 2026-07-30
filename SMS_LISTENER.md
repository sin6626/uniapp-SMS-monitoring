# Android 短信监听实现说明

## 目标

本项目是 uni-app Vue3 模拟项目，目标是在 Android App 端监听系统收到的短信，并在收到短信后执行页面或业务逻辑。

## 实现位置

- 工具方法：`utils/smsListener.js`
- Demo 页面：`pages/index/index.vue`
- 测试页面：`pages/records/index.vue`、`pages/status/index.vue`
- 普通页面测试链路：`pages/probe-a/index.vue` -> `pages/probe-b/index.vue` -> `pages/probe-c/index.vue`
- Android 权限：`manifest.json`

## 暴露方法

`utils/smsListener.js` 业务侧主要使用三个方法：

- `startListening(options)`：申请短信权限，并开始注册短信广播监听。
- `stopListening()`：注销短信广播监听。
- `getListeningContent()`：获取当前监听状态、权限状态、平台信息和最近收到的短信列表。

另有一个开发调试方法 `simulateSmsReceived()`，Demo 页面在开发环境用它模拟收到短信，方便不用真实 106 通道也能测试过滤和缓存；它要求先开启监听。

## 实现流程

1. `manifest.json` 中声明 `android.permission.RECEIVE_SMS`。
2. Demo 页面点击“开始监听”后调用 `startListening()`。
3. `startListening()` 只在 `APP-PLUS` 且 Android 平台继续执行。
4. 通过 `plus.android.requestPermissions` 动态申请 `android.permission.RECEIVE_SMS`。
5. 权限通过后，使用 `plus.android` 创建 `android.content.IntentFilter`。
6. 给 `IntentFilter` 添加 `android.provider.Telephony.SMS_RECEIVED` action。
7. 使用 `plus.android.implements` 创建 `BroadcastReceiver`。
8. 收到短信广播后，通过 `android.provider.Telephony$Sms$Intents.getMessagesFromIntent(intent)` 解析短信。
9. 默认只处理发送方 `106` 开头且正文包含 `ETC` 的短信；普通 11 位手机号发来的 ETC 短信会被忽略。
10. 通过 `startListening({ senderPrefix, senderPrefixes, keywords })` 可调整发送方前缀和关键词规则；多个关键词需要全部命中。
11. 命中规则的 ETC 短信保存原文，不命中规则的短信直接忽略，不入内存、不写缓存、不触发事件。
12. 保存后触发 `uni.$emit('sms:received', sms)` 与 `uni.$emit('etc-sms:received', record)`。
13. Demo 页面监听事件后调用 `getListeningContent()` 刷新展示。

开发环境下，Demo 页面会显示模拟短信输入区。先点击“开始监听”，再自定义发送方和短信内容，点击“模拟收到短信”会调用 `simulateSmsReceived()`，后续仍走同一套发送方前缀、关键词、本地缓存和页面事件逻辑。

雷电模拟器不支持标准 `adb emu sms send` 时，开发环境也可以先开启监听，再用 adb 发送测试广播：

```powershell
& 'D:\moniqi\leidian\LDPlayer9\adb.exe' -s 127.0.0.1:5555 shell am broadcast -a uniapp.smsmonitoring.MOCK_SMS -p io.dcloud.HBuilder --es sender 10690000 --es body "尊敬的ETC客户：您好！ETC测试短信"
```

切换到底部 tabBar 的“记录”或“状态”页面后，页面同样读取 `getListeningContent()`，用于验证离开监听页后是否还能收到短信。

也可以从“状态”tab 进入普通测试页 A，再继续进入 B、C。普通页面只监听 `sms:received` 事件并读取 `getListeningContent()`，不会调用 `stopListening()`，用于验证 `navigateTo` 页面栈变化时短信监听是否还在。

## 后台监听说明

当前实现使用 `plus.android.runtimeMainActivity()` 注册动态广播，但不把监听生命周期绑死在 Demo 页面上。

因此，只要 App 进程仍然存活，即使 App 切到后台，也可以继续收到短信广播。Demo 页面卸载时只移除页面事件监听，不会自动停止短信监听；只有点击“停止监听”或调用 `stopListening()` 才会注销广播。

这个实现没有做后台常驻服务、前台服务、静态 Receiver 或原生插件。如果 Android 系统因为内存、电池策略、厂商后台限制等原因杀掉 App 进程，纯 JS 动态广播无法继续保证收到短信。要做到进程被杀后仍能收到，需要改成原生 Android 静态广播接收器或原生插件。

## 收到短信后的业务入口

当前收到短信后的处理规则：

- 默认不处理非 `106` 开头的短信。
- 不包含 `ETC` 的短信直接忽略。
- 发送方和关键词都命中的短信写入本地缓存，原文保存在 `rawText`。
- 同时触发 `uni.$emit('sms:received', sms)` 和 `uni.$emit('etc-sms:received', record)`。

后续如果要做转发接口、关键词匹配、自动弹窗或本地存储，优先接 `sms:received` 事件，或者定时调用 `getListeningContent()` 读取短信列表。

## ETC 短信缓存

ETC 短信逻辑在 `utils/etcSmsStore.js`。

当前默认只有发送方 `106` 开头且正文包含 `ETC` 的短信会保存。类似“车辆（****9R0）于2025年11月30日在湖南灌溪站驶入，至湖南长沙西站驶出，共计消费71.85元”的短信会保存完整原文，后端可按原文继续解析。

缓存使用 uni-app 本地存储，不使用 Pinia。当前缓存按收到短信日期分桶：

- `etc_sms_record_dates` 保存日期索引，如 `['2025-12-01', '2025-11-30']`。
- `etc_sms_records:2025-11-30` 保存当天收到的 ETC 短信数组。

单条记录包含 `id`、`receivedAt`、`smsSender`、`rawText`。后端可以直接解析 `rawText`。

给后端同步某个日期之后的数据时，按短信收到时间 `receivedAt` 筛选：

```js
const state = getListeningContent('2025年11月30日')
const data = state.etcRecords
```

这里的 `2025年11月30日` 会按当天 `00:00:00` 及之后计算；如果短信原文里没有通行日期，也不影响筛选。

“记录”tab 顶部提供了日期输入框，可直接输入 `2025年11月30日` 或 `2025-11-30` 测试这个筛选逻辑。

更详细的工具使用说明见根目录 `ETC_SMS_UTILS_USAGE.md`。

解析逻辑可运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/check-etc-sms-parser.ps1` 做快速检查。
