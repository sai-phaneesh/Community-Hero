import { Pool } from "pg";
import { BidCommentRepository } from "../../domain/repositories/bid-comment.repository";
import { BidComment } from "../../../types";

export class CockroachJsonBidCommentRepository implements BidCommentRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private rowToComment(row: any): BidComment {
    return {
      id: row.id,
      bidId: row.bid_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      comment: row.comment,
      createdAt: row.created_at.toISOString ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    };
  }

  async create(comment: BidComment): Promise<BidComment> {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO bid_comments (
            id, bid_id, sender_id, sender_name, sender_role, comment, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            comment.id,
            comment.bidId,
            comment.senderId,
            comment.senderName,
            comment.senderRole,
            comment.comment,
            new Date(comment.createdAt),
          ]
        );
        return comment;
      } catch (err) {
        console.error("[BidCommentRepository Error] create failed:", err);
        throw new Error("Failed to post comment.");
      }
    }
    const local = this.readLocalDB();
    local.bidComments = local.bidComments || [];
    local.bidComments.push(comment);
    this.writeLocalDB(local);
    return comment;
  }

  async findByBidId(bidId: string): Promise<BidComment[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM bid_comments WHERE bid_id = $1 ORDER BY created_at ASC",
          [bidId]
        );
        return res.rows.map(row => this.rowToComment(row));
      } catch (err) {
        console.error("[BidCommentRepository Error] findByBidId failed:", err);
        throw new Error("Failed to load bid comments.");
      }
    }
    const local = this.readLocalDB();
    local.bidComments = local.bidComments || [];
    return local.bidComments
      .filter((item: any) => item.bidId === bidId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}
