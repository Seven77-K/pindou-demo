<template>
  <div class="page-card">
    <div class="page-header">
      <h3>拼豆图纸</h3>
      <div class="header-actions">
        <button type="button" class="btn-secondary" @click="goToStatistics">
          数据统计
        </button>
        <button type="button" class="btn-secondary" @click="openBatchImport">
          Excel 导入
        </button>
        <button type="button" class="btn-secondary" @click="openBatchImage">
          批量上传图片
        </button>
        <button type="button" class="btn-secondary" @click="openBatchRecognize">
          识图
        </button>
        <button type="button" class="btn-secondary" @click="wheelVisible = true">
          转盘
        </button>
        <button class="btn-primary" @click="openCreate">上传图纸</button>
      </div>
    </div>

    <div class="tab-bar">
      <div class="tab-group tab-group-main">
        <button v-for="tab in tabs" :key="tab.key" class="tab-item"
          :class="{ 'tab-item-active': activeTab === tab.key }" @click="activeTab = tab.key">
          {{ tab.label }}
        </button>
      </div>

      <template v-if="activeTab === 'member'">
        <span class="tab-divider" aria-hidden="true"></span>
        <div class="tab-group tab-group-buyer">
          <span class="tab-group-label">购买人</span>
          <button v-for="buyer in buyerOptions" :key="buyer" class="tab-item tab-item-buyer"
            :class="{ 'tab-item-active': memberBuyerTab === buyer }" @click="memberBuyerTab = buyer">
            {{ buyer }}
          </button>
        </div>
      </template>
    </div>

    <div class="search-bar">
      <div class="search-fields">
        <div class="search-item">
          <label>图纸名称</label>
          <el-input v-model="searchForm.name" class="search-name-input" placeholder="请输入图纸名称" clearable />
        </div>
        <div class="search-item">
          <label>图纸作者</label>
          <FieldCombobox
            v-model="searchForm.author"
            class="search-author-input"
            :options="authorOptions"
            placeholder="全部作者"
          />
        </div>
        <div class="search-item">
          <label>图纸类别</label>
          <select v-model="searchForm.patternCategory">
            <option value="">全部类别</option>
            <option v-for="cat in categoryOptions" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>
        <div v-if="activeTab !== 'member'" class="search-item">
          <label>购买人</label>
          <select v-model="searchForm.buyer">
            <option value="">全部购买人</option>
            <option v-for="buyer in buyerOptions" :key="buyer" :value="buyer">
              {{ buyer }}
            </option>
          </select>
        </div>
        <div class="search-item">
          <label>是否有图纸</label>
          <select v-model="searchForm.hasImage">
            <option value="">全部</option>
            <option value="true">有图纸</option>
            <option value="false">无图纸</option>
          </select>
        </div>
        <div class="search-item">
          <label>是否完成</label>
          <select v-model="searchForm.completed">
            <option value="">全部</option>
            <option value="true">已完成</option>
            <option value="false">未完成</option>
          </select>
        </div>
        <div class="search-item">
          <label>规格</label>
          <select v-model="searchForm.size">
            <option value="">全部规格</option>
            <option v-for="size in sizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </div>
        <div class="search-item">
          <label>图纸类型</label>
          <el-select
            v-model="searchForm.types"
            class="search-type-select"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
            placeholder="全部类型"
          >
            <el-option
              v-for="opt in searchTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
        <div class="search-item search-item-date">
          <label>图纸日期</label>
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            clearable
            class="search-date-range"
          />
        </div>
        <button type="button" class="btn-search-reset" @click="resetSearch">
          重置
        </button>
      </div>
    </div>

    <div class="table-toolbar">
      <button type="button" class="btn-select-all" :disabled="!currentTotal" @click="toggleSelectAllFiltered">
        {{ isAllFilteredSelected ? "取消全选" : "全选" }}
      </button>
      <span v-if="selectedIds.length" class="selected-count">已选 {{ selectedIds.length }} / {{ currentTotal }} 项</span>
      <button
        type="button"
        class="btn-batch-edit"
        :disabled="!selectedIds.length || batchCategorySaving"
        @click="openBatchCategoryDialog"
      >
        {{ batchCategorySaving ? "修改中…" : "批量修改" }}
      </button>
      <button type="button" class="btn-batch-download" :disabled="!selectedIds.length || batchDownloading"
        @click="openBatchDownloadDialog">
        {{ batchDownloading ? "下载中…" : "批量下载" }}
      </button>
      <button v-if="activeTab === 'normal'" type="button" class="btn-batch-convert"
        :disabled="!selectedIds.length || converting" @click="openBatchConvertConfirm">
        转为会员
      </button>
      <button type="button" class="btn-batch-delete" :disabled="!selectedIds.length" @click="openBatchDeleteConfirm">
        批量删除
      </button>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <table class="data-table" :style="tableStyle">
        <colgroup v-if="activeTab === 'member'">
          <col class="col-check" />
          <col class="col-index" />
          <col class="col-name" />
          <col class="col-thumb" />
          <col class="col-author" />
          <col class="col-size" />
          <col class="col-category" />
          <col class="col-type" />
          <col class="col-buyer" />
          <col class="col-price" />
          <col class="col-completed" />
          <col class="col-completed-date" />
          <col class="col-date" />
          <col class="col-action" />
        </colgroup>
        <colgroup v-else>
          <col class="col-check" />
          <col class="col-index" />
          <col class="col-name" />
          <col class="col-thumb" />
          <col class="col-author" />
          <col class="col-size" />
          <col class="col-category" />
          <col class="col-type" />
          <col class="col-buyer" />
          <col class="col-price" />
          <col class="col-completed" />
          <col class="col-completed-date" />
          <col class="col-date" />
          <col class="col-action" />
        </colgroup>
        <thead>
          <tr>
            <th class="col-check">
              <input type="checkbox" class="row-checkbox" :checked="isAllPageSelected" @change="toggleSelectAllPage" />
            </th>
            <th>序号</th>
            <th>图纸名称</th>
            <th>图纸图片</th>
            <th>图纸作者</th>
            <th>规格</th>
            <th>图纸类别</th>
            <th>图纸类型</th>
            <th>购买人</th>
            <th v-if="activeTab === 'normal'">价格</th>
            <th v-if="activeTab === 'member'">金额</th>
            <th>是否完成</th>
            <th
              class="sortable-th"
              :class="completedDateSortClass"
              @click="toggleCompletedDateSort"
            >
              <span class="sort-label">
                完成日期
                <span class="sort-arrows" aria-hidden="true">
                  <span class="sort-arrow sort-up">▲</span>
                  <span class="sort-arrow sort-down">▼</span>
                </span>
              </span>
            </th>
            <th
              class="sortable-th"
              :class="patternDateSortClass"
              @click="toggleDateSort"
            >
              <span class="sort-label">
                图纸日期
                <span class="sort-arrows" aria-hidden="true">
                  <span class="sort-arrow sort-up">▲</span>
                  <span class="sort-arrow sort-down">▼</span>
                </span>
              </span>
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in tableRows" :key="row.item?.id ?? `empty-${index}`" :class="{
            'row-selected': row.item && isSelected(row.item.id),
            'row-empty': !row.item,
          }">
            <template v-if="row.item">
              <td class="col-check">
                <input type="checkbox" class="row-checkbox" :checked="isSelected(row.item.id)"
                  @change="toggleSelect(row.item.id)" />
              </td>
              <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td>{{ row.item.name }}</td>
              <td class="col-thumb">
                <span class="pattern-thumb-wrap">
                  <img v-if="displayImage(row.item)" class="pattern-thumb" :src="displayImage(row.item)"
                    :alt="row.item.name" width="40" height="40" @click="openPreview(row.item)" />
                  <span v-else-if="row.item.hasImage" class="pattern-thumb-placeholder">加载中</span>
                  <span v-else class="pattern-thumb-placeholder">无图</span>
                </span>
              </td>
              <td>{{ row.item.author }}</td>
              <td>{{ row.item.size }}</td>
              <td>{{ row.item.patternCategory || "-" }}</td>
              <td>
                <span :class="['tag', typeTagClass(row.item.type)]">
                  {{ patternTypeLabels[row.item.type] }}
                </span>
              </td>
              <td>{{ row.item.buyer || "-" }}</td>
              <td v-if="activeTab === 'normal'">{{ formatPrice(row.item.price) }}</td>
              <td v-if="activeTab === 'member'">{{ formatPrice(row.item.valueAmount) }}</td>
              <td>
                <span :class="['tag', row.item.completed ? 'tag-success' : 'tag-pending']">
                  {{ row.item.completed ? "已完成" : "未完成" }}
                </span>
              </td>
              <td>{{ displayCompletedDate(row.item) }}</td>
              <td>{{ row.item.date }}</td>
              <td>
                <span class="action-links">
                  <a class="link" @click="openEdit(row.item)">编辑</a>
                  <a v-if="activeTab === 'normal'" class="link" @click="openConvertConfirm(row.item)">转为会员</a>
                  <a class="link link-danger" @click="openDeleteConfirm(row.item)">删除</a>
                </span>
              </td>
            </template>
            <template v-else>
              <td class="col-check"></td>
              <td></td>
              <td></td>
              <td class="col-thumb"></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td v-if="activeTab === 'normal'"></td>
              <td v-if="activeTab === 'member'"></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination-total">
        共 {{ currentTotal }} 条
        <template v-if="activeTab === 'normal'">，总计 {{ formatPrice(normalPatternTotalPrice) }}</template>
      </span>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">
        首页
      </button>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">
        上一页
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage += 1">
        下一页
      </button>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">
        尾页
      </button>
    </div>

    <PatternPreviewDialog v-model:visible="previewVisible" :name="preview?.name" :image="preview?.image" />

    <PatternFormDialog v-model:visible="dialogVisible" :mode="dialogMode" :saving="saving" :default-category="activeTab"
      :edit-record="editRecord" @submit="handleFormSubmit" @preview="openPreviewFromDialog" />

    <PatternDeleteDialog v-model:visible="deleteConfirmVisible" :mode="deleteMode" :target-name="deleteTarget?.name"
      :count="deleteCount" :loading="deleting" @confirm="confirmDelete" />

    <PatternConvertDialog v-model:visible="convertVisible" :mode="convertMode" :target-name="convertTarget?.name"
      :count="convertCount" :default-buyer="convertDefaultBuyer" :default-type="convertDefaultType"
      :loading="converting" @confirm="confirmConvert" />

    <PatternBatchImportDialog v-model:visible="batchImportVisible" :category="batchImportCategory"
      :patterns="batchImportPatterns" :importing="batchImporting" @import="handleBatchImport" />

    <PatternBatchImageDialog v-model:visible="batchImageVisible" :category="activeTab" :patterns="batchImagePatterns"
      :uploading="batchImageUploading" @confirm="handleBatchImage" />

    <PatternBatchRecognizeDialog
      v-model:visible="batchRecognizeVisible"
      :category="activeTab"
      :buyer="activeTab === 'member' ? memberBuyerTab : ''"
      :member-patterns="memberPatterns"
      :existing-authors="authorOptions"
      :importing="batchRecognizeImporting"
      @import="handleBatchRecognize"
    />

    <PatternBatchCategoryDialog
      v-model:visible="batchCategoryVisible"
      :count="selectedIds.length"
      :category-options="categoryOptions"
      :author-options="authorOptions"
      :pattern-kind="activeTab"
      :loading="batchCategorySaving"
      @confirm="handleBatchCategory"
    />

    <PatternBatchDownloadDialog
      v-model:visible="batchDownloadVisible"
      :count="selectedIds.length"
      :loading="batchDownloading"
      @confirm="handleBatchDownload"
    />

    <MemberPatternWheelDialog v-model:visible="wheelVisible" :patterns="wheelPatterns" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { getDefaultMemberBuyer } from "@/config/permissions";
