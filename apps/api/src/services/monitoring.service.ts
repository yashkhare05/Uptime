import { EmailService } from './email.service';
import { prismaClient } from 'db/client';

interface WebsiteStatus {
  url: string;
  lastStatus: 'good' | 'bad';
  lastStatusChange: Date;
  notificationSent: boolean;
}

export class MonitoringService {
  private websiteStatuses: Map<string, WebsiteStatus> = new Map();
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
    console.log('[MonitoringService] Initialized with EmailService');
  }

  async updateWebsiteStatus(websiteId: string, status: 'good' | 'bad') {
    console.log(`[MonitoringService] Updating status for website ${websiteId} to ${status}`);
    
    const website = await prismaClient.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        url: true,
        notificationEmail: true
      }
    });

    if (!website) {
      console.log(`[MonitoringService] Website ${websiteId} not found`);
      return;
    }

    if (!website.notificationEmail) {
      console.log(`[MonitoringService] No notification email set for website ${websiteId}`);
      return;
    }

    console.log(`[MonitoringService] Found website: ${website.url} with notification email: ${website.notificationEmail}`);

    const currentStatus = this.websiteStatuses.get(websiteId);
    const now = new Date();

    if (!currentStatus) {
      console.log(`[MonitoringService] First status check for website ${websiteId}`);
      this.websiteStatuses.set(websiteId, {
        url: website.url,
        lastStatus: status,
        lastStatusChange: now,
        notificationSent: false,
      });
      return;
    }

    if (currentStatus.lastStatus !== status) {
      console.log(`[MonitoringService] Status changed for ${websiteId} from ${currentStatus.lastStatus} to ${status}`);
      if (status === 'bad') {
        console.log(`[MonitoringService] Website ${websiteId} just went down`);
        this.websiteStatuses.set(websiteId, {
          ...currentStatus,
          lastStatus: status,
          lastStatusChange: now,
          notificationSent: false,
        });
      } else {
        console.log(`[MonitoringService] Website ${websiteId} is back up`);
        this.websiteStatuses.set(websiteId, {
          ...currentStatus,
          lastStatus: status,
          lastStatusChange: now,
          notificationSent: false,
        });
      }
    } else if (status === 'bad') {
      const downtimeDuration = (now.getTime() - currentStatus.lastStatusChange.getTime()) / (1000 * 60); // in minutes
      console.log(`[MonitoringService] Website ${websiteId} still down for ${downtimeDuration.toFixed(1)} minutes`);
      
      if (downtimeDuration >= 2 && !currentStatus.notificationSent) {
        console.log(`[MonitoringService] Triggering notification for website ${websiteId}`);
        try {
          await this.emailService.sendDowntimeNotification(
            website.notificationEmail,
            website.url,
            Math.floor(downtimeDuration)
          );
          
          this.websiteStatuses.set(websiteId, {
            ...currentStatus,
            notificationSent: true,
          });
          console.log(`[MonitoringService] Notification sent and status updated for website ${websiteId}`);
        } catch (error) {
          console.error(`[MonitoringService] Failed to send notification for website ${websiteId}:`, error);
        }
      }
    }
  }
} 