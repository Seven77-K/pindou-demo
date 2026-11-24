import request from './request'

export function login(username, password) {
  return request.post('/auth/login', { username, password })
}

export function fetchCurrentUser() {
  return request.get('/auth/me')
}

export function logout() {
  return request.post('/auth/logout')
}

export function changePassword(data) {
  return request.post('/auth/change-password', data)
}

export function fetchUsers() {
  return request.get('/users')
}

export function fetchUserById(id) {
  return request.get(`/users/${id}`)
}

export function createUser(data) {
  return request.post('/users', data)
}

export function updateUser(id, data) {
  return request.put(`/users/${id}`, data)
}

export function deleteUser(id) {
  return request.delete(`/users/${id}`)
}
