import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import AdminLayout from '../layout/AdminLayout.vue'
import { getAuthToken } from '@/composables/useAuth'
import { isPrimaryAdmin } from '@/config/defaultAuth'
import { hasPermission, ROUTE_PERMISSION_MAP } from '@/config/permissions'

const routerMode = process.env.VUE_APP_ROUTER_MODE || 'history'

const routes = [
  {
    path: '/login',
    name: 'login',
    meta: { public: true, title: '登录' },
    component: () => import('../view/login/index.vue'),
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        meta: { title: '首页', permission: 'home.view' },
        component: () => import('../view/home/index.vue'),
      },
      {
        path: 'pattern',
        name: 'pattern',
        meta: { title: '拼豆图纸', permission: 'pattern.view' },
        component: () => import('../view/pattern/index.vue'),
      },
      {
        path: 'author',
        name: 'author',
        meta: { title: '图纸作者', permission: 'author.view' },
        component: () => import('../view/author/index.vue'),
      },
      {
        path: 'tools',
        name: 'tools',
        meta: { title: '拼豆工具', permission: 'tools.view' },
        component: () => import('../view/tools/index.vue'),
      },
      {
        path: 'tools/board/:size',
        name: 'tools-board',
        meta: { title: '拼豆板', permission: 'tools.view' },
        component: () => import('../view/tools/BoardDetail.vue'),
      },
      {
        path: 'tools/pen',
        name: 'tools-pen',
        meta: { title: '拼豆笔', permission: 'tools.view' },
        component: () => import('../view/tools/PenDetail.vue'),
      },
      {
        path: 'tools/scoop',
        name: 'tools-scoop',
        meta: { title: '拼豆铲', permission: 'tools.view' },
        component: () => import('../view/tools/ScoopDetail.vue'),
      },
      {
        path: 'tools/other',
        name: 'tools-other',
        meta: { title: '其他', permission: 'tools.view' },
        component: () => import('../view/tools/OtherDetail.vue'),
      },
      {
        path: 'cost',
        name: 'cost',
        meta: { title: '拼豆花费', permission: 'cost.view' },
        component: () => import('../view/cost/index.vue'),
      },
      {
        path: 'cost/review',
        name: 'cost-review',
        meta: { title: '拼豆测评', permission: 'cost.view' },
        component: () => import('../view/cost/review/index.vue'),
      },
      {
        path: 'statistics',
        name: 'statistics',
        meta: { title: '数据统计', permission: 'statistics.view' },
        component: () => import('../view/statistics/index.vue'),
      },
      {
        path: 'permission',
        name: 'permission',
        meta: { title: '权限设置', userManage: true },
        component: () => import('../view/permission/index.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        meta: { title: '个人信息', permission: 'profile.view' },
        component: () => import('../view/profile/index.vue'),
      },
    ],
  },
]

const history =
  routerMode === 'hash'
    ? createWebHashHistory(process.env.BASE_URL)
    : createWebHistory(process.env.BASE_URL)

const router = createRouter({
  history,
  routes,
})

function readStoredUser() {
  try {
    const raw = localStorage.getItem('pindou-admin-user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getFirstAllowedRoute(user) {
  const order = ['home', 'pattern', 'author', 'tools', 'cost', 'statistics', 'profile']
  for (const name of order) {
    const perm = ROUTE_PERMISSION_MAP[name]
    if (hasPermission(user, perm)) {
      return { name }
    }
  }
  return { name: 'login' }
}

router.beforeEach((to) => {
  const token = getAuthToken()
  const user = readStoredUser()
  const isAdmin = isPrimaryAdmin(user)

  if (to.meta.public) {
    if (token && to.name === 'login') {
      return isAdmin ? { name: 'permission' } : getFirstAllowedRoute(user)
    }
    return true
  }

  if (!token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (isAdmin) {
    if (to.name !== 'permission') {
      return { name: 'permission' }
    }
    return true
  }

  if (to.meta.userManage) {
    return getFirstAllowedRoute(user)
  }

  const requiredPermission = to.meta.permission
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return getFirstAllowedRoute(user)
  }

  return true
})

export default router