import FieldCombobox from "@/components/FieldCombobox.vue";
import {
  createPattern,
  createPatternsBatch,
  convertPatternToMember,
  deletePattern,
  deletePatterns,
  getPatternImage,
  hasPatternImageFlag,
  loadPatternImage,
  loadPatternImages,
  loadPatterns,
  patternTypeLabels,
  patternTypeOptions,
  buyerOptions,
  sizeOptions,
  getLatestPatternAssembleDate,
  updatePattern,
  usePatternData,
} from "@/composables/usePatternData";
import { useAuthorAmounts } from "@/composables/useAuthorAmounts";
import { useMessage } from "@/composables/useMessage";
import { uploadImage } from "@/api/upload";
import { matchSizeFilter } from "@/utils/patternSize";
import { downloadPatternsBatchZip } from "@/utils/patternBatchDownload";
import { useListTablePagination } from "@/composables/useListTablePagination";
import PatternFormDialog from "./components/PatternFormDialog.vue";
import PatternDeleteDialog from "./components/PatternDeleteDialog.vue";
import PatternConvertDialog from "./components/PatternConvertDialog.vue";
import PatternPreviewDialog from "./components/PatternPreviewDialog.vue";
import PatternBatchImportDialog from "./components/PatternBatchImportDialog.vue";
import PatternBatchImageDialog from "./components/PatternBatchImageDialog.vue";
import PatternBatchRecognizeDialog from "./components/PatternBatchRecognizeDialog.vue";
import PatternBatchCategoryDialog from "./components/PatternBatchCategoryDialog.vue";
import PatternBatchDownloadDialog from "./components/PatternBatchDownloadDialog.vue";
import MemberPatternWheelDialog from "./components/MemberPatternWheelDialog.vue";

