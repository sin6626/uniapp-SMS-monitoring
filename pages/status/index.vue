<template>
	<view class="content">
		<view class="header">
			<text class="title">监听状态</text>
			<text :class="['badge', listening ? 'badge-on' : '']">{{ listening ? '监听中' : '未监听' }}</text>
		</view>

		<view class="meta">
			<text>权限：{{ permissionText }}</text>
			<text>平台：{{ platformText }}</text>
			<text>短信条数：{{ count }}</text>
		</view>

		<view class="actions">
			<button class="primary" :disabled="listening" @click="startListening">开始监听</button>
			<button class="secondary" :disabled="!listening" @click="stopListening">停止监听</button>
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
	const permissionText = ref('未申请')
	const platformText = ref('非 Android App')
	const count = ref(0)

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
		permissionText.value = state.permissionText
		platformText.value = state.platformText
		count.value = state.messages.length
	}
</script>

<style>
	.content {
		min-height: 100vh;
		padding: 32rpx;
		background: #f6f7fb;
		box-sizing: border-box;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 28rpx;
	}

	.title {
		color: #111827;
		font-size: 44rpx;
		font-weight: 700;
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
</style>
