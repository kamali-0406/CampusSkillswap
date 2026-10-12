import { createRouter } from '../../utils/http.js';
import * as requests from '../../services/requestService.js';

// GET /requests/sent, GET /requests/received, POST /requests,
// PUT /requests/{requestId}/accept | reject | complete
export const handler = createRouter([
  { method: 'GET', path: '/requests/sent', handle: ({ caller }) => requests.listSent(caller) },
  { method: 'GET', path: '/requests/received', handle: ({ caller }) => requests.listReceived(caller) },
  { method: 'POST', path: '/requests', status: 201, handle: ({ caller, body }) => requests.createRequest(caller, body) },
  { method: 'PUT', path: '/requests/{requestId}/accept', handle: ({ caller, params }) => requests.acceptRequest(caller, params.requestId) },
  { method: 'PUT', path: '/requests/{requestId}/reject', handle: ({ caller, params }) => requests.rejectRequest(caller, params.requestId) },
  { method: 'PUT', path: '/requests/{requestId}/complete', handle: ({ caller, params }) => requests.completeRequest(caller, params.requestId) }
]);
