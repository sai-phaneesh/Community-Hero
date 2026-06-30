import { Pool } from "pg";
import { BidRepository } from "../../domain/repositories/bid.repository";
import { Bid } from "../../../types";

export class CockroachJsonBidRepository implements BidRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private rowToBid(row: any): Bid {
    return {
      id: row.id,
      issueId: row.issue_id,
      contractorId: row.contractor_id,
      contractorName: row.contractor_name,
      materialsCost: Number(row.materials_cost),
      laborCost: Number(row.labor_cost),
      estimatedHours: Number(row.estimated_hours),
      proposalNotes: row.proposal_notes,
      status: row.status,
      counterAmount: row.counter_amount !== null && row.counter_amount !== undefined ? Number(row.counter_amount) : undefined,
      counterStatus: row.counter_status || undefined,
      createdAt: row.created_at.toISOString ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    };
  }

  async create(bid: Bid): Promise<Bid> {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO bids (
            id, issue_id, contractor_id, contractor_name, materials_cost, labor_cost, estimated_hours, proposal_notes, status, counter_amount, counter_status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            bid.id,
            bid.issueId,
            bid.contractorId,
            bid.contractorName,
            bid.materialsCost,
            bid.laborCost,
            bid.estimatedHours,
            bid.proposalNotes,
            bid.status,
            bid.counterAmount || null,
            bid.counterStatus || null,
            new Date(bid.createdAt),
          ]
        );
        return bid;
      } catch (err) {
        console.error("[BidRepository Error] create failed:", err);
        throw new Error("Failed to submit bid proposal.");
      }
    }
    const local = this.readLocalDB();
    local.bids = local.bids || [];
    local.bids.push(bid);
    this.writeLocalDB(local);
    return bid;
  }

  async findById(id: string): Promise<Bid | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM bids WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        return this.rowToBid(res.rows[0]);
      } catch (err) {
        console.error("[BidRepository Error] findById failed:", err);
        throw new Error("Failed to find bid.");
      }
    }
    const local = this.readLocalDB();
    local.bids = local.bids || [];
    const b = local.bids.find((item: any) => item.id === id);
    return b || null;
  }

  async findByIssueId(issueId: string): Promise<Bid[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM bids WHERE issue_id = $1 ORDER BY created_at DESC", [issueId]);
        return res.rows.map(row => this.rowToBid(row));
      } catch (err) {
        console.error("[BidRepository Error] findByIssueId failed:", err);
        throw new Error("Failed to load bids for issue.");
      }
    }
    const local = this.readLocalDB();
    local.bids = local.bids || [];
    return local.bids.filter((item: any) => item.issueId === issueId);
  }

  async findByContractorId(contractorId: string): Promise<Bid[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM bids WHERE contractor_id = $1 ORDER BY created_at DESC", [contractorId]);
        return res.rows.map(row => this.rowToBid(row));
      } catch (err) {
        console.error("[BidRepository Error] findByContractorId failed:", err);
        throw new Error("Failed to load bids for contractor.");
      }
    }
    const local = this.readLocalDB();
    local.bids = local.bids || [];
    return local.bids.filter((item: any) => item.contractorId === contractorId);
  }

  async update(bid: Bid): Promise<Bid> {
    if (this.pool) {
      try {
        await this.pool.query(
          `UPDATE bids SET status = $1, counter_amount = $2, counter_status = $3 WHERE id = $4`,
          [bid.status, bid.counterAmount || null, bid.counterStatus || null, bid.id]
        );
        return bid;
      } catch (err) {
        console.error("[BidRepository Error] update failed:", err);
        throw new Error("Failed to update bid status.");
      }
    }
    const local = this.readLocalDB();
    local.bids = local.bids || [];
    const idx = local.bids.findIndex((item: any) => item.id === bid.id);
    if (idx !== -1) {
      local.bids[idx] = bid;
      this.writeLocalDB(local);
    }
    return bid;
  }

  async delete(id: string): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.query("DELETE FROM bids WHERE id = $1", [id]);
        return;
      } catch (err) {
        console.error("[BidRepository Error] delete failed:", err);
        throw new Error("Failed to delete bid.");
      }
    }
    const local = this.readLocalDB();
    local.bids = local.bids || [];
    local.bids = local.bids.filter((item: any) => item.id !== id);
    this.writeLocalDB(local);
  }
}
