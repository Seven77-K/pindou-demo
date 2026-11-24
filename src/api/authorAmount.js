import request from './request'

export function fetchAuthorAmounts() {
  return request.get('/author-amounts')
}

export function upsertAuthorAmount(payload) {
  return request.put('/author-amounts', payload)
}

export function deleteAuthorAmount(payload) {
  return request.delete('/author-amounts', { data: payload })
}

export function renameAuthor(payload) {
  return request.post('/authors/rename', payload)
}
