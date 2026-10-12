import { createRouter } from '../../utils/http.js';
import * as matches from '../../services/matchService.js';

// GET /matches, GET /matches/{userId}
export const handler = createRouter([
  { method: 'GET', path: '/matches', handle: ({ caller }) => matches.getMatches(caller) },
  { method: 'GET', path: '/matches/{userId}', handle: ({ caller, params }) => matches.getMatchWith(caller, params.userId) }
]);
