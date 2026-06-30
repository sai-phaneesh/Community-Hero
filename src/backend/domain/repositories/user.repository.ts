import { User } from "../../../types";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(user: User & { password?: string }): Promise<User>;
  update(user: User & { password?: string }): Promise<User>;
  rewardPoints(userId: string, points: number): Promise<void>;
}
