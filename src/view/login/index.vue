<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <span class="brand-icon">拼</span>
        <div>
          <h1>拼豆管理</h1>
          <p>拼豆后台管理系统</p>
        </div>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="form-item">
          <label>账号</label>
          <el-input v-model="form.username" placeholder="请输入账号" clearable />
        </div>
        <div class="form-item">
          <label>密码</label>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleSubmit"
          />
        </div>
        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useMessage } from '@/composables/useMessage'
import { isPrimaryAdmin } from '@/config/defaultAuth'
import { hasPermission } from '@/config/permissions'
import { loadProfileForUser } from '@/composables/useUserProfile'
import { clearPatterns, loadPatterns } from '@/composables/usePatternData'
import { initBoardInventory, initToolInventory } from '@/view/tools/constants'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()
const { showSuccess, showError } = useMessage()

const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
})

const handleSubmit = async () => {
  if (!form.username.trim()) {
    showError('请输入账号')
    return
  }
  if (!form.password) {
    showError('请输入密码')
    return
  }

  loading.value = true
  try {
    const user = await login(form.username.trim(), form.password)
    clearPatterns()
    initBoardInventory(user.id)
    initToolInventory(user.id)
    loadProfileForUser(user)
    await loadPatterns(true)
    showSuccess('登录成功')
    if (isPrimaryAdmin(user)) {
      router.replace({ name: 'permission' })
    } else {
      const order = [
        { name: 'home', perm: 'home.view' },
        { name: 'pattern', perm: 'pattern.view' },
        { name: 'author', perm: 'author.view' },
        { name: 'tools', perm: 'tools.view' },
        { name: 'cost', perm: 'cost.view' },
        { name: 'statistics', perm: 'statistics.view' },
      ]
      const fallback = order.find((item) => hasPermission(user, item.perm))?.name || 'home'
      if (typeof route.query.redirect === 'string') {
        router.replace(route.query.redirect)
      } else {
        router.replace({ name: fallback })
      }
    }
  } catch (error) {
    showError(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(135deg, #fff5f8 0%, #ffeef6 45%, #fff 100%);
}

.login-card {
  width: 420px;
  max-width: 100%;
  padding: 32px 28px 28px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(168, 56, 88, 0.12);
}

.login-brand {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 28px;
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background-image: var(--gradient-main);
  color: var(--color-text-primary);
  font-size: 24px;
  font-weight: 700;
}

.login-brand h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 22px;
}

.login-brand p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text-regular);
  font-size: 13px;
  font-weight: 500;
}

.form-item :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.btn-login {
  margin-top: 8px;
  height: 42px;
  border: none;
  border-radius: 10px;
  background-image: var(--gradient-main);
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(250, 208, 196, 0.45);
}

.btn-login:hover:not(:disabled) {
  opacity: 0.92;
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
