import crypto from "crypto";
import { CampaignRepository } from "../domain/repositories/campaign.repository";
import { UserRepository } from "../domain/repositories/user.repository";
import { NotificationRepository } from "../domain/repositories/notification.repository";
import { Campaign, Notification } from "../../types";

export class CampaignUseCase {
  constructor(
    private campaignRepo: CampaignRepository,
    private userRepo: UserRepository,
    private notificationRepo: NotificationRepository
  ) {}

  async listCampaigns(): Promise<Campaign[]> {
    return await this.campaignRepo.findAll();
  }

  async createCampaign(data: {
    title: string;
    description: string;
    category: "Cleaning" | "Planting" | "Safety" | "Social" | "Other";
    creatorId: string;
    creatorName: string;
    location: string;
    date: string;
    maxAttendees?: number;
  }): Promise<Campaign> {
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      category: data.category,
      creatorId: data.creatorId,
      creatorName: data.creatorName,
      location: data.location,
      date: data.date,
      createdAt: new Date().toISOString(),
      attendees: [data.creatorId], // Creator automatically joins
      maxAttendees: data.maxAttendees,
      status: "Upcoming",
    };

    const saved = await this.campaignRepo.create(campaign);

    // Broadcast notification to all neighbors
    try {
      const allUsers = await this.userRepo.findAll();
      for (const u of allUsers) {
        // Don't notify the creator since they created it
        if (u.id === data.creatorId) continue;

        const notif: Notification = {
          id: crypto.randomUUID(),
          userId: u.id,
          title: "New Community Campaign!",
          message: `Join the new campaign '${data.title}' scheduled for ${new Date(data.date).toLocaleDateString()}.`,
          read: false,
          createdAt: new Date().toISOString(),
        };
        await this.notificationRepo.create(notif);
      }
    } catch (err) {
      console.error("Failed to dispatch broadcast notifications for campaign:", err);
    }

    return saved;
  }

  async toggleJoinCampaign(campaignId: string, userId: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const hasJoined = campaign.attendees.includes(userId);
    if (hasJoined) {
      // Leave
      campaign.attendees = campaign.attendees.filter((id) => id !== userId);
    } else {
      // Join
      if (campaign.maxAttendees && campaign.attendees.length >= campaign.maxAttendees) {
        throw new Error("This campaign has reached its maximum RSVP capacity.");
      }
      campaign.attendees.push(userId);

      // Notify the creator of the join event
      if (campaign.creatorId !== userId) {
        try {
          const notif: Notification = {
            id: crypto.randomUUID(),
            userId: campaign.creatorId,
            title: "Someone Joined Your Campaign",
            message: `${user.name} (@${user.username || "neighbor"}) has joined your campaign '${campaign.title}'.`,
            read: false,
            createdAt: new Date().toISOString(),
          };
          await this.notificationRepo.create(notif);
        } catch (err) {
          console.error("Failed to notify campaign creator:", err);
        }
      }
    }

    return await this.campaignRepo.update(campaign);
  }
}
