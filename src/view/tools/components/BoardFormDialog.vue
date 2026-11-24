<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>{{ mode === "edit" ? "编辑豆板" : "新增豆板" }}</h4>
            <p class="header-sub">填写豆板信息，保存后会出现在对应规格分类下</p>
          </div>
          <button type="button" class="dialog-close" :disabled="saving" @click="handleClose">
            ×
          </button>
        </div>

        <form class="dialog-form" @submit.prevent="handleSubmit">
          <div class="form-grid">
            <div class="form-item form-span-2">
              <label class="label-required">豆板名称</label>
              <el-input v-model="form.name" placeholder="请输入豆板名称" clearable />
            </div>

            <div class="form-item form-span-2">
              <label class="label-required">规格</label>
              <el-select v-model="form.sizeSlug" placeholder="请选择规格" class="field-full">
                <el-option v-for="size in BOARD_SIZES" :key="size" :label="size" :value="toBoardSlug(size)" />
              </el-select>
            </div>

            <div class="form-item form-span-2">
              <label>底板</label>
              <FieldCombobox v-model="form.basePlate" :options="basePlateOptions" placeholder="请选择或输入底板" />
            </div>

            <div class="form-item form-span-2">
              <label>豆板图片</label>
              <div class="upload-wrap">
                <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="onImageChange">
                  <button type="button" class="btn-upload">选择图片</button>
                </el-upload>
                <span class="upload-filename">{{
                  imageFile?.name ||
                  (imagePreview ? "已设置图片" : "未选择文件")
                }}</span>
                <img v-if="imagePreview" class="form-thumb" :src="imagePreview" alt="预览"
                  @click="previewVisible = true" />
                <button v-if="imagePreview" type="button" class="btn-clear-image" @click="clearImage">
                  清除
                </button>
              </div>
            </div>

            <div class="form-item">
              <label>状态</label>
              <el-select v-model="form.status" placeholder="请选择状态" class="field-full">
                <el-option v-for="opt in BOARD_STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </div>

            <div class="form-item">
              <label>瑕疵状态</label>
              <el-select v-model="form.defectStatus" placeholder="请选择瑕疵状态" class="field-full">
                <el-option v-for="opt in BOARD_DEFECT_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </div>

            <div class="form-item">
              <label>品牌</label>
              <el-input v-model="form.brand" clearable />
            </div>

            <div class="form-item">
              <label>购买渠道</label>
              <FieldCombobox v-model="form.channel" :options="channelOptions" placeholder="请选择或输入购买渠道" />
            </div>

            <div class="form-item">
              <label>购买日期</label>
              <el-date-picker v-model="form.purchaseDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期"
                popper-class="dialog-field-popper" clearable class="field-full" />
            </div>

            <div class="form-item">
              <label>数量</label>
              <el-input-number v-model="form.stock" :min="1" :max="9999" :step="1" step-strictly
                controls-position="right" placeholder="1" class="field-full" />
            </div>

            <div class="form-item form-span-2">
              <label>价格</label>
              <el-input-number v-model="form.price" :min="0" :max="999999" :precision="2" :step="0.01"
                :step-strictly="false" controls-position="right" placeholder="0.00" class="field-full" />
            </div>

            <div class="form-item form-span-2">
              <label>备注</label>
              <el-input v-model="form.note" type="textarea" :rows="3" placeholder="选填，可记录店铺、链接等信息" resize="none" />
            </div>
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="handleClose">
              取消
            </button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? "保存中…" : "确定" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <PatternPreviewDialog v-model:visible="previewVisible" :name="form.name || '豆板预览'" :image="imagePreview" />
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import FieldCombobox from "@/components/FieldCombobox.vue";
import { useMessage } from "@/composables/useMessage";
import PatternPreviewDialog from "@/view/pattern/components/PatternPreviewDialog.vue";
import {
  BOARD_ALL_SLUG,
  BOARD_DEFECT_OPTIONS,
  BOARD_SIZES,
  BOARD_STATUS_OPTIONS,
  boardInventory,
  fromBoardSlug,
  getBoardList,
  toBoardSlug,
} from "../constants";

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: "create" },
  saving: { type: Boolean, default: false },
  defaultSizeSlug: { type: String, default: "" },
  editRecord: { type: Object, default: null },
});

const emit = defineEmits(["update:visible", "submit"]);

const { showError } = useMessage();

const imageFile = ref(null);
const imagePreview = ref("");
const imageCleared = ref(false);
const previewVisible = ref(false);

const createForm = () => ({
  sizeSlug: props.defaultSizeSlug || "",
  name: "",
  brand: "",
  channel: "",
  price: null,
  purchaseDate: "",
  basePlate: "",
  note: "",
  status: "在用",
  defectStatus: "无暇",
  stock: 1,
});

const form = reactive(createForm());

const buildFieldOptions = (field) => {
  void boardInventory;
  const set = new Set();
  getBoardList(BOARD_ALL_SLUG).forEach((item) => {
    const value = String(item[field] || "").trim();
    if (value) set.add(value);
  });
  return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
};

const basePlateOptions = computed(() => {
  const set = new Set(buildFieldOptions("basePlate"));
  const current = form.basePlate?.trim();
  if (current) set.add(current);
  return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
});

const channelOptions = computed(() => {
  const set = new Set(buildFieldOptions("channel"));
  const current = form.channel?.trim();
  if (current) set.add(current);
  return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
});

const resetImageState = () => {
  if (imagePreview.value.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreview.value);
  }
  imageFile.value = null;
  imagePreview.value = "";
  imageCleared.value = false;
  previewVisible.value = false;
};

const resetForm = () => {
  Object.assign(form, createForm());
  resetImageState();
};

