import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { IssueChatMessage } from "../../../../types";

export const issueMessageRouter = router({
  listForIssue: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.issueMessageRepository.findByIssueId(input.issueId);
    }),

  send: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const issue = await ctx.issueUseCase.getIssueById(input.issueId);
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

      const id = crypto.randomUUID();
      const newMsg: IssueChatMessage = {
        id,
        issueId: input.issueId,
        senderId: ctx.user.id,
        senderName: dbUser.name,
        senderRole: dbUser.role,
        message: input.message,
        createdAt: new Date().toISOString(),
      };

      const saved = await ctx.issueMessageRepository.create(newMsg);

      // Notify other followers and participants of the chat (e.g. reporter, assigned contractor)
      const participants = new Set<string>();
      if (issue.reporterId !== ctx.user.id) participants.add(issue.reporterId);
      if (issue.assignedContractorId && issue.assignedContractorId !== ctx.user.id) {
        participants.add(issue.assignedContractorId);
      }

      for (const userId of participants) {
        await ctx.notificationUseCase.createNotification({
          userId,
          title: `New Message in "${issue.title}"`,
          message: `${dbUser.name}: "${input.message.slice(0, 45)}${input.message.length > 45 ? "..." : ""}"`,
        });
      }

      return saved;
    }),
});
