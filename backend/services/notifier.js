// Publishes exchange events to Amazon SNS when SNS_TOPIC_ARN is configured. No-op otherwise.
import { logger } from '../utils/logger.js';

let client;
export async function notify(eventType, payload) {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) return;
  try {
    const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');
    client ??= new SNSClient({});
    await client.send(new PublishCommand({
      TopicArn: topicArn,
      Subject: `Campus SkillSwap: ${eventType}`.slice(0, 100),
      Message: JSON.stringify({ eventType, ...payload }),
      MessageAttributes: {
        eventType: { DataType: 'String', StringValue: eventType },
        recipientUserId: { DataType: 'String', StringValue: payload.recipientUserId || 'unknown' }
      }
    }));
  } catch (err) {
    // Notifications are best-effort: never fail the user's request because SNS is down.
    logger.warn('SNS publish failed', { eventType, name: err.name, message: err.message });
  }
}