const fillEditForm = () => {
  const record = props.editRecord;
  if (!record) return;

  form.sizeSlug = record.sizeSlug || props.defaultSizeSlug || "";
  form.name = record.name || "";
  form.brand = record.brand || "";
  form.channel = record.channel || "";
  form.price =
    record.price === "" || record.price == null ? null : record.price;
  form.purchaseDate = record.purchaseDate || "";
  form.basePlate = record.basePlate || "";
  form.note = record.note || "";
  form.status = record.status || "在用";
  form.defectStatus = record.defectStatus || "无暇";
  form.stock = record.stock || 1;
  imageFile.value = null;
  imageCleared.value = false;
  imagePreview.value = record.image || "";
};

watch(
  () => [props.visible, props.mode, props.editRecord],
  ([visible]) => {
    if (!visible) {
      if (!props.saving) resetForm();
      return;
    }

    if (props.mode === "edit") {
      fillEditForm();
    } else {
      resetForm();
      form.sizeSlug = props.defaultSizeSlug || "";
    }
  },
);

watch(
  () => form.status,
  (status, prevStatus) => {
    if (props.mode !== "edit" || !props.visible) return;
    if (prevStatus === "在途" && status === "在用") {
      form.defectStatus = "无暇";
    }
  },
);

const handleClose = () => {
  if (props.saving) return;
  emit("update:visible", false);
};

const onImageChange = (uploadFile) => {
  const file = uploadFile?.raw;
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showError("请选择图片文件");
    return;
  }

  if (imagePreview.value.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreview.value);
  }

  imageFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
  imageCleared.value = false;
};

const clearImage = () => {
  resetImageState();
  imageCleared.value = true;
};

const handleSubmit = () => {
  if (props.saving) return;

  if (!form.name.trim()) {
    showError("请输入豆板名称");
    return;
  }
  if (!form.sizeSlug) {
    showError("请选择规格");
    return;
  }
  if (!form.stock || form.stock < 1) {
    showError("数量需为大于 0 的整数");
    return;
  }

  emit("submit", {
    mode: props.mode,
    id: props.editRecord?.id,
    originalSizeSlug: props.editRecord?.sizeSlug,
    sizeSlug: form.sizeSlug,
    name: form.name,
    size: fromBoardSlug(form.sizeSlug),
    brand: form.brand,
    channel: form.channel,
    price: form.price,
    purchaseDate: form.purchaseDate,
    basePlate: form.basePlate,
    note: form.note,
    status: form.status,
    defectStatus: form.defectStatus,
    stock: form.stock,
    imageFile: imageFile.value,
    imageCleared: imageCleared.value,
    existingImage: props.editRecord?.image || "",
  });
};
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
  background: rgba(61, 42, 50, 0.45);
  backdrop-filter: blur(2px);
}

.dialog-box {
  width: 500px;
  max-width: 92vw;
  max-height: 90vh;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(168, 56, 88, 0.18);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, #fff 0%, var(--color-pale) 100%);
}

.header-text h4 {
  margin: 0 0 4px;
  color: var(--color-text-primary);
  font-size: 17px;
  font-weight: 600;
}

.header-sub {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dialog-close:hover:not(:disabled) {
  background: #fff;
  color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(168, 56, 88, 0.12);
}

.dialog-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-form {
  max-height: calc(90vh - 140px);
  padding: 18px 20px 20px;
  overflow: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
}

.form-span-2 {
  grid-column: span 2;
}

.form-item label {
  display: block;
  margin-bottom: 7px;
  color: var(--color-text-regular);
  font-size: 13px;
  font-weight: 500;
}

.label-required::before {
  content: "*";
  margin-right: 4px;
  color: #e85d6a;
}

.field-full {
  width: 100%;
}

.form-item :deep(.el-input__wrapper),
.form-item :deep(.el-select__wrapper),
.form-item :deep(.el-input-number),
.form-item :deep(.el-date-editor) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.form-item :deep(.el-input__wrapper:hover),
.form-item :deep(.el-select__wrapper:hover),
.form-item :deep(.el-input-number:hover),
.form-item :deep(.el-date-editor:hover) {
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.form-item :deep(.el-input__wrapper.is-focus),
.form-item :deep(.el-select__wrapper.is-focused),
.form-item :deep(.el-input-number.is-focus),
.form-item :deep(.el-date-editor.is-active) {
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.form-item :deep(.el-input__inner),
.form-item :deep(.el-select__selected-item),
.form-item :deep(.el-textarea__inner) {
  color: var(--color-text-primary);
  font-size: 13px;
}

.form-item :deep(.el-textarea__inner) {
  padding: 10px 12px;
  line-height: 1.5;
}

.form-item :deep(.el-input-number .el-input__wrapper) {
  box-shadow: none;
}

.upload-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  background: linear-gradient(180deg, #fff 0%, var(--color-pale) 100%);
}

.btn-upload {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-upload:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-clear-image {
  padding: 0;
  border: none;
  background: none;
  color: #e85d6a;
  font-size: 12px;
  cursor: pointer;
}

.btn-clear-image:hover {
  opacity: 0.85;
}

.upload-filename {
  flex: 1;
  min-width: 120px;
  color: var(--color-text-secondary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-thumb {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  object-fit: cover;
  cursor: zoom-in;
  transition: transform 0.2s ease;
}

.form-thumb:hover {
  transform: scale(1.05);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.btn-primary {
  min-width: 88px;
  padding: 9px 22px;
  border: none;
  border-radius: 8px;
  background-image: var(--gradient-main);
  color: var(--color-text-primary);
  box-shadow: 0 2px 10px rgba(250, 208, 196, 0.45);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-cancel {
  min-width: 88px;
  padding: 9px 22px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<style>
.dialog-field-popper {
  z-index: 2100 !important;
}
</style>
