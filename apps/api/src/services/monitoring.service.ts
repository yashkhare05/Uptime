import { EmailService } from './email.service';
import { SlackService } from './slack.service';
import { prismaClient } from 'db/client';

interface WebsiteStatus {
  id: string;
  url: string;
  isUp: boolean;
  lastChecked: Date;
  lastDownTime?: Date;
  notificationSent: boolean;
}

export class MonitoringService {
  private websites: Map<string, WebsiteStatus> = new Map();
  private emailService: EmailService;
  private slackService: SlackService;
  private readonly DOWNTIME_THRESHOLD = 2; // minutes

  constructor() {
    console.log('[MonitoringService] Initializing monitoring service...');
    this.emailService = new EmailService();
    this.slackService = new SlackService();
    console.log('[MonitoringService] Initialized with email and Slack services');
    console.log(`[MonitoringService] Downtime threshold set to ${this.DOWNTIME_THRESHOLD} minutes`);
  }

  async updateWebsiteStatus(websiteId: string, status: 'good' | 'bad') {
    console.log(`[MonitoringService] ===== Status Update for Website ${websiteId} =====`);
    console.log(`[MonitoringService] New status: ${status}`);
    console.log(`[MonitoringService] Current time: ${new Date().toISOString()}`);
    
    const website = await prismaClient.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        url: true,
        notificationEmail: true
      }
    });

    if (!website) {
      console.error(`[MonitoringService] ❌ Website ${websiteId} not found in database`);
      return;
    }

    if (!website.notificationEmail) {
      console.warn(`[MonitoringService] ⚠️ No notification email set for website ${websiteId}`);
      return;
    }

    console.log(`[MonitoringService] Found website details:`);
    console.log(`[MonitoringService] - URL: ${website.url}`);
    console.log(`[MonitoringService] - Notification Email: ${website.notificationEmail}`);

    const currentStatus = this.websites.get(websiteId);
    if (currentStatus) {
      console.log(`[MonitoringService] Previous status:`);
      console.log(`[MonitoringService] - Is Up: ${currentStatus.isUp}`);
      console.log(`[MonitoringService] - Last Checked: ${currentStatus.lastChecked.toISOString()}`);
      console.log(`[MonitoringService] - Last Down Time: ${currentStatus.lastDownTime?.toISOString() || 'N/A'}`);
      console.log(`[MonitoringService] - Notification Sent: ${currentStatus.notificationSent}`);
    } else {
      console.log(`[MonitoringService] No previous status found, creating new status entry`);
    }

    const newStatus: WebsiteStatus = {
      id: websiteId,
      url: website.url,
      isUp: status === 'good',
      lastChecked: new Date(),
      lastDownTime: currentStatus?.lastDownTime,
      notificationSent: currentStatus?.notificationSent || false
    };

    const isUp = status === 'good';
    const now = new Date();

    if (!isUp && !newStatus.lastDownTime) {
      newStatus.lastDownTime = now;
      console.log(`[MonitoringService] 🔴 Website ${websiteId} is down, started tracking downtime`);
    } else if (isUp) {
      newStatus.lastDownTime = undefined;
      newStatus.notificationSent = false;
      console.log(`[MonitoringService] 🟢 Website ${websiteId} is back up`);
    }

    this.websites.set(websiteId, newStatus);
    console.log(`[MonitoringService] Updated status stored in memory`);

    // Check if we need to send notifications
    if (!isUp && newStatus.lastDownTime) {
      const downtimeDuration = (now.getTime() - newStatus.lastDownTime.getTime()) / (1000 * 60);
      console.log(`[MonitoringService] Current downtime duration: ${downtimeDuration.toFixed(2)} minutes`);
      
      if (downtimeDuration >= this.DOWNTIME_THRESHOLD && !newStatus.notificationSent) {
        console.log(`[MonitoringService] ⚠️ Downtime threshold exceeded, preparing to send notifications`);
        
        try {
          console.log(`[MonitoringService] Sending email notification to ${website.notificationEmail}`);
          await this.emailService.sendDowntimeNotification(
            website.notificationEmail,
            website.url,
            Math.floor(downtimeDuration)
          );

          console.log(`[MonitoringService] Sending Slack notification`);
          await this.slackService.sendDowntimeNotification(
            website.url,
            Math.floor(downtimeDuration)
          );

          newStatus.notificationSent = true;
          this.websites.set(websiteId, newStatus);
          console.log(`[MonitoringService] ✅ Notifications sent successfully`);
        } catch (error) {
          console.error(`[MonitoringService] ❌ Error sending notifications:`, error);
          if (error instanceof Error) {
            console.error(`[MonitoringService] Error details: ${error.message}`);
            console.error(`[MonitoringService] Stack trace: ${error.stack}`);
          }
        }
      } else {
        console.log(`[MonitoringService] No notifications needed:`);
        console.log(`[MonitoringService] - Downtime threshold met: ${downtimeDuration >= this.DOWNTIME_THRESHOLD}`);
        console.log(`[MonitoringService] - Notification already sent: ${newStatus.notificationSent}`);
      }
    }

    console.log(`[MonitoringService] ===== Status Update Complete =====\n`);
  }

  getWebsiteStatus(websiteId: string): WebsiteStatus | undefined {
    const status = this.websites.get(websiteId);
    console.log(`[MonitoringService] Getting status for website ${websiteId}:`, status ? 'Found' : 'Not found');
    return status;
  }

  getAllWebsiteStatuses(): WebsiteStatus[] {
    const statuses = Array.from(this.websites.values());
    console.log(`[MonitoringService] Getting all website statuses: ${statuses.length} websites found`);
    return statuses;
  }
} 