<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-icon">拼</span>
        <div class="logo-text">
          <h1>拼豆管理</h1>
          <p>Admin Console</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <!-- <p class="nav-section-title">功能菜单</p> -->
        <router-link
          v-for="item in visibleMenuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ 'nav-item-active': isMenuActive(item.path) }"
        >
          <span class="nav-icon">
            <el-icon :size="20">
              <component :is="item.icon" />
            </el-icon>
          </span>
          <span class="nav-label">{{ item.title }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <span class="footer-dot"></span>
        <span>v0.1.0</span>
      </div>
    </aside>

    <div class="main-wrapper">
      <header class="main-header">
        <h2 class="page-title">{{ currentTitle }}</h2>
        <div class="header-right">
          <span class="account-role">{{ roleLabel }}</span>
          <router-link v-if="!isSuperAdmin && canViewProfile" to="/profile" class="admin-trigger" title="个人信息">
            <span class="admin-avatar">
              <img v-if="hasCustomProfile && profile.avatar" :src="profile.avatar" alt="" class="admin-avatar-img" />
              <span v-else>{{ headerDisplayName.charAt(0) || avatarInitial }}</span>
            </span>
            <span class="admin-name">{{ headerDisplayName }}</span>
          </router-link>
          <button type="button" class="btn-logout" @click="handleLogout">退出</button>
        </div>
      </header>

      <main class="main-content">
        <router-view v-slot="{ Component, route }">
          <!-- 仅统计页需要缓存；其它异步路由包进 KeepAlive 会在切换/热更新时报 null.component -->
          <keep-alive include="StatisticsPage">
            <component
              :is="Component"
              v-if="Component && route.name === 'statistics'"
              class="page-view"
            />
          </keep-alive>
          <component
            :is="Component"
            v-if="Component && route.name !== 'statistics'"
            :key="route.fullPath"
            class="page-view"
          />
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChatDotRound,
  DataLine,
  HomeFilled,
  Lock,
  Picture,
  SetUp,
  User,
  Wallet,
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { useUserProfile } from '@/composables/useUserProfile'
import { clearPatterns } from '@/composables/usePatternData'
import { hasPermission } from '@/config/permissions'

const route = useRoute()
const router = useRouter()
const { profile, avatarInitial, hasCustomProfile, clearProfileSession } = useUserProfile()
const { displayAccount, isSuperAdmin, logout, user } = useAuth()

const headerDisplayName = computed(() =>
  hasCustomProfile.value && profile.value.name ? profile.value.name : displayAccount.value
)

const menuItems = [
  { path: '/home', title: '首页', icon: HomeFilled, permission: 'home.view' },
  { path: '/pattern', title: '拼豆图纸', icon: Picture, permission: 'pattern.view' },
  { path: '/author', title: '图纸作者', icon: User, permission: 'author.view' },
  { path: '/tools', title: '拼豆工具', icon: SetUp, permission: 'tools.view' },
  { path: '/cost', title: '拼豆花费', icon: Wallet, permission: 'cost.view' },
  { path: '/cost/review', title: '拼豆测评', icon: ChatDotRound, permission: 'cost.view' },
  { path: '/statistics', title: '数据统计', icon: DataLine, permission: 'statistics.view' },
  { path: '/permission', title: '权限设置', icon: Lock, userManage: true },
]

const visibleMenuItems = computed(() => {
  if (isSuperAdmin.value) {
    return menuItems.filter((item) => item.userManage)
  }
  return menuItems.filter(
    (item) => !item.userManage && hasPermission(user.value, item.permission),
  )
})

const canViewProfile = computed(() => hasPermission(user.value, 'profile.view'))

const roleLabel = computed(() => (isSuperAdmin.value ? '超级管理员' : '管理员'))

const currentTitle = computed(() => route.meta.title || '首页')

/** /cost 与 /cost/review 分开高亮，避免父子路由同时激活 */
const isMenuActive = (path) => {
  if (path === '/cost') return route.path === '/cost'
  return route.path === path || route.path.startsWith(`${path}/`)
}

const handleLogout = async () => {
  await logout()
  clearPatterns()
  clearProfileSession()
  router.replace({ name: 'login' })
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-pale);
}

.sidebar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 248px;
  overflow: hidden;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.55), transparent 42%),
    linear-gradient(180deg, #fce2dc 0%, #f8d4f3 48%, #f3c8ef 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 8px 0 32px rgba(168, 56, 88, 0.08);
}

.sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 28%);
  pointer-events: none;
}

.sidebar-logo,
.sidebar-nav,
.sidebar-footer {
  position: relative;
  z-index: 1;
}

.sidebar-logo {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 26px 20px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.58);
}

.logo-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-accent);
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 8px 18px rgba(168, 56, 88, 0.12);
}

.logo-text h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.5px;
}

.logo-text p {
  margin: 4px 0 0;
  color: rgba(82, 64, 74, 0.72);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.sidebar-nav {
  flex: 1;
  padding: 18px 14px;
  overflow-y: auto;
}

.nav-section-title {
  margin: 0 0 10px;
  padding: 0 12px;
  color: rgba(82, 64, 74, 0.62);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
}

.nav-item {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 6px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: var(--color-text-regular);
  font-size: 14px;
  text-decoration: none;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.48);
  border-color: rgba(255, 255, 255, 0.72);
  color: var(--color-accent-deep);
  transform: translateX(2px);
}

.nav-item:hover .nav-icon {
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-accent-deep);
}

.nav-item-active {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(255, 255, 255, 0.95);
  color: var(--color-accent-deep);
  font-weight: 600;
  box-shadow: 0 8px 18px rgba(168, 56, 88, 0.1);
}

.nav-item-active::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 10px;
  bottom: 10px;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #d86b88 0%, var(--color-accent) 100%);
}

.nav-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--color-accent);
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.nav-item-active .nav-icon {
  background: linear-gradient(135deg, #e87898 0%, var(--color-accent) 100%);
  color: #fff;
  box-shadow: 0 4px 10px rgba(168, 56, 88, 0.22);
}

.nav-label {
  line-height: 1.3;
}

.sidebar-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 16px 20px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.58);
  color: rgba(82, 64, 74, 0.68);
  font-size: 12px;
}

.footer-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5ec9b8;
  box-shadow: 0 0 0 4px rgba(94, 201, 184, 0.18);
}

.main-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--color-pale);
}

.main-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 64px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid var(--color-border);
}

.page-title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}

.header-right {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
}

.admin-trigger {
  display: flex;
  gap: 8px;
  align-items: center;
  max-width: 150px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: #fff;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease;
}

.admin-trigger:hover {
  border-color: rgba(168, 56, 88, 0.3);
}

.admin-name {
  overflow: hidden;
  color: var(--color-text-regular);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-role {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--color-pale);
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 500;
}

.btn-logout {
  flex-shrink: 0;
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-logout:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.admin-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(180deg, #fad0c4 0%, #ffd1ff 100%);
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 600;
}

.admin-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.main-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 22px 28px 24px;
  overflow: hidden;
}

.main-content :deep(.page-view) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

@media (max-width: 960px) {
  .sidebar {
    width: 220px;
  }

  .main-header {
    height: auto;
    min-height: 56px;
    padding: 12px 16px;
  }

  .main-content {
    padding: 16px 18px 20px;
  }
}
</style>
