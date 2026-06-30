import { Announcement } from "../../../types";

export interface AnnouncementRepository {
  create(announcement: Announcement): Promise<Announcement>;
  findAll(): Promise<Announcement[]>;
  delete(id: string): Promise<void>;
}
