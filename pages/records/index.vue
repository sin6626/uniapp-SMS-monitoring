<template>
	<view class="content">
		<view class="header">
			<text class="title">短信记录</text>
			<text :class="['badge', listening ? 'badge-on' : '']">{{ listening ? '监听中' : '未监听' }}</text>
		</view>

		<view class="logs">
			<view v-if="!logs.length" class="empty">暂无短信</view>
			<view v-for="item in logs" :key="item.id" class="log-item">
				<view class="log-head">
					<text class="sender">{{ item.sender || '未知号码' }}</text>
					<text class="time">{{ item.time }}</text>
				</view>
				<text class="body">{{ item.body }}</text>
			</view>
		</view>
	</view>
</template>

<script setup>
	import { ref } from 'vue'
	import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
	import { getListeningContent } from '@/utils/smsListener.js'

	const listening = ref(false)
	const logs = ref([])

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

	function syncState() {
		const state = getListeningContent()
		listening.value = state.listening
		logs.value = state.messages
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
