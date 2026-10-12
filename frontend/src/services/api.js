// Data-access layer: every call the UI makes to API Gateway + Lambda lives here.
import { http } from './apiClient';

export const api = {
  getMe: () => http.get('/users/me'),
  updateMe: (data) => http.put('/users/me', data),
  getUser: (id) => http.get(`/users/${encodeURIComponent(id)}`),

  getSkills: () => http.get('/skills'),
  addSkill: (type, name) => http.post('/skills', { type, name }),
  updateSkill: (id, name) => http.put(`/skills/${encodeURIComponent(id)}`, { name }),
  removeSkill: (id) => http.del(`/skills/${encodeURIComponent(id)}`),

  getMatches: () => http.get('/matches'),

  getSentRequests: () => http.get('/requests/sent'),
  getReceivedRequests: () => http.get('/requests/received'),
  sendRequest: (payload) => http.post('/requests', payload),
  acceptRequest: (id) => http.put(`/requests/${encodeURIComponent(id)}/accept`),
  rejectRequest: (id) => http.put(`/requests/${encodeURIComponent(id)}/reject`),
  completeRequest: (id) => http.put(`/requests/${encodeURIComponent(id)}/complete`),

  getRatings: () => http.get('/ratings'),
  createRating: (payload) => http.post('/ratings', payload)
};
