import { createRouter } from '../../utils/http.js';
import * as skills from '../../services/skillService.js';

// GET /skills, POST /skills, PUT /skills/{id}, DELETE /skills/{id}
export const handler = createRouter([
  { method: 'GET', path: '/skills', handle: ({ caller }) => skills.listMine(caller) },
  { method: 'POST', path: '/skills', status: 201, handle: ({ caller, body }) => skills.addSkill(caller, body) },
  { method: 'PUT', path: '/skills/{id}', handle: ({ caller, params, body }) => skills.updateSkill(caller, params.id, body) },
  { method: 'DELETE', path: '/skills/{id}', handle: ({ caller, params }) => skills.removeSkill(caller, params.id) }
]);
