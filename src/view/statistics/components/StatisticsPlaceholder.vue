<template>
  <el-card shadow="never" class="statistics-chart-card statistics-placeholder-card">
    <h3>{{ title }}</h3>
    <p class="statistics-placeholder-text">{{ text }}</p>
  </el-card>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    default: '暂无内容',
  },
})
</script>

<style scoped src="../statistics-charts.css"></style>
