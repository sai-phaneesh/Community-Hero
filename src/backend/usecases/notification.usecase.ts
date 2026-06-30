import crypto from "crypto";
import { NotificationRepository } from "../domain/repositories/notification.repository";
import { UserRepository } from "../domain/repositories/user.repository";
import { Notification } from "../../types";

export class NotificationUseCase {
  constructor(
    private notificationRepo: NotificationRepository,
    private userRepo: UserRepository
  ) {}

  async listNotifications(userId: string): Promise<Notification[]> {
    return await this.notificationRepo.findByUserId(userId);
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationRepo.markAsRead(id);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepo.markAllRead(userId);
  }

  async createNotification(
    userIdOrObj: string | { userId: string; title: string; message: string; targetIssueId?: string; targetType?: Notification["targetType"] },
    title?: string,
    message?: string,
    targetIssueId?: string,
    targetType?: Notification["targetType"]
  ): Promise<void> {
    let finalUserId: string;
    let finalTitle: string;
    let finalMessage: string;
    let finalTargetIssueId: string | undefined;
    let finalTargetType: Notification["targetType"] | undefined;

    if (typeof userIdOrObj === "object") {
      finalUserId = userIdOrObj.userId;
      finalTitle = userIdOrObj.title;
      finalMessage = userIdOrObj.message;
      finalTargetIssueId = userIdOrObj.targetIssueId;
      finalTargetType = userIdOrObj.targetType;
    } else {
      finalUserId = userIdOrObj;
      finalTitle = title!;
      finalMessage = message!;
      finalTargetIssueId = targetIssueId;
      finalTargetType = targetType;
    }

    await this.notificationRepo.create({
      id: crypto.randomUUID(),
      userId: finalUserId,
      title: finalTitle,
      message: finalMessage,
      read: false,
      createdAt: new Date().toISOString(),
      targetIssueId: finalTargetIssueId,
      targetType: finalTargetType
    });
  }

  async broadcastNotification(title: string, message: string): Promise<void> {
    const allUsers = await this.userRepo.findAll();
    for (const u of allUsers) {
      await this.notificationRepo.create({
        id: crypto.randomUUID(),
        userId: u.id,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }
}
