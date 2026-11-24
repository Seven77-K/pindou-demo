<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div>
            <h4>品牌购买分析</h4>
            <p class="header-sub">品牌对比次数与金额，并看每个牌子分别在哪几个月买过</p>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <section class="chart-block">
            <div class="chart-head">
              <div>
                <h5>品牌对比</h5>
                <p>柱状图为购买次数，折线为金额；会回购在前、否回购在后</p>
              </div>
              <div class="mini-stats">
                <span>品牌 {{ comboData.categories.length }}</span>
                <span>共 {{ totalCount }} 次</span>
                <span>{{ formatCostAmount(totalAmount) }}</span>
              </div>
            </div>
            <div class="chart-wrap">
              <BaseEchart :option="comboOption" class="chart" />
            </div>
          </section>

          <section class="chart-block">
            <div class="chart-head">
              <div>
                <h5>各品牌购买月份</h5>
                <p>甘特图按购买月份连成区间；点击色块查看该阶段购买明细</p>
              </div>
              <div class="mini-stats">
                <span>{{ monthMatrix.brandCount }} 个品牌</span>
                <span>{{ monthMatrix.monthCount }} 个月</span>
              </div>
            </div>
            <div class="chart-wrap">
              <BaseEchart
                :option="monthGanttOption"
                :chart-events="ganttChartEvents"
                class="chart"
              />
            </div>
          </section>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-primary" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>

  <BrandPurchaseHistoryDialog
    v-model:visible="segmentVisible"
    :brand="segmentBrand"
    :period-label="segmentPeriodLabel"
    :purchases="segmentPurchases"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import BaseEchart from '@/components/charts/BaseEchart.vue'
import {
  buildBrandComboChartData,
  buildBrandMonthPurchaseMatrix,
  listBeadBrandPurchases,
  useBrandReviews,
} from '@/composables/useBrandReviews'
import { formatCostAmount, useCostData } from '@/composables/useCostData'
import BrandPurchaseHistoryDialog from '@/view/cost/review/components/BrandPurchaseHistoryDialog.vue'
import {
  getBrandComboChartOption,
  getBrandMonthGanttChartOption,
} from '@/view/cost/review/utils/brandReviewChartOptions'

const props = defineProps({
  visible: { type: Boolean, default: false },
  brandStats: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible'])

const { linkedExpenses } = useCostData()
const { noRepurchaseBrandSet } = useBrandReviews()

const comboData = computed(() =>
  buildBrandComboChartData(props.brandStats, {
    noRepurchaseBrands: noRepurchaseBrandSet.value,
  }),
)
const monthMatrix = computed(() =>
  buildBrandMonthPurchaseMatrix(linkedExpenses.value, {
    noRepurchaseBrands: noRepurchaseBrandSet.value,
  }),
)

const totalCount = computed(() =>
  comboData.value.counts.reduce((sum, n) => sum + (Number(n) || 0), 0),
)
const totalAmount = computed(() =>
  comboData.value.amounts.reduce((sum, n) => sum + (Number(n) || 0), 0),
)

const comboOption = computed(() => getBrandComboChartOption(comboData.value))
const monthGanttOption = computed(() => getBrandMonthGanttChartOption(monthMatrix.value))

const segmentVisible = ref(false)
const segmentBrand = ref('')
const segmentPeriodLabel = ref('')
const segmentPurchases = ref([])

const openSegmentPurchases = (params) => {
  const raw = Array.isArray(params?.value)
    ? params.value
    : Array.isArray(params?.data?.value)
      ? params.data.value
      : params?.data
  if (!Array.isArray(raw) || raw.length < 3) return

  const brandIndex = Number(raw[0])
  const startIndex = Number(raw[1])
  const endExclusive = Number(raw[2])
  const brands = monthMatrix.value.brands || []
  const months = monthMatrix.value.months || []
  const labels = monthMatrix.value.monthLabels || []
  const brand = brands[brandIndex]
  if (!brand || startIndex < 0 || endExclusive <= startIndex) return

  const monthStart = months[startIndex]
  const monthEnd = months[Math.max(endExclusive - 1, startIndex)]
  const startLabel = labels[startIndex] || monthStart
  const endLabel = labels[Math.max(endExclusive - 1, startIndex)] || monthEnd

  segmentBrand.value = brand
  segmentPeriodLabel.value =
    startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`
  segmentPurchases.value = listBeadBrandPurchases(linkedExpenses.value, brand, {
    monthStart,
    monthEnd,
  })
  segmentVisible.value = true
}

const ganttChartEvents = {
  click: openSegmentPurchases,
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
  padding: 16px 20px;
  background: rgba(36, 24, 32, 0.5);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(1180px, 92vw);
  height: min(88vh, 900px);
  overflow: hidden;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 56px rgba(82, 64, 74, 0.2);
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 22px 12px;
  border-bottom: 1px solid #f0e8ec;
}

.dialog-header h4 {
  margin: 0;
  color: #3d2f36;
  font-size: 17px;
  font-weight: 650;
}

.header-sub {
  margin: 4px 0 0;
  color: #9a8790;
  font-size: 12px;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #f6f0f3;
  color: #6e5660;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.dialog-close:hover {
  background: #efe4e9;
  color: #3d2f36;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: 0.95fr 1.15fr;
  gap: 14px;
  padding: 14px 22px;
  overflow: hidden;
}

.chart-block {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.chart-head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.chart-head h5 {
  margin: 0;
  color: #3d2f36;
  font-size: 14px;
  font-weight: 650;
}

.chart-head p {
  margin: 2px 0 0;
  color: #9a8790;
  font-size: 12px;
}

.mini-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.mini-stats span {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #fdf5f8;
  color: #a83858;
  font-size: 12px;
  font-weight: 600;
}

.chart-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chart {
  width: 100%;
  height: 100%;
  background: transparent;
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 10px 22px 14px;
  border-top: 1px solid #f0e8ec;
}

.btn-primary {
  height: 34px;
  padding: 0 18px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #f2a0b0, #e07890);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary:hover {
  filter: brightness(0.98);
}

@media (max-width: 900px) {
  .dialog-body {
    grid-template-rows: none;
    overflow: auto;
  }

  .chart-wrap {
    height: 320px;
  }
}
</style>
