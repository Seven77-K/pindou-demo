/** 内置超级管理员，部署后用于创建其他账号 */
export const DEFAULT_AUTH = {
  username: 'admin',
  password: '123456',
  localToken: '__pindou_default_admin__',
  user: {
    id: 1,
    username: 'admin',
    displayName: '超级管理员',
    role: 'super_admin',
    status: true,
  },
}

export function isPrimaryAdmin(user) {
  return String(user?.username || '').trim() === DEFAULT_AUTH.username
}

export function isDefaultCredentials(username, password) {
  return (
    String(username || '').trim() === DEFAULT_AUTH.username &&
    String(password) === DEFAULT_AUTH.password
  )
}

export function isLocalDefaultToken(token) {
  return token === DEFAULT_AUTH.localToken
}

export function isOfflineError(error) {
  const message = error?.message || ''
  return (
    !error?.response ||
    message.includes('无法连接后端') ||
    message.includes('连接后端超时')
  )
}

export function canManageUsers(user) {
  return isPrimaryAdmin(user)
}
