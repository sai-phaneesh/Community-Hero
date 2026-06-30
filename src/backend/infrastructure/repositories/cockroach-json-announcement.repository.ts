import { Pool } from "pg";
import { AnnouncementRepository } from "../../domain/repositories/announcement.repository";
import { Announcement } from "../../../types";

export class CockroachJsonAnnouncementRepository implements AnnouncementRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private rowToAnnouncement(row: any): Announcement {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      scheduledDate: row.scheduled_date || undefined,
      startTime: row.start_time || undefined,
      endTime: row.end_time || undefined,
      affectedAreas: row.affected_areas || [],
      createdAt: row.created_at.toISOString ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
      creatorId: row.creator_id,
    };
  }

  async create(announcement: Announcement): Promise<Announcement> {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO announcements (
            id, title, description, category, scheduled_date, start_time, end_time, affected_areas, created_at, creator_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            announcement.id,
            announcement.title,
            announcement.description,
            announcement.category,
            announcement.scheduledDate || null,
            announcement.startTime || null,
            announcement.endTime || null,
            announcement.affectedAreas || [],
            new Date(announcement.createdAt),
            announcement.creatorId,
          ]
        );
        return announcement;
      } catch (err) {
        console.error("[AnnouncementRepository Error] create failed:", err);
        throw new Error("Failed to create announcement.");
      }
    }
    const local = this.readLocalDB();
    local.announcements = local.announcements || [];
    local.announcements.push(announcement);
    this.writeLocalDB(local);
    return announcement;
  }

  async findAll(): Promise<Announcement[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM announcements ORDER BY created_at DESC");
        return res.rows.map(row => this.rowToAnnouncement(row));
      } catch (err) {
        console.error("[AnnouncementRepository Error] findAll failed:", err);
        throw new Error("Failed to retrieve announcements.");
      }
    }
    const local = this.readLocalDB();
    local.announcements = local.announcements || [];
    return local.announcements;
  }

  async delete(id: string): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.query("DELETE FROM announcements WHERE id = $1", [id]);
        return;
      } catch (err) {
        console.error("[AnnouncementRepository Error] delete failed:", err);
        throw new Error("Failed to delete announcement.");
      }
    }
    const local = this.readLocalDB();
    local.announcements = local.announcements || [];
    local.announcements = local.announcements.filter((a: any) => a.id !== id);
    this.writeLocalDB(local);
  }
}
