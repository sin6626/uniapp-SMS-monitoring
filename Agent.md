# SMS-monitoring Agent Notes

## 项目目标

这是一个 uni-app 模拟项目，当前核心目标是验证 Android App 端监听系统短信广播，并在收到短信后触发页面内操作。

## 当前实现策略

- 仅在 `APP-PLUS` Android 环境运行短信监听逻辑。
- 使用 `plus.android` 动态注册 `android.provider.Telephony.SMS_RECEIVED` 广播。
- 通过 `android.provider.Telephony$Sms$Intents.getMessagesFromIntent(intent)` 解析短信。
- 当前版本用于前台或进程存活时验证；如果要 App 被杀后仍监听，需要改为 Android 原生插件或静态 Receiver。

## 项目规则

- 使用 git 做版本控制，提交信息使用 Conventional Commits，描述使用中文。
- 禁止批量删除文件或目录。
- 临时文件只放在当前项目目录内。
