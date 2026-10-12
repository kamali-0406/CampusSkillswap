import { createRouter } from '../../utils/http.js';
import * as ratings from '../../services/ratingService.js';

// GET /ratings, POST /ratings
export const handler = createRouter([
  { method: 'GET', path: '/ratings', handle: ({ caller }) => ratings.listRatings(caller) },
  { method: 'POST', path: '/ratings', status: 201, handle: ({ caller, body }) => ratings.createRating(caller, body) }
]);
