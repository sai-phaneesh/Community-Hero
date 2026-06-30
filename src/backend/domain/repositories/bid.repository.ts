import { Bid } from "../../../types";

export interface BidRepository {
  create(bid: Bid): Promise<Bid>;
  findById(id: string): Promise<Bid | null>;
  findByIssueId(issueId: string): Promise<Bid[]>;
  findByContractorId(contractorId: string): Promise<Bid[]>;
  update(bid: Bid): Promise<Bid>;
  delete(id: string): Promise<void>;
}
