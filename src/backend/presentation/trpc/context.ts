import { pool, readDB, writeDB } from "../../infrastructure/database";
import { CockroachJsonUserRepository } from "../../infrastructure/repositories/cockroach-json-user.repository";
import { CockroachJsonIssueRepository } from "../../infrastructure/repositories/cockroach-json-issue.repository";
import { CockroachJsonSurveyRepository } from "../../infrastructure/repositories/cockroach-json-survey.repository";
import { CockroachJsonNotificationRepository } from "../../infrastructure/repositories/cockroach-json-notification.repository";
import { CockroachJsonCampaignRepository } from "../../infrastructure/repositories/cockroach-json-campaign.repository";
import { CockroachJsonCapabilityGroupRepository, CockroachJsonCapabilityRepository } from "../../infrastructure/repositories/cockroach-json-capability.repository";
import { CockroachJsonBidRepository } from "../../infrastructure/repositories/cockroach-json-bid.repository";
import { CockroachJsonAnnouncementRepository } from "../../infrastructure/repositories/cockroach-json-announcement.repository";
import { CockroachJsonIssueMessageRepository } from "../../infrastructure/repositories/cockroach-json-issue-message.repository";
import { CockroachJsonBidCommentRepository } from "../../infrastructure/repositories/cockroach-json-bid-comment.repository";
import { CockroachJsonIssueTimelineRepository } from "../../infrastructure/repositories/cockroach-json-issue-timeline.repository";
import { CockroachJsonPaymentRepository } from "../../infrastructure/repositories/cockroach-json-payment.repository";
import { CockroachJsonReviewRepository } from "../../infrastructure/repositories/cockroach-json-review.repository";
import { AuthUseCase } from "../../usecases/auth.usecase";
import { IssueUseCase } from "../../usecases/issue.usecase";
import { SurveyUseCase } from "../../usecases/survey.usecase";
import { NotificationUseCase } from "../../usecases/notification.usecase";
import { CampaignUseCase } from "../../usecases/campaign.usecase";
import { StorageService } from "../../infrastructure/storage.service";
import { UploadUseCase } from "../../usecases/upload.usecase";
import * as trpcExpress from "@trpc/server/adapters/express";

import { verifyToken, UserTokenPayload } from "./jwt.helper";

// Instantiate repositories
export const userRepository = new CockroachJsonUserRepository(pool, readDB, writeDB);
export const issueRepository = new CockroachJsonIssueRepository(pool, readDB, writeDB);
export const surveyRepository = new CockroachJsonSurveyRepository(pool, readDB, writeDB);
export const notificationRepository = new CockroachJsonNotificationRepository(pool, readDB, writeDB);
export const campaignRepository = new CockroachJsonCampaignRepository(pool, readDB, writeDB);
export const capabilityGroupRepository = new CockroachJsonCapabilityGroupRepository(pool, readDB, writeDB);
export const capabilityRepository = new CockroachJsonCapabilityRepository(pool, readDB, writeDB);
export const bidRepository = new CockroachJsonBidRepository(pool, readDB, writeDB);
export const announcementRepository = new CockroachJsonAnnouncementRepository(pool, readDB, writeDB);
export const issueMessageRepository = new CockroachJsonIssueMessageRepository(pool, readDB, writeDB);
export const bidCommentRepository = new CockroachJsonBidCommentRepository(pool, readDB, writeDB);
export const issueTimelineRepository = new CockroachJsonIssueTimelineRepository(pool, readDB, writeDB);
export const paymentRepository = new CockroachJsonPaymentRepository(pool, readDB, writeDB);
export const reviewRepository = new CockroachJsonReviewRepository(pool, readDB, writeDB);

// Instantiate Use Cases
export const authUseCase = new AuthUseCase(userRepository);
export const issueUseCase = new IssueUseCase(issueRepository, userRepository, notificationRepository, issueTimelineRepository, paymentRepository);
export const surveyUseCase = new SurveyUseCase(surveyRepository, userRepository, notificationRepository);
export const notificationUseCase = new NotificationUseCase(notificationRepository, userRepository);
export const campaignUseCase = new CampaignUseCase(campaignRepository, userRepository, notificationRepository);
export const storageService = new StorageService();
export const uploadUseCase = new UploadUseCase(storageService);

