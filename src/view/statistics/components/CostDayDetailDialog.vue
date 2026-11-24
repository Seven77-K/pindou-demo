<template>
  <Teleport v-if="visible" to="body">
    <div class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>{{ title }}</h4>
            <p class="header-sub">共 {{ rows.length }} 条花费记录</p>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div class="stats-row">
            <span class="stat-pill stat-total">合计 {{ formatCostAmount(total) }}</span>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-index">序号</th>
                  <th v-if="showDate" class="col-date">日期</th>
                  <th>项目类别</th>
                  <th>规格</th>
                  <th>品牌</th>
                  <th>购买渠道</th>
                  <th class="col-amount">金额</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!rows.length">
                  <td :colspan="showDate ? 8 : 7" class="empty-cell">{{ emptyText }}</td>
                </tr>
                <tr v-for="(row, index) in rows" :key="row.id || index">
                  <td class="col-index">{{ index + 1 }}</td>
                  <td v-if="showDate" class="col-date">{{ row.date || '—' }}</td>
                  <td>{{ displayCostChartCategory(row.category) }}</td>
                  <td>{{ row.spec || '—' }}</td>
                  <td>{{ row.brand || '—' }}</td>
                  <td>{{ row.channel || '—' }}</td>
                  <td class="col-amount">{{ formatCostAmount(row.amount) }}</td>
                  <td class="col-note">{{ displayDetailNote(row) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-cancel" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { displayCostChartCategory, formatCostAmount } from '@/composables/useCostData'

defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '当日花费明细' },
  rows: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  showDate: { type: Boolean, default: false },
  emptyText: { type: String, default: '该日暂无花费记录' },
})

const emit = defineEmits(['update:visible'])

/** 补充装色号备注不在明细列表展示 */
const displayDetailNote = (row) => {
  if (String(row?.spec || '').trim() === '补充装' || row?.refillItems?.length) {
    return '—'
  }
  const note = String(row?.note || '').trim()
  return note || '—'
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(36, 24, 32, 0.42);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(860px, 100%);
  max-height: min(88vh, 720px);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(82, 64, 74, 0.18);
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 12px;
}

.header-text h4 {
  margin: 0;
  color: #3d2f38;
  font-size: 18px;
  font-weight: 600;
}

.header-sub {
  margin: 6px 0 0;
  color: #9a8a92;
  font-size: 12px;
}

.dialog-close {
  border: none;
  background: transparent;
  color: #9a8a92;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  padding: 0 24px 16px;
  overflow: auto;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f8f0f4;
  color: #6e5660;
  font-size: 12px;
}

.stat-total {
  background: #eef8f6;
  color: #0d9488;
  font-weight: 600;
}

.table-wrap {
  overflow: auto;
  border: 1px solid #f0e4ea;
  border-radius: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f5eef2;
  color: #52404a;
  font-size: 13px;
  text-align: left;
  word-break: break-word;
}

.data-table th {
  position: sticky;
  top: 0;
  background: #faf5f7;
  color: #6e5660;
  font-weight: 600;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.col-index {
  width: 56px;
}

.col-date {
  width: 110px;
  font-variant-numeric: tabular-nums;
}

.col-amount {
  width: 100px;
  font-variant-numeric: tabular-nums;
}

.col-note {
  color: #6e5660;
}

.empty-cell {
  padding: 36px 12px !important;
  color: #9a8a92;
  text-align: center !important;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px 20px;
}

.btn-cancel {
  min-width: 88px;
  padding: 8px 16px;
  border: 1px solid #eadde4;
  border-radius: 8px;
  background: #fff;
  color: #6e5660;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #faf5f7;
}
</style>
