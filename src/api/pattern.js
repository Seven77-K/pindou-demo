import request from './request'

export function fetchPatterns() {
  return request.get('/patterns')
}

export function fetchPatternById(id) {
  return request.get(`/patterns/${id}`, { timeout: 60000 })
}

export function fetchPatternImage(id) {
  return request.get(`/patterns/${id}/image`, { timeout: 30000 }).then((data) => data?.image || '')
}

export function createPattern(category, data) {
  return request.post('/patterns', { category, ...data })
}

export function createPatternsBatch(category, items) {
  return request.post('/patterns/batch', { category, items }, { timeout: 120000 })
}

export function updatePattern(id, data) {
  return request.put(`/patterns/${id}`, data)
}

export function convertPatternToMember(id, data = {}) {
  return request.post(`/patterns/${id}/convert-to-member`, data)
}

export function deletePattern(id) {
  return request.delete(`/patterns/${id}`)
}