const router = useRouter();
const route = useRoute();
const { user } = useAuth();
const { showSuccess, showError } = useMessage();
const { memberPatterns, normalPatterns } = usePatternData();
const { listAuthorNames } = useAuthorAmounts();

const activeTab = ref("member");
const memberBuyerTab = ref(buyerOptions[0]);
const preview = ref(null);
const previewVisible = computed({
  get: () => Boolean(preview.value),
  set: (val) => {
    if (!val) preview.value = null;
  },
});
const { tableWrapRef, pageSize, currentPage, tableStyle } = useListTablePagination();
const dialogVisible = ref(false);
const dialogMode = ref("create");
const editingId = ref(null);
const editRecord = ref(null);
const saving = ref(false);
const deleting = ref(false);
const batchImportVisible = ref(false);
const batchImporting = ref(false);
const batchImportCategory = ref("member");
const batchImageVisible = ref(false);
const batchImageUploading = ref(false);
const batchRecognizeVisible = ref(false);
const batchRecognizeImporting = ref(false);
const wheelVisible = ref(false);
const batchDownloading = ref(false);
const batchDownloadVisible = ref(false);
const batchCategoryVisible = ref(false);
const batchCategorySaving = ref(false);
const deleteConfirmVisible = ref(false);
const deleteMode = ref("single");
const deleteTarget = ref(null);
const deleteCount = ref(0);
const convertVisible = ref(false);
const convertMode = ref("single");
const convertTarget = ref(null);
const convertCount = ref(0);
const converting = ref(false);
const selectedIds = ref([]);
const sortField = ref("date"); // date | completedDate
const dateSortOrder = ref("desc");
const searchForm = ref({
  name: "",
  author: "",
  patternCategory: "",
  buyer: "",
  hasImage: "",
  completed: "",
  types: [],
  size: "",
  dateRange: null,
});

const searchTypeOptions = computed(() =>
  activeTab.value === "member"
    ? patternTypeOptions
    : patternTypeOptions.filter((opt) => opt.value !== "member"),
);

const patternDateSortClass = computed(() => {
  if (sortField.value !== "date") return "";
  return dateSortOrder.value === "asc" ? "sort-asc" : "sort-desc";
});

const completedDateSortClass = computed(() => {
  if (sortField.value !== "completedDate") return "";
  return dateSortOrder.value === "asc" ? "sort-asc" : "sort-desc";
});

const getPatternSortDate = (item) => {
  if (sortField.value === "completedDate") {
    if (!item?.completed) return "";
    return getLatestPatternAssembleDate(item) || "";
  }
  return item?.date || "";
};

