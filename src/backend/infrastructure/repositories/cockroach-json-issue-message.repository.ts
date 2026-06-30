import { Pool } from "pg";
import { IssueMessageRepository } from "../../domain/repositories/issue-message.repository";
import { IssueChatMessage } from "../../../types";

export class CockroachJsonIssueMessageRepository implements IssueMessageRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private rowToMessage(row: any): IssueChatMessage {
    return {
      id: row.id,
      issueId: row.issue_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      message: row.message,
      createdAt: row.created_at.toISOString ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    };
  }

  async create(msg: IssueChatMessage): Promise<IssueChatMessage> {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO issue_messages (
            id, issue_id, sender_id, sender_name, sender_role, message, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            msg.id,
            msg.issueId,
            msg.senderId,
            msg.senderName,
            msg.senderRole,
            msg.message,
            new Date(msg.createdAt),
          ]
        );
        return msg;
      } catch (err) {
        console.error("[IssueMessageRepository Error] create failed:", err);
        throw new Error("Failed to send chat message.");
      }
    }
    const local = this.readLocalDB();
    local.issueMessages = local.issueMessages || [];
    local.issueMessages.push(msg);
    this.writeLocalDB(local);
    return msg;
  }

  async findByIssueId(issueId: string): Promise<IssueChatMessage[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM issue_messages WHERE issue_id = $1 ORDER BY created_at ASC", [issueId]);
        return res.rows.map(row => this.rowToMessage(row));
      } catch (err) {
        console.error("[IssueMessageRepository Error] findByIssueId failed:", err);
        throw new Error("Failed to retrieve issue chat messages.");
      }
    }
    const local = this.readLocalDB();
    local.issueMessages = local.issueMessages || [];
    return local.issueMessages.filter((m: any) => m.issueId === issueId);
  }
}
