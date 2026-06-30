import { BidComment } from "../../../types";

export interface BidCommentRepository {
  create(comment: BidComment): Promise<BidComment>;
  findByBidId(bidId: string): Promise<BidComment[]>;
}