const sortByDate = (list) => {
  const order = dateSortOrder.value;
  return [...list].sort((a, b) => {
    const dateA = getPatternSortDate(a);
    const dateB = getPatternSortDate(b);
    if (!dateA && !dateB) return String(b.id || "").localeCompare(String(a.id || ""));
    if (!dateA) return 1;
    if (!dateB) return -1;
    const cmp = dateA.localeCompare(dateB);
    if (cmp !== 0) return order === "asc" ? cmp : -cmp;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
};

const toggleDateSort = () => {
  if (sortField.value === "date") {
    dateSortOrder.value = dateSortOrder.value === "desc" ? "asc" : "desc";
  } else {
    sortField.value = "date";
    dateSortOrder.value = "desc";
  }
  currentPage.value = 1;
};

const toggleCompletedDateSort = () => {
  if (sortField.value === "completedDate") {
    dateSortOrder.value = dateSortOrder.value === "desc" ? "asc" : "desc";
  } else {
    sortField.value = "completedDate";
    dateSortOrder.value = "desc";
  }
  currentPage.value = 1;
};

const hasBuyerInRoute = () => {
  const buyer = route.query.buyer;
  return typeof buyer === "string" && buyer && buyerOptions.includes(buyer);
};

const applyAuthorFromRoute = () => {
  const author = route.query.author;
  if (typeof author === "string" && author) {
    searchForm.value = { ...searchForm.value, author };
    currentPage.value = 1;
  }
};

const applyBuyerFromRoute = () => {
  const buyer = route.query.buyer;
  if (typeof buyer === "string" && buyer && buyerOptions.includes(buyer)) {
    memberBuyerTab.value = buyer;
  }
};

const applyTabFromRoute = () => {
  const tab = route.query.tab;
  if (tab === "member" || tab === "normal") {
    activeTab.value = tab;
    currentPage.value = 1;
  }
};

const applyRouteQuery = () => {
  applyTabFromRoute();
  applyBuyerFromRoute();
  applyAuthorFromRoute();
};

const tabs = [
  { key: "member", label: "会员图纸" },
  { key: "normal", label: "普通图纸" },
];

const hasPatternImage = (item) => hasPatternImageFlag(item);

const displayImage = (item) => getPatternImage(item);

const filterPatterns = (list) => {
  const {
    name,
    author,
    patternCategory,
    buyer,
    hasImage,
    completed,
    types,
    size,
    dateRange,
  } = searchForm.value;
  const [dateStart, dateEnd] = Array.isArray(dateRange) ? dateRange : [];
  const typeSet = Array.isArray(types) ? types.filter(Boolean) : [];

  return list.filter((item) => {
    if (name && !item.name.includes(name)) return false;
    if (author && !(item.author || "").includes(author.trim())) return false;
    if (patternCategory && item.patternCategory !== patternCategory)
      return false;
    if (buyer && item.buyer !== buyer) return false;
    if (hasImage === "true" && !hasPatternImage(item)) return false;
    if (hasImage === "false" && hasPatternImage(item)) return false;
    if (completed !== "" && String(item.completed) !== completed) return false;
    if (typeSet.length && !typeSet.includes(item.type)) return false;
    if (size && !matchSizeFilter(item.size, size)) return false;
    if (dateStart || dateEnd) {
      const itemDate = item.date || "";
      if (!itemDate) return false;
      if (dateStart && itemDate < dateStart) return false;
      if (dateEnd && itemDate > dateEnd) return false;
    }
    return true;
  });
};

const typeTagClass = (type) => {
  if (type === "paid") return "tag-paid";
  if (type === "member") return "tag-member";
  return "tag-free";
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `¥${num.toFixed(2)}`;
};

const displayCompletedDate = (item) => {
  if (!item?.completed) return "-";
  return getLatestPatternAssembleDate(item) || "-";
};

const memberPatternsByBuyer = computed(() =>
  memberPatterns.value.filter((item) => item.buyer === memberBuyerTab.value),
);

const wheelPatterns = computed(() => [
  ...memberPatterns.value.map((item) => ({ ...item, wheelCategory: "member" })),
  ...normalPatterns.value.map((item) => ({ ...item, wheelCategory: "normal" })),
]);

const filteredMemberPatterns = computed(() =>
  sortByDate(filterPatterns(memberPatternsByBuyer.value)),
);
const filteredNormalPatterns = computed(() =>
  sortByDate(filterPatterns(normalPatterns.value)),
);

const currentList = computed(() =>
  activeTab.value === "member"
    ? filteredMemberPatterns.value
    : filteredNormalPatterns.value,
);

const batchImagePatterns = computed(() =>
  activeTab.value === "member"
    ? memberPatterns.value
    : normalPatterns.value,
);

const batchImportPatterns = computed(() =>
  batchImportCategory.value === "member"
    ? memberPatterns.value
    : normalPatterns.value,
);

const currentTotal = computed(() => currentList.value.length);

const normalPatternTotalPrice = computed(() =>
  filteredNormalPatterns.value.reduce((sum, item) => {
    const num = Number(item.price);
    return sum + (Number.isFinite(num) ? num : 0);
  }, 0),
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(currentTotal.value / pageSize.value)),
);

const pagedMemberPatterns = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredMemberPatterns.value.slice(start, start + pageSize.value);
});

const pagedNormalPatterns = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredNormalPatterns.value.slice(start, start + pageSize.value);
});

const pagedList = computed(() =>
  activeTab.value === "member"
    ? pagedMemberPatterns.value
    : pagedNormalPatterns.value,
);

const tableRows = computed(() => {
  const rows = pagedList.value.map((item) => ({ item }));
  while (rows.length < pageSize.value) {
    rows.push({ item: null });
  }
  return rows;
});

const isSelected = (id) => selectedIds.value.includes(id);

const toggleSelect = (id) => {
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((itemId) => itemId !== id);
  } else {
    selectedIds.value = [...selectedIds.value, id];
  }
};

const isAllPageSelected = computed(() => {
  const page = pagedList.value;
  return (
    page.length > 0 && page.every((item) => selectedIds.value.includes(item.id))
  );
});

const toggleSelectAllPage = () => {
  const pageIds = pagedList.value.map((item) => item.id);
  if (isAllPageSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id));
  } else {
    const merged = new Set([...selectedIds.value, ...pageIds]);
    selectedIds.value = [...merged];
  }
};

const isAllFilteredSelected = computed(() => {
  const list = currentList.value;
  return (
    list.length > 0 && list.every((item) => selectedIds.value.includes(item.id))
  );
});

const toggleSelectAllFiltered = () => {
  const allIds = currentList.value.map((item) => item.id);
  if (!allIds.length) return;

  if (isAllFilteredSelected.value) {
    const idSet = new Set(allIds);
    selectedIds.value = selectedIds.value.filter((id) => !idSet.has(id));
    return;
  }

  selectedIds.value = [...new Set([...selectedIds.value, ...allIds])];
};

const clearSelection = () => {
  selectedIds.value = [];
};

