import { Issue } from "../../../types";

export interface IssueRepository {
  findById(id: string): Promise<Issue | null>;
  findAll(): Promise<Issue[]>;
  findAllPaginated(limit: number, cursor?: string): Promise<{ items: Issue[], nextCursor?: string }>;
  create(issue: Issue): Promise<Issue>;
  update(issue: Issue): Promise<Issue>;
  delete(id: string): Promise<void>;
}
