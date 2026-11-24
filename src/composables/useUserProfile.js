import { computed, ref } from 'vue'

const LEGACY_STORAGE_KEY = 'pindou-admin-user-profile'
const profile = ref({ name: '管理员', avatar: '', customized: false })
let currentUserId = null

function getStorageKey(userId) {
  return `pindou-admin-user-profile-${userId}`
}

function readProfileFromStorage(userId, fallbackName = '管理员') {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) {
      return { name: fallbackName, avatar: '', customized: false }
    }

    const parsed = JSON.parse(raw)
    const customized = Boolean(parsed.customized)

    if (!customized) {
      return { name: fallbackName, avatar: '', customized: false }
    }

    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallbackName,
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : '',
      customized: true,
    }
  } catch {
    return { name: fallbackName, avatar: '', customized: false }
  }
}

function migrateLegacyProfile(user) {
  if (user?.role !== 'super_admin') return

  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy || localStorage.getItem(getStorageKey(user.id))) return

    const parsed = JSON.parse(legacy)
    const migrated = {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : user.displayName || user.username,
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : '',
      customized: true,
    }
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(migrated))
  } catch {
    // ignore
  }
}

function clearWrongLegacyMigration(user) {
  if (user?.role === 'super_admin') return

  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return

    const current = localStorage.getItem(getStorageKey(user.id))
    if (current === legacy) {
      localStorage.removeItem(getStorageKey(user.id))
    }
  } catch {
    // ignore
  }
}

export function loadProfileForUser(user) {
  if (!user?.id) {
    clearProfileSession()
    return
  }

  currentUserId = user.id
  migrateLegacyProfile(user)
  clearWrongLegacyMigration(user)

  const fallbackName = user.displayName || user.username || '管理员'
  profile.value = readProfileFromStorage(user.id, fallbackName)
}

export function clearProfileSession() {
  currentUserId = null
  profile.value = { name: '管理员', avatar: '', customized: false }
}

function persistProfile() {
  if (!currentUserId) return
  localStorage.setItem(getStorageKey(currentUserId), JSON.stringify(profile.value))
}

export function useUserProfile() {
  const displayName = computed(() => profile.value.name || '管理员')

  const avatarInitial = computed(() => {
    const name = displayName.value.trim()
    return name ? name.charAt(0) : '管'
  })

  const hasCustomProfile = computed(() => profile.value.customized)

  const saveProfile = (payload) => {
    profile.value = {
      name: payload.name?.trim() || profile.value.name || '管理员',
      avatar: payload.avatar ?? profile.value.avatar,
      customized: true,
    }
    persistProfile()
  }

  const resetAvatar = () => {
    profile.value = { ...profile.value, avatar: '', customized: true }
    persistProfile()
  }

  return {
    profile,
    displayName,
    avatarInitial,
    hasCustomProfile,
    saveProfile,
    resetAvatar,
    loadProfileForUser,
    clearProfileSession,
  }
}
