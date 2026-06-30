import { Pool } from "pg";
import { PaymentRepository } from "../../domain/repositories/payment.repository";
import { Payment } from "../../../types";

export class CockroachJsonPaymentRepository implements PaymentRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private mapRowToPayment(row: any): Payment {
    const p = {
      id: row.id,
      issueId: row.issue_id,
      contractorId: row.contractor_id,
      contractorName: row.contractor_name,
      amount: row.amount,
      method: row.method,
      status: row.status,
      proofUrl: row.proof_url || undefined,
      notes: row.notes || undefined,
      authorizedById: row.authorized_by_id,
      authorizedByName: row.authorized_by_name,
      createdAt: new Date(row.created_at).toISOString(),
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : undefined,
      dueByDays: row.due_by_days,
      resolutionDate: new Date(row.resolution_date).toISOString(),
    };
    return this.applyOverdueLogic(p);
  }

  private applyOverdueLogic(p: Payment): Payment {
    if (p.status === "Pending" || p.status === "Processing") {
      const daysSinceRes = (Date.now() - new Date(p.resolutionDate).getTime()) / (1000 * 3600 * 24);
      if (daysSinceRes > p.dueByDays) {
        return { ...p, status: "Overdue" };
      }
    }
    return p;
  }

  async create(payment: Payment): Promise<Payment> {
    if (this.pool) {
      await this.pool.query(
        `INSERT INTO payments (
          id, issue_id, contractor_id, contractor_name, amount, method, status, 
          proof_url, notes, authorized_by_id, authorized_by_name, created_at, 
          paid_at, due_by_days, resolution_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          payment.id, payment.issueId, payment.contractorId, payment.contractorName,
          payment.amount, payment.method, payment.status, payment.proofUrl || null,
          payment.notes || null, payment.authorizedById, payment.authorizedByName,
          new Date(payment.createdAt), payment.paidAt ? new Date(payment.paidAt) : null,
          payment.dueByDays, new Date(payment.resolutionDate)
        ]
      );
      return this.applyOverdueLogic(payment);
    }
    const local = this.readLocalDB();
    local.payments.push(payment);
    this.writeLocalDB(local);
    return this.applyOverdueLogic(payment);
  }

  async findById(id: string): Promise<Payment | null> {
    if (this.pool) {
      const res = await this.pool.query("SELECT * FROM payments WHERE id = $1", [id]);
      if (res.rows.length === 0) return null;
      return this.mapRowToPayment(res.rows[0]);
    }
    const local = this.readLocalDB();
    const p = local.payments.find((x: any) => x.id === id);
    return p ? this.applyOverdueLogic(p) : null;
  }

  async findByIssueId(issueId: string): Promise<Payment | null> {
    if (this.pool) {
      const res = await this.pool.query("SELECT * FROM payments WHERE issue_id = $1", [issueId]);
      if (res.rows.length === 0) return null;
      return this.mapRowToPayment(res.rows[0]);
    }
    const local = this.readLocalDB();
    const p = local.payments.find((x: any) => x.issueId === issueId);
    return p ? this.applyOverdueLogic(p) : null;
  }

  async findByContractorId(contractorId: string): Promise<Payment[]> {
    if (this.pool) {
      const res = await this.pool.query("SELECT * FROM payments WHERE contractor_id = $1 ORDER BY created_at DESC", [contractorId]);
      return res.rows.map(row => this.mapRowToPayment(row));
    }
    const local = this.readLocalDB();
    return local.payments.filter((x: any) => x.contractorId === contractorId).map((x: any) => this.applyOverdueLogic(x));
  }

  async findAll(): Promise<Payment[]> {
    if (this.pool) {
      const res = await this.pool.query("SELECT * FROM payments ORDER BY created_at DESC");
      return res.rows.map(row => this.mapRowToPayment(row));
    }
    const local = this.readLocalDB();
    return local.payments.map((x: any) => this.applyOverdueLogic(x));
  }

  async updateStatus(id: string, status: Payment["status"], paidAt?: string, proofUrl?: string, notes?: string, method?: Payment["method"]): Promise<void> {
    if (this.pool) {
      await this.pool.query(
        "UPDATE payments SET status = $1, paid_at = $2, proof_url = COALESCE($3, proof_url), notes = COALESCE($4, notes), method = COALESCE($5, method) WHERE id = $6",
        [status, paidAt ? new Date(paidAt) : null, proofUrl || null, notes || null, method || null, id]
      );
      return;
    }
    const local = this.readLocalDB();
    const idx = local.payments.findIndex((x: any) => x.id === id);
    if (idx !== -1) {
      local.payments[idx].status = status;
      if (paidAt) local.payments[idx].paidAt = paidAt;
      if (proofUrl) local.payments[idx].proofUrl = proofUrl;
      if (notes) local.payments[idx].notes = notes;
      if (method) local.payments[idx].method = method;
      this.writeLocalDB(local);
    }
  }

  async findNewlyOverdue(): Promise<Payment[]> {
    const all = await this.findAll();
    return all.filter(p => p.status === "Overdue");
  }

  async markOverdue(id: string): Promise<void> {
    if (this.pool) {
      await this.pool.query("UPDATE payments SET status = 'Overdue' WHERE id = $1 AND status IN ('Pending', 'Processing')", [id]);
      return;
    }
    const local = this.readLocalDB();
    const idx = local.payments.findIndex((x: any) => x.id === id);
    if (idx !== -1 && (local.payments[idx].status === "Pending" || local.payments[idx].status === "Processing")) {
      local.payments[idx].status = "Overdue";
      this.writeLocalDB(local);
    }
  }
}
