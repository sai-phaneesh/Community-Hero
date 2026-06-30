import { IssueChatMessage } from "../../../types";

export interface IssueMessageRepository {
  create(message: IssueChatMessage): Promise<IssueChatMessage>;
  findByIssueId(issueId: string): Promise<IssueChatMessage[]>;
}
