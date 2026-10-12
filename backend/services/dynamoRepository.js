// DynamoDB implementation (single table, on-demand billing). See infrastructure/README.md for the table design.
//
//   Profile : PK USER#<id>      SK PROFILE
//   Skill   : PK USER#<id>      SK SKILL#<skillId>
//   Request : PK REQUEST#<id>   SK META   GSI1 SENT#<from>   GSI2 RECV#<to>
//   Rating  : PK RATING#<id>    SK META   GSI1 GIVEN#<from>  GSI2 GOT#<to>
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, UpdateCommand
} from '@aws-sdk/lib-dynamodb';

const KEY_FIELDS = ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK', 'entityType'];
const strip = (item) => {
  if (!item) return undefined;
  const copy = { ...item };
  KEY_FIELDS.forEach((k) => delete copy[k]);
  return copy;
};

export function createDynamoRepository() {
  const TABLE = process.env.TABLE_NAME;
  if (!TABLE) throw new Error('TABLE_NAME environment variable is not set.');
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });

  const put = (item) => doc.send(new PutCommand({ TableName: TABLE, Item: item }));
  const get = async (PK, SK) => strip((await doc.send(new GetCommand({ TableName: TABLE, Key: { PK, SK } }))).Item);

  // Scan is fine at campus scale. If the user base grows, replace with a GSI per entity type.
  async function scanByType(entityType) {
    const items = [];
    let key;
    do {
      const r = await doc.send(new ScanCommand({
        TableName: TABLE, ExclusiveStartKey: key,
        FilterExpression: 'entityType = :t', ExpressionAttributeValues: { ':t': entityType }
      }));
      items.push(...(r.Items || []));
      key = r.LastEvaluatedKey;
    } while (key);
    return items.map(strip);
  }

  async function queryAll(params) {
    const items = [];
    let key;
    do {
      const r = await doc.send(new QueryCommand({ TableName: TABLE, ExclusiveStartKey: key, ...params }));
      items.push(...(r.Items || []));
      key = r.LastEvaluatedKey;
    } while (key);
    return items.map(strip);
  }

  const queryIndex = (index, pkName, pk) => queryAll({
    IndexName: index, KeyConditionExpression: `${pkName} = :pk`,
    ExpressionAttributeValues: { ':pk': pk }, ScanIndexForward: false
  });

  return {
    getProfile: (id) => get(`USER#${id}`, 'PROFILE'),
    async putProfile(p) { await put({ PK: `USER#${p.userId}`, SK: 'PROFILE', entityType: 'PROFILE', ...p }); return p; },
    listProfiles: () => scanByType('PROFILE'),

    listSkills: (userId) => queryAll({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'SKILL#' }
    }),
    getSkill: (userId, skillId) => get(`USER#${userId}`, `SKILL#${skillId}`),
    async putSkill(s) { await put({ PK: `USER#${s.userId}`, SK: `SKILL#${s.skillId}`, entityType: 'SKILL', ...s }); return s; },
    async deleteSkill(userId, skillId) {
      await doc.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `SKILL#${skillId}` } }));
    },
    listAllSkills: () => scanByType('SKILL'),

    async putRequest(r) {
      await put({
        PK: `REQUEST#${r.requestId}`, SK: 'META', entityType: 'REQUEST',
        GSI1PK: `SENT#${r.fromUserId}`, GSI1SK: r.createdAt,
        GSI2PK: `RECV#${r.toUserId}`, GSI2SK: r.createdAt, ...r
      });
      return r;
    },
    getRequest: (id) => get(`REQUEST#${id}`, 'META'),
    /** Atomic status change: succeeds only if the current status is in allowedFrom. Returns null otherwise. */
    async transitionRequest(id, allowedFrom, patch) {
      const names = { '#status': 'status' };
      const values = {};
      const sets = [];
      Object.entries(patch).forEach(([k, v], i) => { names[`#k${i}`] = k; values[`:v${i}`] = v; sets.push(`#k${i} = :v${i}`); });
      allowedFrom.forEach((s, i) => { values[`:f${i}`] = s; });
      try {
        const r = await doc.send(new UpdateCommand({
          TableName: TABLE, Key: { PK: `REQUEST#${id}`, SK: 'META' },
          UpdateExpression: `SET ${sets.join(', ')}`,
          ConditionExpression: `attribute_exists(PK) AND #status IN (${allowedFrom.map((_, i) => `:f${i}`).join(', ')})`,
          ExpressionAttributeNames: names, ExpressionAttributeValues: values, ReturnValues: 'ALL_NEW'
        }));
        return strip(r.Attributes);
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') return null;
        throw err;
      }
    },
    listSentRequests: (userId) => queryIndex('GSI1', 'GSI1PK', `SENT#${userId}`),
    listReceivedRequests: (userId) => queryIndex('GSI2', 'GSI2PK', `RECV#${userId}`),

    async putRating(r) {
      await put({
        PK: `RATING#${r.ratingId}`, SK: 'META', entityType: 'RATING',
        GSI1PK: `GIVEN#${r.fromUserId}`, GSI1SK: r.createdAt,
        GSI2PK: `GOT#${r.toUserId}`, GSI2SK: r.createdAt, ...r
      });
      return r;
    },
    listRatingsGiven: (userId) => queryIndex('GSI1', 'GSI1PK', `GIVEN#${userId}`),
    listRatingsReceived: (userId) => queryIndex('GSI2', 'GSI2PK', `GOT#${userId}`)
  };
}
