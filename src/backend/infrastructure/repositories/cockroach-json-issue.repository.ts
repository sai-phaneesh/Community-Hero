import { Pool } from "pg";
import { IssueRepository } from "../../domain/repositories/issue.repository";
import { Issue } from "../../../types";

export class CockroachJsonIssueRepository implements IssueRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private mapRowToIssue(row: any): Issue {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      capabilityId: row.capability_id || undefined,
      severity: row.severity,
      wasteCaused: row.waste_caused,
      status: row.status,
      reporterId: row.reporter_id,
      reporterName: row.reporter_name,
      reporterHouse: row.reporter_house,
      upvotes: row.upvotes || [],
      createdAt: new Date(row.created_at).toISOString(),
      daysUnattended: row.days_unattended,
      assignedContractorId: row.assigned_contractor_id || undefined,
      assignedContractorName: row.assigned_contractor_name || undefined,
      resolutionNotes: row.resolution_notes || undefined,
      priceQuote: row.price_quote ? Number(row.price_quote) : undefined,
      isPaid: row.is_paid || false,
      beforeImages: row.before_images || [],
      beforeVideos: row.before_videos || [],
      afterImages: row.after_images || [],
      afterVideos: row.after_videos || [],
      latitude: row.latitude ? Number(row.latitude) : 12.9716,
      longitude: row.longitude ? Number(row.longitude) : 77.5946,
      followers: row.followers || [],
      duplicateOfIssueId: row.duplicate_of_issue_id || undefined,
      isReviewed: row.is_reviewed || false,
      displayId: row.display_id || undefined,
    };
  }

  async findById(id: string): Promise<Issue | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM issues WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        return this.mapRowToIssue(res.rows[0]);
      } catch (err) {
        console.error("[IssueRepository Database Error] findById failed:", err);
        throw new Error("Database error while searching neighborhood report.");
      }
    }
    const local = this.readLocalDB();
    const issue = local.issues.find((iss: any) => iss.id === id);
    return issue ? {
      ...issue,
      latitude: issue.latitude || 12.9716,
      longitude: issue.longitude || 77.5946,
      followers: issue.followers || [issue.reporterId],
    } : null;
  }

  async findAll(): Promise<Issue[]> {
    const now = new Date();
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM issues");
        const mapped: Issue[] = [];

        for (const row of res.rows) {
          let daysUnattended = row.days_unattended;
          if (row.status !== "Resolved") {
            const created = new Date(row.created_at);
            const diffTime = Math.abs(now.getTime() - created.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysUnattended = diffDays || 1;

            // Update dynamically in database
            await this.pool.query("UPDATE issues SET days_unattended = $1 WHERE id = $2", [daysUnattended, row.id]);
          }
          
          const updatedRow = { ...row, days_unattended: daysUnattended };
          mapped.push(this.mapRowToIssue(updatedRow));
        }
        return mapped;
      } catch (err) {
        console.error("[IssueRepository Database Error] findAll failed:", err);
        throw new Error("Database error while retrieving neighborhood reports.");
      }
    }

    const local = this.readLocalDB();
    const updated = local.issues.map((iss: any) => {
      if (iss.status !== "Resolved") {
        const created = new Date(iss.createdAt);
        const diffTime = Math.abs(now.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        iss.daysUnattended = diffDays || 1;
      }
      iss.latitude = iss.latitude || 12.9716;
      iss.longitude = iss.longitude || 77.5946;
      iss.followers = iss.followers || [iss.reporterId];
      return iss;
    });
    local.issues = updated;
    this.writeLocalDB(local);
    return updated;
  }

  async findAllPaginated(limit: number, cursor?: string): Promise<{ items: Issue[], nextCursor?: string }> {
    const allIssues = await this.findAll();
    // Sort descending by createdAt
    const sorted = allIssues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    let startIndex = 0;
    if (cursor) {
      const index = sorted.findIndex(i => i.id === cursor);
      if (index >= 0) {
        startIndex = index + 1; // start after the cursor
      }
    }
    
    const items = sorted.slice(startIndex, startIndex + limit);
    let nextCursor: string | undefined = undefined;
    if (startIndex + limit < sorted.length) {
      nextCursor = items[items.length - 1].id;
    }
    
    return { items, nextCursor };
  }

  async create(issue: Issue): Promise<Issue> {
    const latitude = issue.latitude || 12.9716;
    const longitude = issue.longitude || 77.5946;
    const followers = issue.followers || [issue.reporterId];

    if (this.pool) {
      try {
        let displayId = issue.displayId;
        if (!displayId) {
          const countRes = await this.pool.query("SELECT COUNT(*) FROM issues");
          const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
          displayId = `CH-${nextNum.toString().padStart(4, "0")}`;
        }

        await this.pool.query(
          `INSERT INTO issues (
            id, display_id, title, description, category, capability_id, severity, waste_caused, status, 
            reporter_id, reporter_name, reporter_house, upvotes, created_at, days_unattended,
            assigned_contractor_id, assigned_contractor_name, resolution_notes, price_quote, is_paid,
            before_images, before_videos, after_images, after_videos, latitude, longitude, followers, duplicate_of_issue_id, is_reviewed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
          [
            issue.id,
            displayId,
            issue.title,
            issue.description,
            issue.category,
            issue.capabilityId || null,
            issue.severity,
            issue.wasteCaused,
            issue.status,
            issue.reporterId,
            issue.reporterName,
            issue.reporterHouse,
            issue.upvotes,
            new Date(issue.createdAt),
            issue.daysUnattended,
            issue.assignedContractorId || null,
            issue.assignedContractorName || null,
            issue.resolutionNotes || null,
            issue.priceQuote || null,
            issue.isPaid || false,
            issue.beforeImages || [],
            issue.beforeVideos || [],
            issue.afterImages || [],
            issue.afterVideos || [],
            latitude,
            longitude,
            followers,
            issue.duplicateOfIssueId || null,
            issue.isReviewed || false,
          ]
        );
        return { ...issue, latitude, longitude, followers, displayId };
      } catch (err) {
        console.error("[IssueRepository Database Error] create failed:", err);
        throw new Error("Database error while creating neighborhood report.");
      }
    }

    const local = this.readLocalDB();
    let displayId = issue.displayId;
    if (!displayId) {
      const nextNum = local.issues.length + 1;
      displayId = `CH-${nextNum.toString().padStart(4, "0")}`;
    }
    const newIssue = { ...issue, latitude, longitude, followers, displayId };
    local.issues.push(newIssue);
    this.writeLocalDB(local);
    return newIssue;
  }

  async update(issue: Issue): Promise<Issue> {
    const latitude = issue.latitude || 12.9716;
    const longitude = issue.longitude || 77.5946;
    const followers = issue.followers || [issue.reporterId];

    if (this.pool) {
      try {
        await this.pool.query(
          `UPDATE issues SET 
            title = $1, description = $2, category = $3, capability_id = $4, severity = $5, waste_caused = $6, 
            status = $7, reporter_id = $8, reporter_name = $9, reporter_house = $10, 
            upvotes = $11, created_at = $12, days_unattended = $13, 
            assigned_contractor_id = $14, assigned_contractor_name = $15, 
            resolution_notes = $16, price_quote = $17, is_paid = $18,
            before_images = $19, before_videos = $20, after_images = $21, after_videos = $22,
            latitude = $23, longitude = $24, followers = $25, duplicate_of_issue_id = $26, is_reviewed = $27,
            display_id = $28
          WHERE id = $29`,
          [
            issue.title,
            issue.description,
            issue.category,
            issue.capabilityId || null,
            issue.severity,
            issue.wasteCaused,
            issue.status,
            issue.reporterId,
            issue.reporterName,
            issue.reporterHouse,
            issue.upvotes,
            new Date(issue.createdAt),
            issue.daysUnattended,
            issue.assignedContractorId || null,
            issue.assignedContractorName || null,
            issue.resolutionNotes || null,
            issue.priceQuote || null,
            issue.isPaid || false,
            issue.beforeImages || [],
            issue.beforeVideos || [],
            issue.afterImages || [],
            issue.afterVideos || [],
            latitude,
            longitude,
            followers,
            issue.duplicateOfIssueId || null,
            issue.isReviewed || false,
            issue.displayId || null,
            issue.id,
          ]
        );
        return { ...issue, latitude, longitude, followers };
      } catch (err) {
        console.error("[IssueRepository Database Error] update failed:", err);
        throw new Error("Database error while updating neighborhood report.");
      }
    }

    const local = this.readLocalDB();
    const index = local.issues.findIndex((iss: any) => iss.id === issue.id);
    if (index !== -1) {
      const displayId = local.issues[index].displayId || issue.displayId;
      local.issues[index] = { ...issue, latitude, longitude, followers, displayId };
      this.writeLocalDB(local);
      return local.issues[index];
    }
    return issue;
  }

  async delete(id: string): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.query("UPDATE issues SET duplicate_of_issue_id = NULL WHERE duplicate_of_issue_id = $1", [id]);
        await this.pool.query("DELETE FROM notifications WHERE target_issue_id = $1", [id]);
        await this.pool.query("DELETE FROM issues WHERE id = $1", [id]);
        return;
      } catch (err) {
        console.error("[IssueRepository Database Error] delete failed:", err);
        throw new Error("Database error while deleting neighborhood report.");
      }
    }

    const local = this.readLocalDB();
    local.issues = local.issues || [];
    local.notifications = local.notifications || [];
    local.issueMessages = local.issueMessages || [];
    local.issueTimelines = local.issueTimelines || [];
    local.bids = local.bids || [];
    local.bidComments = local.bidComments || [];
    local.payments = local.payments || [];
    local.reviews = local.reviews || [];

    const deletedBidIds = new Set(
      local.bids.filter((bid: any) => bid.issueId === id).map((bid: any) => bid.id),
    );

    local.issues = local.issues
      .filter((iss: any) => iss.id !== id)
      .map((iss: any) =>
        iss.duplicateOfIssueId === id
          ? { ...iss, duplicateOfIssueId: undefined }
          : iss,
      );
    local.notifications = local.notifications.filter((n: any) => n.targetIssueId !== id);
    local.issueMessages = local.issueMessages.filter((m: any) => m.issueId !== id);
    local.issueTimelines = local.issueTimelines.filter((t: any) => t.issueId !== id);
    local.bids = local.bids.filter((bid: any) => bid.issueId !== id);
    local.bidComments = local.bidComments.filter((c: any) => !deletedBidIds.has(c.bidId));
    local.payments = local.payments.filter((p: any) => p.issueId !== id);
    local.reviews = local.reviews.filter((r: any) => r.issueId !== id);

    this.writeLocalDB(local);
  }
}
