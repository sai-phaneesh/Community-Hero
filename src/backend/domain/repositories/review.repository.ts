import { Review } from "../../../types";

export interface ReviewRepository {
  create(review: Review): Promise<Review>;
  findByContractorId(contractorId: string): Promise<Review[]>;
  findByIssueId(issueId: string): Promise<Review | null>;
}
