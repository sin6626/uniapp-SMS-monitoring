# SMS-monitoring Agent Notes

## 项目目标

这是一个 uni-app 模拟项目，当前核心目标是验证 Android App 端监听系统短信广播，并在收到短信后触发页面内操作。

## 当前实现策略

- 仅在 `APP-PLUS` Android 环境运行短信监听逻辑。
- 页面代码使用 Vue3 `<script setup>` 写法。
- 短信监听逻辑封装在 `utils/smsListener.js`，业务侧主要使用 `startListening`、`stopListening`、`getListeningContent`。
- 使用 `plus.android.runtimeMainActivity()` 动态注册 `android.provider.Telephony.SMS_RECEIVED` 广播；页面卸载不自动停止监听，保证 App 进程存活时切后台仍可监听。
- 通过 `android.provider.Telephony$Sms$Intents.getMessagesFromIntent(intent)` 解析短信。
- 当前版本用于前台或进程存活时验证；如果要 App 被杀后仍监听，需要改为 Android 原生插件或静态 Receiver。
- 根目录 `SMS_LISTENER.md` 记录了实现流程和后台监听边界。
- 当前有三个 tabBar 页面：`pages/index/index` 负责启动监听，`pages/records/index` 展示短信记录，`pages/status/index` 展示监听状态并可开始/停止监听。
- 当前还有三个普通测试页面：`pages/probe-a/index`、`pages/probe-b/index`、`pages/probe-c/index`，用于验证离开 tabBar 页面后的监听状态。
- 当前默认只处理发送方 `106` 开头且正文包含 `ETC` 的短信；`startListening({ senderPrefix, senderPrefixes, keywords })` 可配置前缀和关键词。普通 11 位手机号发来的 ETC 短信会被忽略。
- ETC 短信缓存逻辑在 `utils/etcSmsStore.js`，使用日期索引 `etc_sms_record_dates` 加日期分桶 `etc_sms_records:YYYY-MM-DD`，value 保存当天 ETC 原文记录数组。
- `getListeningContent('2025年11月30日')` / `getListeningContent('2025-11-30')` 会按短信收到时间 `receivedAt` 返回当天及之后的 ETC 缓存记录，方便同步给后端。
- `pages/records/index` 顶部有日期输入框，用于测试 `getListeningContent(date)` 的筛选结果。
- `pages/index/index` 在开发环境显示模拟短信输入区；需要先开始监听，再调用 `simulateSmsReceived()` 测试发送方、正文过滤和缓存展示。
- 雷电模拟器不支持 `adb emu sms send` 时，开发环境注册 `uniapp.smsmonitoring.MOCK_SMS` 测试广播；先开始监听，再用 adb broadcast 传 `sender` 和 `body`。
- 根目录 `ETC_SMS_UTILS_USAGE.md` 是给同事看的工具使用说明。
- ETC 解析检查脚本：`scripts/check-etc-sms-parser.ps1`。

## 项目规则

- 使用 git 做版本控制，提交信息使用 Conventional Commits，描述使用中文。
- 禁止批量删除文件或目录。
- 临时文件只放在当前项目目录内。
