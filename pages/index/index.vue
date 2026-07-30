<template>
	<view class="content">
		<view class="panel">
			<view class="header">
				<text class="title">ETC短信监听</text>
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

			<view v-if="isDev" class="mock-box">
				<input
					:value="mockSender"
					class="mock-input"
					type="text"
					maxlength="-1"
					placeholder="模拟发送方，例如 10690000"
					@input="onMockSenderInput"
				/>
				<textarea
					:value="mockBody"
					class="mock-textarea"
					placeholder="模拟短信内容，需包含 ETC"
					@input="onMockBodyInput"
				/>
				<button class="secondary" @click="sendMockSms">模拟收到短信</button>
			</view>

			<view class="logs">
				<view v-if="!logs.length" class="empty">暂无 ETC 短信</view>
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
	import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
	import {
		getListeningContent,
		simulateSmsReceived,
		startListening as startSmsListening,
		stopListening as stopSmsListening
	} from '@/utils/smsListener.js'

	const isDev = process.env.NODE_ENV === 'development'
	const listening = ref(false)
	const logs = ref([])
	const permissionText = ref('未申请')
	const platformText = ref('非 Android App')
	const mockSender = ref('10690000')
	const mockBody = ref('尊敬的ETC客户：您好！ETC测试短信')

	onLoad(() => {
		syncState()
		uni.$on('sms:received', syncState)
	})

	onShow(() => {
		syncState()
	})

	onUnload(() => {
		uni.$off('sms:received', syncState)
	})

	async function startListening() {
		const result = await startSmsListening()
		syncState()
		if (!result.ok) {
			uni.showToast({ title: '监听未开启', icon: 'none' })
		}
	}

	function stopListening() {
		stopSmsListening()
		syncState()
	}

	function sendMockSms() {
		if (!getListeningContent().listening) {
			uni.showToast({ title: '未监听，模拟短信未接收', icon: 'none' })
			syncState()
			return
		}

		const record = simulateSmsReceived({
			sender: mockSender.value,
			body: mockBody.value
		})

		if (!record) {
			uni.showToast({ title: '未命中过滤规则', icon: 'none' })
		}
		syncState()
	}

	function onMockSenderInput(event) {
		mockSender.value = event.detail.value
	}

	function onMockBodyInput(event) {
		mockBody.value = event.detail.value
	}

	function syncState() {
		const state = getListeningContent()
		listening.value = state.listening
		logs.value = state.messages
		permissionText.value = state.permissionText
		platformText.value = state.platformText
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

	.mock-box {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		margin-bottom: 32rpx;
	}

	.mock-input,
	.mock-textarea {
		width: 100%;
		padding: 20rpx 24rpx;
		border: 1rpx solid #d1d5db;
		border-radius: 8rpx;
		background: #ffffff;
		box-sizing: border-box;
		color: #111827;
		font-size: 28rpx;
	}

	.mock-input {
		height: 84rpx;
		line-height: 84rpx;
	}

	.mock-textarea {
		height: 180rpx;
		line-height: 1.45;
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
