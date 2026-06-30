import { Payment } from "../../../types";

export interface PaymentRepository {
  create(payment: Payment): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByIssueId(issueId: string): Promise<Payment | null>;
  findByContractorId(contractorId: string): Promise<Payment[]>;
  findAll(): Promise<Payment[]>;
  updateStatus(
    id: string,
    status: Payment["status"],
    paidAt?: string,
    proofUrl?: string,
    notes?: string,
    method?: Payment["method"]
  ): Promise<void>;
  markOverdue(id: string): Promise<void>;
  findNewlyOverdue(): Promise<Payment[]>;
}
