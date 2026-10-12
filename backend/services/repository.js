// Chooses the data store. All business logic talks to this interface only.
//
// Repository interface (both implementations):
//   getProfile(userId) / putProfile(profile) / listProfiles()
//   listSkills(userId) / getSkill(userId, skillId) / putSkill(skill) / deleteSkill(userId, skillId) / listAllSkills()
//   putRequest(req) / getRequest(id) / transitionRequest(id, allowedFrom[], patch)
//   listSentRequests(userId) / listReceivedRequests(userId)
//   putRating(rating) / listRatingsReceived(userId) / listRatingsGiven(userId)
import { createMemoryRepository } from './memoryRepository.js';
import { createDynamoRepository } from './dynamoRepository.js';

let instance;
export function getRepository() {
  if (!instance) {
    instance = (process.env.DATA_STORE || 'dynamodb') === 'memory' ? createMemoryRepository() : createDynamoRepository();
  }
  return instance;
}
export function resetRepositoryForTests() { instance = undefined; }
