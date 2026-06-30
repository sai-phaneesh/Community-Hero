import { Notification } from "../../../types";

export interface NotificationRepository {
  findByUserId(userId: string): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  create(notification: Notification): Promise<Notification>;
  markAsRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}
