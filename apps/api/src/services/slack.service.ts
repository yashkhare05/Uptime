import { WebClient } from '@slack/web-api';

export class SlackService {
  private client: WebClient | null = null;

  constructor() {
    if (!process.env.SLACK_BOT_TOKEN) {
      console.error('[SlackService] ERROR: SLACK_BOT_TOKEN is not set in environment variables');
      return;
    }
    if (!process.env.SLACK_CHANNEL_ID) {
      console.error('[SlackService] ERROR: SLACK_CHANNEL_ID is not set in environment variables');
      return;
    }

    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    console.log('[SlackService] Initialized with Slack Web API');
    console.log('[SlackService] Channel ID:', process.env.SLACK_CHANNEL_ID);
  }

  async sendDowntimeNotification(websiteUrl: string, downtimeDuration: number) {
    if (!this.client) {
      console.error('[SlackService] Cannot send notification: Slack client not initialized');
      return;
    }

    console.log(`[SlackService] Preparing to send notification for ${websiteUrl}`);
    console.log(`[SlackService] Downtime duration: ${downtimeDuration} minutes`);

    const message = {
      channel: process.env.SLACK_CHANNEL_ID!,
      text: `🚨 *Website Down Alert* 🚨\n*Website:* ${websiteUrl}\n*Downtime Duration:* ${downtimeDuration} minutes\nPlease check the website status and take necessary actions.`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Website Down Alert 🚨",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Website:*\n${websiteUrl}`
            },
            {
              type: "mrkdwn",
              text: `*Downtime Duration:*\n${downtimeDuration} minutes`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Please check the website status and take necessary actions."
          }
        }
      ]
    };

    try {
      console.log('[SlackService] Sending notification to Slack...');
      const response = await this.client.chat.postMessage(message);
      console.log('[SlackService] Notification sent successfully:', response);
      console.log(`[SlackService] Downtime notification sent for ${websiteUrl}`);
    } catch (error: any) {
      console.error('[SlackService] Error sending Slack notification:', error);
      if (error.data) {
        console.error('[SlackService] Slack API Error:', error.data);
      }
      throw error;
    }
  }
} 