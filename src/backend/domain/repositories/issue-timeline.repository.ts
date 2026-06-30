import { IssueTimelineEvent } from "../../../types";

export interface IssueTimelineRepository {
  create(event: IssueTimelineEvent): Promise<IssueTimelineEvent>;
  findByIssueId(issueId: string): Promise<IssueTimelineEvent[]>;
}
