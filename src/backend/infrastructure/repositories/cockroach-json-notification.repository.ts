import { Pool } from "pg";
import { NotificationRepository } from "../../domain/repositories/notification.repository";
import { Notification } from "../../../types";

export class CockroachJsonNotificationRepository implements NotificationRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      message: row.message,
      read: row.read,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
          [userId]
        );
        return res.rows.map((row) => this.mapRowToNotification(row));
      } catch (err) {
        console.error("[NotificationRepository Database Error] findByUserId failed:", err);
        throw new Error("Database error while retrieving notifications.");
      }
    }
    const local = this.readLocalDB();
    return local.notifications.filter((n: any) => n.userId === userId);
  }

  async findById(id: string): Promise<Notification | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM notifications WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        return this.mapRowToNotification(res.rows[0]);
      } catch (err) {
        console.error("[NotificationRepository Database Error] findById failed:", err);
        throw new Error("Database error while searching notification.");
      }
    }
    const local = this.readLocalDB();
    const notification = local.notifications.find((n: any) => n.id === id);
    return notification || null;
  }

  async create(notification: Notification): Promise<Notification> {
    if (this.pool) {
      try {
        await this.pool.query(
          "INSERT INTO notifications (id, user_id, title, message, read, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            notification.id,
            notification.userId,
            notification.title,
            notification.message,
            notification.read,
            new Date(notification.createdAt),
          ]
        );
        return notification;
      } catch (err) {
        console.error("[NotificationRepository Database Error] create failed:", err);
        throw new Error("Database error while saving notification.");
      }
    }
    const local = this.readLocalDB();
    local.notifications.push(notification);
    this.writeLocalDB(local);
    return notification;
  }

  async markAsRead(id: string): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.query("UPDATE notifications SET read = $1 WHERE id = $2", [true, id]);
        return;
      } catch (err) {
        console.error("[NotificationRepository Database Error] markAsRead failed:", err);
        throw new Error("Database error while updating notification state.");
      }
    }
    const local = this.readLocalDB();
    const index = local.notifications.findIndex((n: any) => n.id === id);
    if (index !== -1) {
      local.notifications[index].read = true;
      this.writeLocalDB(local);
    }
  }

  async markAllRead(userId: string): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.query("UPDATE notifications SET read = $1 WHERE user_id = $2", [true, userId]);
        return;
      } catch (err) {
        console.error("[NotificationRepository Database Error] markAllRead failed:", err);
        throw new Error("Database error while updating notification state.");
      }
    }
    const local = this.readLocalDB();
    let updated = false;
    local.notifications.forEach((n: any) => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        updated = true;
      }
    });
    if (updated) {
      this.writeLocalDB(local);
    }
  }
}