const authorOptions = computed(() => {
  const list =
    activeTab.value === "member"
      ? memberPatternsByBuyer.value
      : normalPatterns.value;
  const set = new Set(list.map((item) => item.author).filter(Boolean));
  if (activeTab.value === "member") {
    listAuthorNames(memberBuyerTab.value).forEach((name) => set.add(name));
  }
  return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
});

const categoryOptions = computed(() => {
  const list =
    activeTab.value === "member"
      ? memberPatternsByBuyer.value
      : normalPatterns.value;
  return [
    ...new Set(
      list.map((item) => String(item.patternCategory || "").trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "zh-CN"));
});

// 筛选项里的类别若已无图纸使用，自动清空，避免继续显示已删除类别
watch(categoryOptions, (opts) => {
  const current = searchForm.value.patternCategory;
  if (current && !opts.includes(current)) {
    searchForm.value.patternCategory = "";
  }
});

const resetSearch = () => {
  searchForm.value = {
    name: "",
    author: "",
    patternCategory: "",
    buyer: "",
    hasImage: "",
    completed: "",
    types: [],
    size: "",
    dateRange: null,
  };
  currentPage.value = 1;
};

watch(activeTab, () => {
  sortField.value = "date";
  dateSortOrder.value = "desc";
  if (activeTab.value === "member") {
    memberBuyerTab.value = getDefaultMemberBuyer(user.value);
  }
  resetSearch();
  clearSelection();
  closeDeleteConfirm(true);
});

watch(
  () => [user.value?.id, user.value?.permissions],
  () => {
    if (hasBuyerInRoute()) {
      applyBuyerFromRoute();
      return;
    }
    memberBuyerTab.value = getDefaultMemberBuyer(user.value);
  },
  { immediate: true, deep: true },
);

watch(memberBuyerTab, () => {
  currentPage.value = 1;
  clearSelection();
});

watch(
  searchForm,
  () => {
    currentPage.value = 1;
  },
  { deep: true },
);

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages;
  }
});

const openPreview = async (item) => {
  let image = displayImage(item);
  if (!image && item.hasImage) {
    image = await loadPatternImage(item.id, activeTab.value);
  }
  if (!image) return;

  if (image.includes("picsum.photos")) {
    image = image.replace(/\/(\d+)\/(\d+)$/, "/800/800");
  }
  preview.value = {
    name: item.name,
    image,
  };
};

const openEdit = async (item) => {
  dialogMode.value = "edit";
  editingId.value = item.id;
  if (item.hasImage && !displayImage(item)) {
    await loadPatternImages([item], activeTab.value);
  }
  editRecord.value = {
    ...item,
    image: displayImage(item) || item.image || "",
  };
  dialogVisible.value = true;
};

const openPreviewFromDialog = (item) => {
  preview.value = item;
};

const openCreate = () => {
  dialogMode.value = "create";
  editingId.value = null;
  editRecord.value = null;
  dialogVisible.value = true;
};

watch(
  [pagedList, activeTab],
  ([list, tab]) => {
    if (list?.length) {
      loadPatternImages(list, tab);
    }
  },
  { immediate: true },
);

const openBatchImport = () => {
  batchImportCategory.value = activeTab.value;
  batchImportVisible.value = true;
};

const openBatchImage = () => {
  batchImageVisible.value = true;
};

const openBatchRecognize = () => {
  if (activeTab.value === "member" && !memberBuyerTab.value) {
    showError("请先选择购买人");
    return;
  }
  batchRecognizeVisible.value = true;
};

const handleBatchRecognize = async ({ category, items }) => {
  if (!items?.length) {
    showError("没有可入库的图纸");
    return;
  }
  batchRecognizeImporting.value = true;
  const categoryLabel = category === "member" ? "会员图纸" : "普通图纸";
  try {
    const payloads = await Promise.all(
      items.map(async ({ imageFile, ...data }) => {
        const payload = { ...data };
        if (imageFile) {
          payload.image = await uploadImage(imageFile);
        }
        if (category !== "member") {
          delete payload.valueAmount;
        } else if (payload.type === "free") {
          payload.valueAmount = null;
        } else if (
          payload.type === "paid" ||
          payload.type === "member"
        ) {
          const amount = Number(payload.valueAmount);
          payload.valueAmount =
            Number.isFinite(amount) && amount > 0
              ? Math.round(amount * 100) / 100
              : null;
        } else {
          payload.valueAmount = null;
        }
        return payload;
      }),
    );
    const created = await createPatternsBatch(category, payloads);
    batchRecognizeVisible.value = false;
    if (category !== activeTab.value) {
      activeTab.value = category;
    }
    resetSearch();
    clearSelection();
    currentPage.value = 1;
    showSuccess(`识图入库成功 ${created.length} 条到${categoryLabel}`);
  } catch (error) {
    console.error(error);
    showError(error.message || "识图入库失败，请确认后端服务正常");
  } finally {
    batchRecognizeImporting.value = false;
  }
};

const runWithConcurrency = async (items, fn, limit = 3) => {
  const results = new Array(items.length);
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current], current);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
};

const handleBatchImage = async ({ category, matches }) => {
  batchImageUploading.value = true;
  const categoryLabel = category === "member" ? "会员图纸" : "普通图纸";
  let success = 0;
  let failed = 0;

  try {
    await runWithConcurrency(matches, async (row) => {
      const targets = row.patterns?.length
        ? row.patterns
        : row.pattern
          ? [row.pattern]
          : [];
      if (!targets.length) return;

      try {
        const imageUrl = await uploadImage(row.file);
        await runWithConcurrency(targets, async (pattern) => {
          try {
            await updatePattern(pattern.id, category, {
              ...pattern,
              image: imageUrl,
            });
            success += 1;
          } catch (error) {
            failed += 1;
            console.error(error);
          }
        });
      } catch (error) {
        failed += targets.length;
        console.error(error);
      }
    });

    batchImageVisible.value = false;
    if (failed === 0) {
      showSuccess(`已成功为 ${success} 张${categoryLabel}更新图片`);
    } else if (success > 0) {
      showError(`成功 ${success} 张，失败 ${failed} 张`);
    } else {
      showError("批量上传失败，请确认后端服务正常");
    }
  } catch (error) {
    console.error(error);
    showError(error.message || "批量上传失败");
  } finally {
    batchImageUploading.value = false;
  }
};

