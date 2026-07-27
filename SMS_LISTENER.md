# Android 短信监听实现说明

## 目标

本项目是 uni-app Vue3 模拟项目，目标是在 Android App 端监听系统收到的短信，并在收到短信后执行页面或业务逻辑。

## 实现位置

- 工具方法：`utils/smsListener.js`
- Demo 页面：`pages/index/index.vue`
- Android 权限：`manifest.json`

## 暴露方法

`utils/smsListener.js` 只对外暴露三个方法：

- `startListening()`：申请短信权限，并开始注册短信广播监听。
- `stopListening()`：注销短信广播监听。
- `getListeningContent()`：获取当前监听状态、权限状态、平台信息和最近收到的短信列表。

## 实现流程

1. `manifest.json` 中声明 `android.permission.RECEIVE_SMS`。
2. Demo 页面点击“开始监听”后调用 `startListening()`。
3. `startListening()` 只在 `APP-PLUS` 且 Android 平台继续执行。
4. 通过 `plus.android.requestPermissions` 动态申请 `android.permission.RECEIVE_SMS`。
5. 权限通过后，使用 `plus.android` 创建 `android.content.IntentFilter`。
6. 给 `IntentFilter` 添加 `android.provider.Telephony.SMS_RECEIVED` action。
7. 使用 `plus.android.implements` 创建 `BroadcastReceiver`。
8. 收到短信广播后，通过 `android.provider.Telephony$Sms$Intents.getMessagesFromIntent(intent)` 解析短信。
9. 将短信内容存入工具模块内存列表，并触发 `uni.$emit('sms:received', sms)`。
10. Demo 页面监听 `sms:received` 事件，然后调用 `getListeningContent()` 刷新展示。

## 后台监听说明

当前实现使用 `ApplicationContext` 注册动态广播，不把监听器绑死在页面实例上。

因此，只要 App 进程仍然存活，即使 App 切到后台，也可以继续收到短信广播。Demo 页面卸载时只移除页面事件监听，不会自动停止短信监听；只有点击“停止监听”或调用 `stopListening()` 才会注销广播。

这个实现没有做后台常驻服务、前台服务、静态 Receiver 或原生插件。如果 Android 系统因为内存、电池策略、厂商后台限制等原因杀掉 App 进程，纯 JS 动态广播无法继续保证收到短信。要做到进程被杀后仍能收到，需要改成原生 Android 静态广播接收器或原生插件。

## 收到短信后的业务入口

当前收到短信后会做两件事：

- 写入 `utils/smsListener.js` 内部的最近 20 条短信列表。
- 触发 `uni.$emit('sms:received', sms)`。

后续如果要做转发接口、关键词匹配、自动弹窗或本地存储，优先接 `sms:received` 事件，或者定时调用 `getListeningContent()` 读取短信列表。
