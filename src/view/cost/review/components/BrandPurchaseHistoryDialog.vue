<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div>
            <h4>{{ brand || '品牌' }} · 购买记录</h4>
            <p class="header-sub">
              <template v-if="periodLabel">{{ periodLabel }} · </template>
              共 {{ purchases.length }} 次 · {{ formatCostAmount(totalAmount) }}
            </p>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div v-if="purchases.length" class="table-scroll">
            <table class="purchase-table">
              <thead>
                <tr>
                  <th class="col-idx">序号</th>
                  <th class="col-date">购买日期</th>
                  <th class="col-pack">类别</th>
                  <th class="col-channel">购买渠道</th>
                  <th class="col-amount">金额</th>
                  <th class="col-note">备注</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in purchases" :key="row.id || `${row.date}-${index}`">
                  <td>{{ index + 1 }}</td>
                  <td>{{ row.date || '—' }}</td>
                  <td>
                    <span
                      v-if="row.packType"
                      class="pack-tag"
                      :class="{ full: row.packType === '全套', refill: row.packType === '补充装' }"
                    >
                      {{ row.packTypeLabel }}
                    </span>
                    <span v-else class="muted">{{ row.packTypeLabel }}</span>
                  </td>
                  <td>{{ row.channel || '—' }}</td>
                  <td class="amount-cell">{{ formatCostAmount(row.amount) }}</td>
                  <td class="note-cell" :title="row.note || ''">{{ row.note || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-tip">暂无购买记录</p>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-primary" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { formatCostAmount } from '@/composables/useCostData'

const props = defineProps({
  visible: { type: Boolean, default: false },
  brand: { type: String, default: '' },
  periodLabel: { type: String, default: '' },
  purchases: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible'])

const totalAmount = computed(() =>
  props.purchases.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
)

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(40, 24, 32, 0.45);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(720px, 92vw);
  max-height: min(78vh, 640px);
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h4 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 17px;
  font-weight: 700;
}

.header-sub {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.dialog-close:hover {
  background: var(--color-pale);
  color: var(--color-text-primary);
}

.dialog-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
}

.table-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.purchase-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.purchase-table th,
.purchase-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 13px;
  text-align: left;
  vertical-align: middle;
  background: #fff;
}

.purchase-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-pale);
  color: var(--color-text-secondary);
  font-weight: 600;
  box-shadow: 0 1px 0 var(--color-border);
}

.purchase-table tbody tr:last-child td {
  border-bottom: none;
}

.col-idx { width: 52px; }
.col-date { width: 110px; }
.col-pack { width: 88px; }
.col-channel { width: 120px; }
.col-amount { width: 96px; }
.col-note { width: auto; }

.amount-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.note-cell {
  color: var(--color-text-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.muted {
  color: var(--color-text-secondary);
}

.pack-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f3eef1;
  color: #6e5660;
  font-size: 12px;
  font-weight: 600;
}

.pack-tag.full {
  background: #fdeef3;
  color: #a83858;
}

.pack-tag.refill {
  background: #eef5f1;
  color: #3d8f66;
}

.empty-tip {
  margin: 28px 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: center;
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--color-border);
}

.btn-primary {
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--color-accent-deep);
}
</style>
