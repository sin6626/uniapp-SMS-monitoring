<template>
	<view class="content">
		<text class="title">普通页面 B</text>
		<text :class="['badge', listening ? 'badge-on' : '']">{{ listening ? '监听中' : '未监听' }}</text>
		<text class="meta">ETC短信条数：{{ count }}</text>
		<text class="body">最新ETC短信：{{ latest }}</text>
		<button class="primary" @click="goNext">进入普通页面 C</button>
		<button class="secondary" @click="goBack">返回上一页</button>
	</view>
</template>

<script setup>
	import { ref } from 'vue'
	import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
	import { getListeningContent } from '@/utils/smsListener.js'

	const listening = ref(false)
	const count = ref(0)
	const latest = ref('暂无')

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
		count.value = state.messages.length
		latest.value = state.messages[0]?.body || '暂无'
	}

	function goNext() {
		uni.navigateTo({ url: '/pages/probe-c/index' })
	}

	function goBack() {
		uni.navigateBack()
	}
</script>

<style>
	.content {
		display: flex;
		min-height: 100vh;
		padding: 32rpx;
		flex-direction: column;
		gap: 20rpx;
		background: #f6f7fb;
		box-sizing: border-box;
	}

	.title {
		color: #111827;
		font-size: 44rpx;
		font-weight: 700;
	}

	.badge,
	.meta,
	.body {
		padding: 20rpx;
		border-radius: 8rpx;
		background: #ffffff;
		color: #374151;
		font-size: 28rpx;
		word-break: break-all;
	}

	.badge-on {
		background: #d1fae5;
		color: #047857;
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
