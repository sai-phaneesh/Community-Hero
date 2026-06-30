import crypto from "crypto";
import { SurveyRepository } from "../domain/repositories/survey.repository";
import { UserRepository } from "../domain/repositories/user.repository";
import { NotificationRepository } from "../domain/repositories/notification.repository";
import { Survey, Notification } from "../../types";

export class SurveyUseCase {
  constructor(
    private surveyRepo: SurveyRepository,
    private userRepo: UserRepository,
    private notificationRepo: NotificationRepository
  ) {}

  private async notifyAdmins(title: string, message: string) {
    try {
      const users = await this.userRepo.findAll();
      const admins = users.filter((u) => u.role === "admin");
      for (const admin of admins) {
        await this.createNotification(admin.id, title, message);
      }
    } catch (err) {
      console.error("Failed to notify admins:", err);
    }
  }

  private async createNotification(userId: string, title: string, message: string) {
    const notification: Notification = {
      id: crypto.randomUUID(),
      userId,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await this.notificationRepo.create(notification);
  }

  async listSurveys(): Promise<Survey[]> {
    return await this.surveyRepo.findAll();
  }

  async submitSurvey(data: {
    residentId: string;
    residentName?: string;
    overallHappiness: number;
    localServicesRating?: number;
    roadQualityRating?: number;
    cleanlinessRating?: number;
    feedbackText?: string;
  }): Promise<Survey> {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthStr = `${months[new Date().getMonth()]} ${new Date().getFullYear()}`;

    const duplicate = await this.surveyRepo.findByResidentAndMonth(data.residentId, currentMonthStr);
    if (duplicate) {
      throw new Error("You have already completed this month's feedback survey.");
    }

    const rName = data.residentName || "Resident";
    const oHappiness = Number(data.overallHappiness);
    const lServices = Number(data.localServicesRating || 3);
    const rQuality = Number(data.roadQualityRating || 3);
    const cCleanliness = Number(data.cleanlinessRating || 3);
    const fText = data.feedbackText || "";

    const newSurvey: Survey = {
      id: crypto.randomUUID(),
      month: currentMonthStr,
      residentId: data.residentId,
      residentName: rName,
      overallHappiness: oHappiness,
      localServicesRating: lServices,
      roadQualityRating: rQuality,
      cleanlinessRating: cCleanliness,
      feedbackText: fText,
      date: new Date().toISOString(),
    };

    const saved = await this.surveyRepo.create(newSurvey);

    // Award +30 points to the resident for completing the monthly survey
    await this.userRepo.rewardPoints(data.residentId, 30);

    await this.notifyAdmins(
      "New Survey Feedback Received",
      `A new monthly survey feedback was submitted by resident '${rName}'.`
    );

    return saved;
  }
}
