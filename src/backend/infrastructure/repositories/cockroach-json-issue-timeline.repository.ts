import { Pool } from "pg";
import { IssueTimelineRepository } from "../../domain/repositories/issue-timeline.repository";
import { IssueTimelineEvent } from "../../../types";

export class CockroachJsonIssueTimelineRepository implements IssueTimelineRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private rowToEvent(row: any): IssueTimelineEvent {
    return {
      id: row.id,
      issueId: row.issue_id,
      title: row.title,
      description: row.description,
      createdAt: row.created_at.toISOString ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
      creatorId: row.creator_id || undefined,
      creatorName: row.creator_name || undefined,
      creatorRole: row.creator_role || undefined,
      isSystem: row.is_system,
    };
  }

  async create(event: IssueTimelineEvent): Promise<IssueTimelineEvent> {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO issue_timeline (
            id, issue_id, title, description, created_at, creator_id, creator_name, creator_role, is_system
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            event.id,
            event.issueId,
            event.title,
            event.description,
            new Date(event.createdAt),
            event.creatorId || null,
            event.creatorName || null,
            event.creatorRole || null,
            event.isSystem,
          ]
        );
        return event;
      } catch (err) {
        console.error("[IssueTimelineRepository Error] create failed:", err);
        throw new Error("Failed to create timeline event.");
      }
    }
    const local = this.readLocalDB();
    local.issueTimelines = local.issueTimelines || [];
    local.issueTimelines.push(event);
    this.writeLocalDB(local);
    return event;
  }

  async findByIssueId(issueId: string): Promise<IssueTimelineEvent[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM issue_timeline WHERE issue_id = $1 ORDER BY created_at ASC",
          [issueId]
        );
        return res.rows.map(row => this.rowToEvent(row));
      } catch (err) {
        console.error("[IssueTimelineRepository Error] findByIssueId failed:", err);
        throw new Error("Failed to load timeline events.");
      }
    }
    const local = this.readLocalDB();
    local.issueTimelines = local.issueTimelines || [];
    return local.issueTimelines
      .filter((item: any) => item.issueId === issueId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}
