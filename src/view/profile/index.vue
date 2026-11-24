<template>
  <div class="page-card">
    <div class="page-header">
      <h3>个人信息</h3>
      <span class="header-tip">修改后将同步显示在右上角</span>
    </div>

    <div class="profile-body">
      <section class="avatar-section">
        <div class="avatar-preview">
          <img v-if="form.avatar" :src="form.avatar" alt="头像" class="avatar-img" />
          <span v-else class="avatar-fallback">{{ previewInitial }}</span>
        </div>
        <div class="avatar-actions">
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="file-input"
            @change="onAvatarChange"
          />
          <button type="button" class="btn-primary" :disabled="uploading" @click="triggerUpload">
            {{ uploading ? '上传中…' : '更换头像' }}
          </button>
          <button
            v-if="form.avatar"
            type="button"
            class="btn-ghost"
            :disabled="uploading"
            @click="removeAvatar"
          >
            恢复默认
          </button>
          <p class="avatar-tip">支持 JPG、PNG、WebP，建议正方形图片</p>
        </div>
      </section>

      <section class="form-section">
        <label class="field-label" for="profile-name">用户名称</label>
        <input
          id="profile-name"
          v-model.trim="form.name"
          type="text"
          maxlength="20"
          placeholder="请输入用户名称"
          class="name-input"
        />
        <p class="field-tip">最多 20 个字符</p>
      </section>

      <section class="form-section password-section">
        <h4 class="section-title">修改密码</h4>
        <p class="field-tip section-desc">修改后将同步至权限设置，超级管理员可在权限设置中查看</p>
        <label class="field-label" for="profile-current-password">当前密码</label>
        <input
          id="profile-current-password"
          v-model="passwordForm.currentPassword"
          type="password"
          placeholder="请输入当前密码"
          class="name-input"
          autocomplete="current-password"
        />
        <label class="field-label" for="profile-new-password">新密码</label>
        <input
          id="profile-new-password"
          v-model="passwordForm.newPassword"
          type="password"
          placeholder="请输入新密码（至少 6 位）"
          class="name-input"
          autocomplete="new-password"
        />
        <label class="field-label" for="profile-confirm-password">确认新密码</label>
        <input
          id="profile-confirm-password"
          v-model="passwordForm.confirmPassword"
          type="password"
          placeholder="请再次输入新密码"
          class="name-input"
          autocomplete="new-password"
        />
        <div class="form-actions password-actions">
          <button type="button" class="btn-primary" :disabled="changingPassword" @click="handleChangePassword">
            {{ changingPassword ? '保存中…' : '保存密码' }}
          </button>
          <button type="button" class="btn-ghost" @click="resetPasswordForm">重置</button>
        </div>
      </section>

      <div class="form-actions">
        <button type="button" class="btn-primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <button type="button" class="btn-ghost" @click="resetForm">重置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useUserProfile } from '@/composables/useUserProfile'
import { useMessage } from '@/composables/useMessage'
import { changePassword } from '@/api/auth'
import { compressAvatarForStorage } from '@/utils/imageFile'

const { user, displayAccount } = useAuth()
const { profile, saveProfile } = useUserProfile()
const { showSuccess, showError } = useMessage()

const fileInputRef = ref(null)
const uploading = ref(false)
const saving = ref(false)
const changingPassword = ref(false)

const form = ref({
  name: '',
  avatar: '',
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const previewInitial = computed(() => {
  const name = form.value.name.trim()
  return name ? name.charAt(0) : '管'
})

const resetForm = () => {
  if (profile.value.customized) {
    form.value = {
      name: profile.value.name,
      avatar: profile.value.avatar,
    }
    return
  }

  form.value = {
    name: displayAccount.value,
    avatar: '',
  }
}

watch(
  () => [user.value?.id, profile.value.name, profile.value.avatar, profile.value.customized, displayAccount.value],
  () => resetForm(),
  { immediate: true }
)

const triggerUpload = () => {
  fileInputRef.value?.click()
}

const onAvatarChange = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showError('请选择图片文件')
    return
  }

  uploading.value = true
  try {
    form.value.avatar = await compressAvatarForStorage(file)
  } catch {
    showError('头像上传失败，请换一张图片重试')
  } finally {
    uploading.value = false
  }
}

const removeAvatar = () => {
  form.value.avatar = ''
}

const resetPasswordForm = () => {
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
}

const handleChangePassword = async () => {
  const { currentPassword, newPassword, confirmPassword } = passwordForm.value
  if (!currentPassword) {
    showError('请输入当前密码')
    return
  }
  if (!newPassword) {
    showError('请输入新密码')
    return
  }
  if (newPassword.length < 6) {
    showError('密码至少 6 位')
    return
  }
  if (newPassword !== confirmPassword) {
    showError('两次输入的新密码不一致')
    return
  }

  changingPassword.value = true
  try {
    await changePassword({ currentPassword, newPassword })
    resetPasswordForm()
    showSuccess('密码修改成功')
  } catch (error) {
    showError(error.message || '密码修改失败')
  } finally {
    changingPassword.value = false
  }
}

const handleSave = async () => {
  const name = form.value.name.trim()
  if (!name) {
    showError('用户名称不能为空')
    return
  }

  saving.value = true
  try {
    saveProfile({ name, avatar: form.value.avatar })
    form.value.name = profile.value.name
    form.value.avatar = profile.value.avatar
    showSuccess('个人信息已保存')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  height: 100%;
  padding: 20px 24px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 17px;
}

.header-tip {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.profile-body {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.avatar-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--color-border);
}

.avatar-preview {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  overflow: hidden;
  border-radius: 50%;
  background-image: var(--gradient-main);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  color: var(--color-text-primary);
  font-size: 32px;
  font-weight: 600;
}

.avatar-actions {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  min-width: 200px;
}

.file-input {
  display: none;
}

.field-label {
  display: block;
  margin-bottom: 10px;
  color: var(--color-text-regular);
  font-size: 14px;
  font-weight: 500;
}

.name-input {
  width: 100%;
  max-width: 360px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-pale);
  color: var(--color-text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.name-input:focus {
  border-color: var(--color-accent);
  background: #fff;
}

.field-tip,
.avatar-tip {
  margin: 8px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.password-section {
  padding-top: 28px;
  border-top: 1px solid var(--color-border);
}

.section-title {
  margin: 0 0 8px;
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
}

.section-desc {
  margin: 0 0 16px;
}

.password-section .field-label {
  margin-top: 16px;
}

.password-section .field-label:first-of-type {
  margin-top: 0;
}

.password-actions {
  margin-top: 20px;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.btn-primary,
.btn-ghost {
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-deep);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
