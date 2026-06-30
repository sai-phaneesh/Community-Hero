import { router } from "./trpc";
import { authRouter } from "./routers/auth.router";
import { issueRouter } from "./routers/issue.router";
import { surveyRouter } from "./routers/survey.router";
import { notificationRouter } from "./routers/notification.router";
import { uploadRouter } from "./routers/upload.router";
import { campaignRouter } from "./routers/campaign.router";
import { capabilityRouter } from "./routers/capability.router";
import { bidRouter } from "./routers/bid.router";
import { announcementRouter } from "./routers/announcement.router";
import { issueMessageRouter } from "./routers/issue-message.router";
import { issueTimelineRouter } from "./routers/issue-timeline.router";
import { bidCommentRouter } from "./routers/bid-comment.router";
import { paymentRouter } from "./routers/payment.router";
import { reviewRouter } from "./routers/review.router";

export const appRouter = router({
  auth: authRouter,
  issue: issueRouter,
  survey: surveyRouter,
  notification: notificationRouter,
  upload: uploadRouter,
  campaign: campaignRouter,
  capability: capabilityRouter,
  bid: bidRouter,
  announcement: announcementRouter,
  issueMessage: issueMessageRouter,
  issueTimeline: issueTimelineRouter,
  bidComment: bidCommentRouter,
  payment: paymentRouter,
  review: reviewRouter,
});

export type AppRouter = typeof appRouter;