const handleBatchImport = async ({ category, items, deleteIds = [] }) => {
  batchImporting.value = true;
  const categoryLabel = category === "member" ? "会员图纸" : "普通图纸";
  try {
    if (deleteIds.length) {
      await deletePatterns(deleteIds, category);
    }

    let createdCount = 0;
    if (items.length) {
      const payloads = await Promise.all(
        items.map(async ({ imageFile, ...data }) => {
          if (imageFile) {
            data.image = await uploadImage(imageFile);
          }
          return data;
        }),
      );
      const created = await createPatternsBatch(category, payloads);
      createdCount = created.length;
    }

    batchImportVisible.value = false;
    if (category !== activeTab.value) {
      activeTab.value = category;
    }
    resetSearch();
    clearSelection();
    currentPage.value = 1;

    const parts = [];
    if (deleteIds.length) parts.push(`删除 ${deleteIds.length} 条`);
    if (createdCount) parts.push(`导入 ${createdCount} 条`);
    showSuccess(
      parts.length
        ? `已成功${parts.join("，")}到${categoryLabel}`
        : `已处理${categoryLabel}数据`,
    );
  } catch (error) {
    console.error(error);
    const msg = error.message || "";
    if (msg.includes("404")) {
      showError("批量导入接口未就绪，请重启后端：npm run backend");
    } else {
      showError(msg || "批量导入失败，请确认 Excel 数据与后端服务正常");
    }
  } finally {
    batchImporting.value = false;
  }
};

const openDeleteConfirm = (item) => {
  deleteMode.value = "single";
  deleteTarget.value = item;
  deleteConfirmVisible.value = true;
};

const openBatchDownloadDialog = () => {
  if (!selectedIds.value.length) {
    showError("请先选择要下载的图纸");
    return;
  }
  batchDownloadVisible.value = true;
};

const openBatchCategoryDialog = () => {
  if (!selectedIds.value.length) {
    showError("请先选择要修改的图纸");
    return;
  }
  batchCategoryVisible.value = true;
};

const handleBatchCategory = async ({
  editCategory = false,
  editAuthor = false,
  editDate = false,
  editAmount = false,
  patternCategory = "",
  author = "",
  date = "",
  amount = null,
} = {}) => {
  const ids = [...selectedIds.value];
  if (!ids.length) {
    showError("请先选择要修改的图纸");
    return;
  }
  if (!editCategory && !editAuthor && !editDate && !editAmount) {
    showError("请至少填写一个要修改的字段");
    return;
  }
  if (editAmount && (amount == null || !Number.isFinite(Number(amount)) || Number(amount) < 0)) {
    showError(activeTab.value === "normal" ? "请填写有效价格" : "请填写有效金额");
    return;
  }

  const category = activeTab.value;
  const payload = {};
  if (editCategory) payload.patternCategory = String(patternCategory || "").trim();
  if (editAuthor) payload.author = String(author || "").trim();
  if (editDate) payload.date = String(date || "").trim();
  if (editAmount) {
    const nextAmount = Math.round(Number(amount) * 100) / 100;
    if (category === "member") payload.valueAmount = nextAmount;
    else payload.price = nextAmount;
  }

  batchCategorySaving.value = true;
  try {
    await Promise.all(ids.map((id) => updatePattern(id, category, payload)));
    batchCategoryVisible.value = false;
    clearSelection();
    const parts = [];
    if (editCategory) parts.push("类别");
    if (editAuthor) parts.push("作者");
    if (editDate) parts.push("日期");
    if (editAmount) parts.push(category === "member" ? "金额" : "价格");
    showSuccess(`已修改 ${ids.length} 条图纸的${parts.join("、")}`);
  } catch (error) {
    console.error(error);
    showError(error.message || "批量修改失败");
  } finally {
    batchCategorySaving.value = false;
  }
};

const handleBatchDownload = async ({ includeImages = true } = {}) => {
  const items = currentList.value.filter((item) =>
    selectedIds.value.includes(item.id),
  );
  if (!items.length) {
    showError("未找到选中的图纸");
    return;
  }

  batchDownloading.value = true;
  try {
    if (includeImages) {
      await loadPatternImages(
        items.filter((item) => item.hasImage && !displayImage(item)),
        activeTab.value,
      );
    }

    await downloadPatternsBatchZip(items, {
      category: activeTab.value,
      includeImages,
      resolveImage: includeImages
        ? async (item) => {
            let image = displayImage(item);
            if (!image && item.hasImage) {
              image = await loadPatternImage(item.id, activeTab.value);
            }
            return image;
          }
        : undefined,
    });
    batchDownloadVisible.value = false;
    const label = includeImages ? "（含图片）" : "（仅表格）";
    showSuccess(`已下载 ${items.length} 条图纸${label}`);
  } catch (error) {
    console.error(error);
    showError(error.message || "批量下载失败");
  } finally {
    batchDownloading.value = false;
  }
};

const openBatchDeleteConfirm = () => {
  if (!selectedIds.value.length) return;
  deleteMode.value = "batch";
  deleteTarget.value = null;
  deleteCount.value = selectedIds.value.length;
  deleteConfirmVisible.value = true;
};

const convertDefaultBuyer = computed(() => {
  if (convertMode.value === "single" && convertTarget.value?.buyer) {
    return convertTarget.value.buyer;
  }
  return getDefaultMemberBuyer(user.value);
});

