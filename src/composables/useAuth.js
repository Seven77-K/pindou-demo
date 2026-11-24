import { computed, ref } from 'vue'
import { fetchCurrentUser, login as apiLogin, logout as apiLogout } from '@/api/auth'
import { clearPatterns } from '@/composables/usePatternData'
import { initBoardInventory, initToolInventory } from '@/view/tools/constants'
import { DEFAULT_AUTH, isDefaultCredentials, isLocalDefaultToken, isOfflineError, isPrimaryAdmin } from '@/config/defaultAuth'

const TOKEN_KEY = 'pindou-admin-token'
const USER_KEY = 'pindou-admin-user'

const token = ref(localStorage.getItem(TOKEN_KEY) || '')
const user = ref(loadStoredUser())
const authReady = ref(false)
let lastSessionUserId = user.value?.id ?? null

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistSession(nextToken, nextUser) {
  const nextUserId = nextUser?.id ?? null
  if (nextUserId !== lastSessionUserId) {
    clearPatterns()
    initBoardInventory(nextUserId)
    initToolInventory(nextUserId)
    lastSessionUserId = nextUserId
  }

  token.value = nextToken || ''
  user.value = nextUser || null

  if (nextToken) {
    localStorage.setItem(TOKEN_KEY, nextToken)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }

  if (nextUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  } else {
    localStorage.removeItem(USER_KEY)
  }
}

export function getAuthToken() {
  return token.value || localStorage.getItem(TOKEN_KEY) || ''
}

export function isUsingLocalSession() {
  return isLocalDefaultToken(getAuthToken())
}

async function tryUpgradeLocalSession() {
  if (!isLocalDefaultToken(getAuthToken())) return false
  try {
    const data = await apiLogin(DEFAULT_AUTH.username, DEFAULT_AUTH.password)
    persistSession(data.token, data.user)
    return true
  } catch {
    return false
  }
}

export async function initAuth() {
  const currentToken = getAuthToken()
  if (!currentToken) {
    authReady.value = true
    return null
  }

  if (isLocalDefaultToken(currentToken)) {
    const upgraded = await tryUpgradeLocalSession()
    authReady.value = true
    return upgraded ? user.value : DEFAULT_AUTH.user
  }

  try {
    const current = await fetchCurrentUser()
    persistSession(currentToken, current)
    authReady.value = true
    return current
  } catch {
    persistSession('', null)
    authReady.value = true
    return null
  }
}

export function useAuth() {
  const isLoggedIn = computed(() => Boolean(token.value))
  const isSuperAdmin = computed(() => isPrimaryAdmin(user.value))
  const canManageUsers = computed(() => isSuperAdmin.value)
  const displayAccount = computed(() => user.value?.displayName || user.value?.username || '管理员')

  const login = async (username, password) => {
    try {
      const data = await apiLogin(username, password)
      persistSession(data.token, data.user)
      return data.user
    } catch (error) {
      if (isDefaultCredentials(username, password) && isOfflineError(error)) {
        persistSession(DEFAULT_AUTH.localToken, DEFAULT_AUTH.user)
        return DEFAULT_AUTH.user
      }
      throw error
    }
  }

  const logout = async () => {
    try {
      if (token.value && !isLocalDefaultToken(token.value)) {
        await apiLogout()
      }
    } catch {
      // ignore logout errors
    } finally {
      persistSession('', null)
    }
  }

  const clearSession = () => {
    persistSession('', null)
  }

  return {
    token,
    user,
    authReady,
    isLoggedIn,
    isSuperAdmin,
    canManageUsers,
    displayAccount,
    login,
    logout,
    clearSession,
    tryUpgradeLocalSession,
    isUsingLocalSession,
  }
}
