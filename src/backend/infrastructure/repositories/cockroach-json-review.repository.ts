import { Pool } from "pg";
import { ReviewRepository } from "../../domain/repositories/review.repository";
import { Review } from "../../../types";

export class CockroachJsonReviewRepository implements ReviewRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private rowToReview(row: any): Review {
    return {
      id: row.id,
      issueId: row.issue_id,
      contractorId: row.contractor_id,
      reporterId: row.reporter_id,
      reporterName: row.reporter_name,
      rating: Number(row.rating),
      comment: row.comment,
      createdAt: row.created_at.toISOString ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    };
  }

  async create(review: Review): Promise<Review> {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO reviews (
            id, issue_id, contractor_id, reporter_id, reporter_name, rating, comment, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            review.id,
            review.issueId,
            review.contractorId,
            review.reporterId,
            review.reporterName,
            review.rating,
            review.comment,
            new Date(review.createdAt),
          ]
        );
        return review;
      } catch (err) {
        console.error("[ReviewRepository Error] create failed:", err);
        // Fall back or throw, we don't have migrations run yet for postgres so fallback to local JSON is essential
      }
    }
    const local = this.readLocalDB();
    local.reviews = local.reviews || [];
    local.reviews.push(review);
    this.writeLocalDB(local);
    return review;
  }

  async findByContractorId(contractorId: string): Promise<Review[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM reviews WHERE contractor_id = $1 ORDER BY created_at DESC", [contractorId]);
        return res.rows.map(row => this.rowToReview(row));
      } catch (err) {
        console.error("[ReviewRepository Error] findByContractorId failed:", err);
      }
    }
    const local = this.readLocalDB();
    local.reviews = local.reviews || [];
    return local.reviews.filter((item: any) => item.contractorId === contractorId);
  }

  async findByIssueId(issueId: string): Promise<Review | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM reviews WHERE issue_id = $1", [issueId]);
        if (res.rows.length === 0) return null;
        return this.rowToReview(res.rows[0]);
      } catch (err) {
        console.error("[ReviewRepository Error] findByIssueId failed:", err);
      }
    }
    const local = this.readLocalDB();
    local.reviews = local.reviews || [];
    const found = local.reviews.find((item: any) => item.issueId === issueId);
    return found || null;
  }
}