const convertDefaultType = computed(() => {
  if (convertMode.value === "single" && convertTarget.value?.type) {
    return convertTarget.value.type;
  }
  return "free";
});

const openConvertConfirm = (item) => {
  convertMode.value = "single";
  convertTarget.value = item;
  convertCount.value = 1;
  convertVisible.value = true;
};

const openBatchConvertConfirm = () => {
  if (!selectedIds.value.length || activeTab.value !== "normal") return;
  convertMode.value = "batch";
  convertTarget.value = null;
  convertCount.value = selectedIds.value.length;
  convertVisible.value = true;
};

const confirmConvert = async ({ buyer, type }) => {
  const ids =
    convertMode.value === "single"
      ? convertTarget.value
        ? [convertTarget.value.id]
        : []
      : [...selectedIds.value];

  if (!ids.length) {
    convertVisible.value = false;
    return;
  }

  converting.value = true;
  try {
    for (const id of ids) {
      const item = normalPatterns.value.find((row) => row.id === id);
      const payload = { buyer };
      if (convertMode.value === "single") {
        payload.type = type;
      } else if (item?.type) {
        payload.type = item.type;
      }
      await convertPatternToMember(id, payload);
    }
    showSuccess(`已成功将 ${ids.length} 条图纸转为会员图纸`);
    convertVisible.value = false;
    convertTarget.value = null;
    clearSelection();
  } catch (error) {
    showError(error.message || "转换失败，请确认后端已启动");
  } finally {
    converting.value = false;
  }
};

const closeDeleteConfirm = (force = false) => {
  if (!force && deleting.value) return;
  deleteConfirmVisible.value = false;
  deleteTarget.value = null;
  deleteCount.value = 0;
};

watch(deleteConfirmVisible, (visible) => {
  if (!visible && !deleting.value) {
    deleteTarget.value = null;
    deleteCount.value = 0;
  }
});

const confirmDelete = async () => {
  if (deleteMode.value === "batch" && !selectedIds.value.length) {
    showError("请先选择要删除的图纸");
    closeDeleteConfirm(true);
    return;
  }
  if (deleteMode.value === "single" && !deleteTarget.value) {
    closeDeleteConfirm(true);
    return;
  }

  const category = activeTab.value;
  const count = deleteMode.value === "single" ? 1 : selectedIds.value.length;
  const idsToDelete =
    deleteMode.value === "batch" ? [...selectedIds.value] : [];

  deleting.value = true;
  try {
    if (deleteMode.value === "single") {
      await deletePattern(deleteTarget.value.id, category);
    } else {
      await deletePatterns(idsToDelete, category);
      clearSelection();
    }
    closeDeleteConfirm(true);
    showSuccess(`成功删除 ${count} 条图纸`);
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value;
    }
  } catch (error) {
    console.error(error);
    showError(error.message || "删除失败，请确认后端已启动");
  } finally {
    deleting.value = false;
  }
};

const handleFormSubmit = async ({
  isMember,
  data,
  imageFile,
  imageCleared,
}) => {
  const category = isMember ? "member" : "normal";

  saving.value = true;
  try {
    const payload = { ...data };

    if (imageFile) {
      payload.image = await uploadImage(imageFile);
    } else if (imageCleared) {
      payload.image = "";
    } else if (dialogMode.value !== "edit") {
      const current = data.image || "";
      payload.image = current.startsWith("blob:") ? "" : current;
    } else {
      delete payload.image;
    }

    if (dialogMode.value === "edit") {
      await updatePattern(editingId.value, category, payload);
      showSuccess("编辑成功");
    } else {
      await createPattern(category, payload);
      showSuccess("新增成功");
    }
    dialogVisible.value = false;
  } catch (error) {
    console.error(error);
    showError(
      error.message || "保存失败，请先运行 npm run backend 启动本地后端",
    );
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadPatterns(true);
  applyRouteQuery();
});

watch(
  () => route.query.author,
  () => applyAuthorFromRoute(),
);

watch(
  () => route.query.buyer,
  () => applyBuyerFromRoute(),
);

watch(
  () => route.query.tab,
  () => applyTabFromRoute(),
  { immediate: true },
);

watch(
  () => user.value?.id,
  (userId) => {
    if (userId) loadPatterns(true);
  },
);

const goToStatistics = () => {
  router.push({
    name: "statistics",
    query: {
      tab: "pattern",
      patternTab: activeTab.value,
      chart: activeTab.value === "member" ? "member-pattern" : undefined,
    },
  });
};
</script>

