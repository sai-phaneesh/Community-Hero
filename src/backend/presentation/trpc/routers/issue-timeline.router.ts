import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { IssueTimelineEvent } from "../../../../types";
import crypto from "crypto";

export const issueTimelineRouter = router({
  listForIssue: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.issueTimelineRepository.findByIssueId(input.issueId);
    }),

  addEvent: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        title: z.string().min(3).max(100),
        description: z.string().min(5).max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const issue = await ctx.issueRepository.findById(input.issueId);
      if (!issue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The requested issue could not be found.",
        });
      }

      const dbUser = await ctx.userRepository.findById(ctx.user.id);
      if (!dbUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User account not found.",
        });
      }

      // Check authorization: only reporter, assigned contractor, or admin can post manually
      const isReporter = issue.reporterId === ctx.user.id;
      const isContractor = issue.assignedContractorId === ctx.user.id;
      const isAdmin = dbUser.role === "admin";

      if (!isReporter && !isContractor && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to post manual timeline updates to this issue.",
        });
      }

      const newEvent: IssueTimelineEvent = {
        id: crypto.randomUUID(),
        issueId: input.issueId,
        title: input.title,
        description: input.description,
        createdAt: new Date().toISOString(),
        creatorId: ctx.user.id,
        creatorName: dbUser.name,
        creatorRole: dbUser.role,
        isSystem: false,
      };

      const saved = await ctx.issueTimelineRepository.create(newEvent);
      return saved;
    }),
});