// Define createContext for Express adapter
export const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => {
  let user: UserTokenPayload | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    user = verifyToken(token);
  }

  // Determine if this is a demo user request to bypass the CockroachDB pool
  let requestPool = pool;
  const demoEmails = [
    "admin@community.org",
    "john@resident.com",
    "plumber@service.com",
    "electrician@service.com",
    "alex.community@gmail.com"
  ];
  
  let isDemoUser = false;
  if (user && demoEmails.includes(user.email)) {
    isDemoUser = true;
  } else if (req.body) {
    const findEmail = (obj: any): boolean => {
      if (!obj) return false;
      if (typeof obj === "object") {
        if (obj.email && demoEmails.includes(obj.email)) return true;
        for (const key of Object.keys(obj)) {
          if (findEmail(obj[key])) return true;
        }
      }
      return false;
    };
    if (findEmail(req.body)) {
      isDemoUser = true;
    }
  }

  if (isDemoUser) {
    requestPool = null;
  }

  // Instantiate repositories per-request using the resolved pool config
  const reqUserRepository = new CockroachJsonUserRepository(requestPool, readDB, writeDB);
  const reqIssueRepository = new CockroachJsonIssueRepository(requestPool, readDB, writeDB);
  const reqSurveyRepository = new CockroachJsonSurveyRepository(requestPool, readDB, writeDB);
  const reqNotificationRepository = new CockroachJsonNotificationRepository(requestPool, readDB, writeDB);
  const reqCampaignRepository = new CockroachJsonCampaignRepository(requestPool, readDB, writeDB);
  const reqCapabilityGroupRepository = new CockroachJsonCapabilityGroupRepository(requestPool, readDB, writeDB);
  const reqCapabilityRepository = new CockroachJsonCapabilityRepository(requestPool, readDB, writeDB);
  const reqBidRepository = new CockroachJsonBidRepository(requestPool, readDB, writeDB);
  const reqAnnouncementRepository = new CockroachJsonAnnouncementRepository(requestPool, readDB, writeDB);
  const reqIssueMessageRepository = new CockroachJsonIssueMessageRepository(requestPool, readDB, writeDB);
  const reqBidCommentRepository = new CockroachJsonBidCommentRepository(requestPool, readDB, writeDB);
  const reqIssueTimelineRepository = new CockroachJsonIssueTimelineRepository(requestPool, readDB, writeDB);
  const reqPaymentRepository = new CockroachJsonPaymentRepository(requestPool, readDB, writeDB);
  const reqReviewRepository = new CockroachJsonReviewRepository(requestPool, readDB, writeDB);

  // Instantiate Use Cases per-request
  const reqAuthUseCase = new AuthUseCase(reqUserRepository);
  const reqIssueUseCase = new IssueUseCase(reqIssueRepository, reqUserRepository, reqNotificationRepository, reqIssueTimelineRepository, reqPaymentRepository);
  const reqSurveyUseCase = new SurveyUseCase(reqSurveyRepository, reqUserRepository, reqNotificationRepository);
  const reqNotificationUseCase = new NotificationUseCase(reqNotificationRepository, reqUserRepository);
  const reqCampaignUseCase = new CampaignUseCase(reqCampaignRepository, reqUserRepository, reqNotificationRepository);
  const reqStorageService = new StorageService();
  const reqUploadUseCase = new UploadUseCase(reqStorageService);

  return {
    req,
    res,
    user,
    userRepository: reqUserRepository,
    authUseCase: reqAuthUseCase,
    issueUseCase: reqIssueUseCase,
    issueRepository: reqIssueRepository,
    surveyUseCase: reqSurveyUseCase,
    notificationUseCase: reqNotificationUseCase,
    campaignUseCase: reqCampaignUseCase,
    uploadUseCase: reqUploadUseCase,
    capabilityGroupRepository: reqCapabilityGroupRepository,
    capabilityRepository: reqCapabilityRepository,
    bidRepository: reqBidRepository,
    announcementRepository: reqAnnouncementRepository,
    issueMessageRepository: reqIssueMessageRepository,
    bidCommentRepository: reqBidCommentRepository,
    issueTimelineRepository: reqIssueTimelineRepository,
    paymentRepository: reqPaymentRepository,
    reviewRepository: reqReviewRepository,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
