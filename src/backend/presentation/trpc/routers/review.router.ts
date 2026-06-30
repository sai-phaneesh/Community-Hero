import { router, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Review } from "../../../../types";

export const reviewRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        contractorId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().min(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Find issue
      const issue = await ctx.issueRepository.findById(input.issueId);
      if (!issue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Issue not found.",
        });
      }

      if (issue.reporterId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the issue reporter can rate the contractor.",
        });
      }

      // Check if already reviewed
      const existing = await ctx.reviewRepository.findByIssueId(input.issueId);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already submitted a review for this repair job.",
        });
      }

      const callingUser = await ctx.userRepository.findById(ctx.user.id);
      const callingUserName = callingUser?.name || "Anonymous Resident";

      const id = crypto.randomUUID();
      const newReview: Review = {
        id,
        issueId: input.issueId,
        contractorId: input.contractorId,
        reporterId: ctx.user.id,
        reporterName: callingUserName,
        rating: input.rating,
        comment: input.comment,
        createdAt: new Date().toISOString(),
      };

      const saved = await ctx.reviewRepository.create(newReview);

      // Update issue reviewed state
      issue.isReviewed = true;
      await ctx.issueRepository.update(issue);

      // Log timeline milestone
      await ctx.issueTimelineRepository.create({
        id: crypto.randomUUID(),
        issueId: issue.id,
        title: "Contractor Reviewed",
        description: `Resident submitted a ${input.rating}-star review: "${input.comment}".`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      });

      // Send notification to contractor
      await ctx.notificationUseCase.createNotification(
        input.contractorId,
        "New Review Received",
        `A resident left you a ${input.rating}-star review for resolving "${issue.title}".`,
        issue.id,
        "issue"
      );

      return saved;
    }),

  listForContractor: publicProcedure
    .input(z.object({ contractorId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.reviewRepository.findByContractorId(input.contractorId);
    }),

  getForIssue: publicProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.reviewRepository.findByIssueId(input.issueId);
    }),
});