<style scoped>
.page-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  max-width: 100%;
  min-height: 0;
  padding: 20px 24px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.page-header {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.page-header h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-secondary {
  padding: 8px 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.tab-bar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: linear-gradient(180deg, #fff 0%, var(--color-pale) 100%);
}

.tab-group {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.tab-group-buyer {
  margin-left: auto;
}

.tab-group-label {
  flex-shrink: 0;
  padding: 0 6px 0 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.tab-divider {
  flex-shrink: 0;
  width: 1px;
  height: 22px;
  background: var(--color-border);
}

.tab-item {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-item-buyer {
  min-width: 56px;
}

.tab-item:hover {
  color: var(--color-text-primary);
}

.tab-item-active {
  background: #fff;
  color: var(--color-text-primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(250, 208, 196, 0.45);
}

.tab-group-buyer .tab-item-active {
  color: var(--color-accent-deep, var(--color-accent));
}

.search-bar {
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  margin-bottom: 12px;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
  overflow: visible;
  position: relative;
  z-index: 5;
}

.search-fields {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
  overflow: visible;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: visible;
  position: relative;
}

.search-item label {
  flex-shrink: 0;
  min-width: 56px;
  color: var(--color-text-regular);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.search-item select {
  width: 120px;
  min-width: 0;
  height: 32px;
  padding: 0 28px 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-color: var(--color-pale);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236e5660' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.search-name-input {
  width: 130px;
}

.search-name-input :deep(.el-input__wrapper) {
  height: 32px;
  padding: 0 8px 0 12px;
  border-radius: 6px;
  background: var(--color-pale);
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.search-name-input :deep(.el-input__wrapper:hover),
.search-name-input :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.search-name-input :deep(.el-input__inner) {
  color: var(--color-text-primary);
  font-size: 13px;
}

.search-item select:focus {
  border-color: var(--color-accent);
  background-color: #fff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a83858' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
}

.search-item-date {
  align-items: center;
}

.search-date-range {
  width: 260px;
}

.search-type-select {
  width: 160px;
}

.search-type-select :deep(.el-select__wrapper) {
  min-height: 32px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--color-pale);
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.search-type-select :deep(.el-select__wrapper:hover),
.search-type-select :deep(.el-select__wrapper.is-focused) {
  background: #fff;
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.search-type-select :deep(.el-select__selection) {
  gap: 4px;
}

.search-type-select :deep(.el-select__selected-item) {
  color: var(--color-text-primary);
  font-size: 13px;
}

.search-type-select :deep(.el-tag) {
  max-width: 72px;
  border: none;
  background: #ffe8ef;
  color: var(--color-accent);
}

.search-author-input {
  width: 140px;
  z-index: 6;
}

.search-author-input :deep(input) {
  background: var(--color-pale);
}

.search-author-input :deep(input:focus) {
  background: #fff;
  border-color: var(--color-accent);
}

.search-author-input :deep(.field-combobox-list) {
  z-index: 20;
  max-height: 240px;
}

.search-date-range :deep(.el-input__wrapper) {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
  background: var(--color-pale);
}

.search-date-range :deep(.el-input__wrapper:hover),
.search-date-range :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--color-accent) inset;
  background: #fff;
}

.search-date-range :deep(.el-range-input) {
  color: var(--color-text-primary);
  font-size: 13px;
}

.search-date-range :deep(.el-range-separator) {
  color: var(--color-text-regular);
  font-size: 13px;
}

.btn-search-reset {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-search-reset:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.table-toolbar {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.selected-count {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.btn-select-all {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-select-all:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-select-all:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-batch-edit {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-batch-edit:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-pale);
}

.btn-batch-edit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-batch-download {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-batch-download:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: var(--color-pale);
}

.btn-batch-download:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-batch-delete {
  height: 32px;
  padding: 0 16px;
  border: 1px solid #f0c4c8;
  border-radius: 6px;
  background: #fff5f6;
  color: #e85d6a;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-batch-delete:hover:not(:disabled) {
  border-color: #e85d6a;
  background: #ffeef0;
}

.btn-batch-delete:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-batch-convert {
  height: 32px;
  padding: 0 16px;
  border: 1px solid #e8d4f0;
  border-radius: 6px;
  background: #faf5ff;
  color: #9333ea;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-batch-convert:hover:not(:disabled) {
  border-color: #9333ea;
  background: #f3ebff;
}

.btn-batch-convert:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.col-check {
  width: 40px;
  text-align: center;
}

.row-checkbox {
  width: 15px;
  height: 15px;
  margin: 0;
  cursor: pointer;
  accent-color: var(--color-accent);
}

.row-selected {
  background: #fff9fb;
}

.btn-primary {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background-image: var(--gradient-main);
  color: var(--color-text-primary);
  box-shadow: 0 2px 8px rgba(250, 208, 196, 0.4);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
}

.data-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

thead th {
  z-index: 1;
  padding: 0 6px;
  color: var(--color-text-secondary);
  font-weight: 500;
  background: var(--color-pale);
}

th,
td {
  padding: 0 6px;
  border-bottom: 1px solid var(--color-border);
  text-align: center;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

td {
  color: var(--color-text-regular);
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:not(.row-empty):hover {
  background: #fff9fb;
}

.row-empty td {
  background: transparent;
}

th:nth-child(3),
td:nth-child(3) {
  text-align: left;
}

.col-index {
  width: 5%;
}

.col-name {
  width: 14%;
}

.pattern-thumb {
  cursor: zoom-in;
}

.sortable-th {
  width: 9%;
}

.col-size {
  width: 6%;
}

.col-category {
  width: 8%;
}

.col-type {
  width: 7%;
}

.col-buyer {
  width: 7%;
}

.col-price {
  width: 6%;
}

.col-completed {
  width: 7%;
}

.col-completed-date {
  width: 8%;
}

.col-date {
  width: 9%;
}

.col-action {
  width: 10%;
}

.sortable-th {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.sortable-th:hover {
  color: var(--color-accent);
}

.sort-label {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.sort-arrows {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1;
}

.sort-arrow {
  color: #d4c4cc;
  font-size: 9px;
  line-height: 1;
}

.sortable-th.sort-desc .sort-down,
.sortable-th.sort-asc .sort-up {
  color: var(--color-accent);
}

.link {
  color: var(--color-accent);
  text-decoration: none;
  cursor: pointer;
}

.link:hover {
  opacity: 0.85;
}

.action-links {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.link-danger {
  color: #e85d6a;
}

.link-danger:hover {
  color: #d94452;
}

.pagination {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.pagination-total {
  margin-right: auto;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.page-info {
  color: var(--color-text-regular);
  font-size: 13px;
}

.page-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.tag-success {
  background: #f0f9eb;
  color: #67c23a;
}

.tag-pending {
  background: #fdf6ec;
  color: #e6a23c;
}

.tag-paid {
  background: #eef2ff;
  color: #6366f1;
}

.tag-member {
  background: #f3e8ff;
  color: #9333ea;
}

.tag-free {
  background: #f4f4f5;
  color: #909399;
}
</style>
