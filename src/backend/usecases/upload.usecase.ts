import { StorageService } from "../infrastructure/storage.service";

export class UploadUseCase {
  constructor(private storageService: StorageService) {}

  async getUploadUrl(
    fileName: string,
    contentType: string
  ): Promise<{ uploadUrl: string; publicUrl: string; isLocal: boolean }> {
    return await this.storageService.generateUploadUrl(fileName, contentType);
  }
}
