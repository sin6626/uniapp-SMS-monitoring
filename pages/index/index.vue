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
		startListening as startSmsListening,
		stopListening as stopSmsListening
	} from '@/utils/smsListener.js'

	const listening = ref(false)
	const logs = ref([])
	const permissionText = ref('未申请')
	const platformText = ref('非 Android App')

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
		await startSmsListening()
		syncState()
	}

	function stopListening() {
		stopSmsListening()
		syncState()
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
