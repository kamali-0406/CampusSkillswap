import { createRouter } from '../../utils/http.js';
import * as users from '../../services/userService.js';

// GET /users, GET /users/me, PUT /users/me, GET /users/{id}
export const handler = createRouter([
  { method: 'GET', path: '/users', handle: ({ caller }) => users.listUsers(caller) },
  { method: 'GET', path: '/users/me', handle: ({ caller }) => users.getMe(caller) },
  { method: 'PUT', path: '/users/me', handle: ({ caller, body }) => users.updateMe(caller, body) },
  { method: 'GET', path: '/users/{id}', handle: ({ caller, params }) => users.getUser(caller, params.id) }
]);
