import { Pool } from "pg";
import { CampaignRepository } from "../../domain/repositories/campaign.repository";
import { Campaign } from "../../../types";

export class CockroachJsonCampaignRepository implements CampaignRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private mapRowToCampaign(row: any): Campaign {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category as any,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      location: row.location,
      date: row.date,
      createdAt: new Date(row.created_at).toISOString(),
      attendees: row.attendees || [],
      maxAttendees: row.max_attendees ? parseInt(row.max_attendees, 10) : undefined,
      status: row.status as any,
    };
  }

  async findAll(): Promise<Campaign[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM campaigns ORDER BY date ASC");
        return res.rows.map((row) => this.mapRowToCampaign(row));
      } catch (err) {
        console.error("[CampaignRepository Database Error] findAll failed:", err);
        throw new Error("Database error while retrieving campaigns.");
      }
    }
    const local = this.readLocalDB();
    return local.campaigns || [];
  }

  async findById(id: string): Promise<Campaign | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM campaigns WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        return this.mapRowToCampaign(res.rows[0]);
      } catch (err) {
        console.error("[CampaignRepository Database Error] findById failed:", err);
        throw new Error("Database error while checking campaign ID.");
      }
    }
    const local = this.readLocalDB();
    const c = (local.campaigns || []).find((x: any) => x.id === id);
    return c || null;
  }

  async create(campaign: Campaign): Promise<Campaign> {
    if (this.pool) {
      try {
        await this.pool.query(
          "INSERT INTO campaigns (id, title, description, category, creator_id, creator_name, location, date, created_at, attendees, max_attendees, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
          [
            campaign.id,
            campaign.title,
            campaign.description,
            campaign.category,
            campaign.creatorId,
            campaign.creatorName,
            campaign.location,
            campaign.date,
            new Date(campaign.createdAt),
            campaign.attendees,
            campaign.maxAttendees || null,
            campaign.status,
          ]
        );
        return campaign;
      } catch (err) {
        console.error("[CampaignRepository Database Error] create failed:", err);
        throw new Error("Database error while creating campaign.");
      }
    }
    const local = this.readLocalDB();
    if (!local.campaigns) local.campaigns = [];
    local.campaigns.push(campaign);
    this.writeLocalDB(local);
    return campaign;
  }

  async update(campaign: Campaign): Promise<Campaign> {
    if (this.pool) {
      try {
        await this.pool.query(
          "UPDATE campaigns SET title = $1, description = $2, category = $3, creator_id = $4, creator_name = $5, location = $6, date = $7, attendees = $8, max_attendees = $9, status = $10 WHERE id = $11",
          [
            campaign.title,
            campaign.description,
            campaign.category,
            campaign.creatorId,
            campaign.creatorName,
            campaign.location,
            campaign.date,
            campaign.attendees,
            campaign.maxAttendees || null,
            campaign.status,
            campaign.id,
          ]
        );
        return campaign;
      } catch (err) {
        console.error("[CampaignRepository Database Error] update failed:", err);
        throw new Error("Database error while updating campaign.");
      }
    }
    const local = this.readLocalDB();
    if (!local.campaigns) local.campaigns = [];
    const idx = local.campaigns.findIndex((x: any) => x.id === campaign.id);
    if (idx !== -1) {
      local.campaigns[idx] = campaign;
      this.writeLocalDB(local);
    }
    return campaign;
  }
}
