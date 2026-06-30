import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { BidComment } from "../../../../types";
import crypto from "crypto";

export const bidCommentRouter = router({
  listForBid: protectedProcedure
    .input(z.object({ bidId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.bidCommentRepository.findByBidId(input.bidId);
    }),

  sendComment: protectedProcedure
    .input(
      z.object({
        bidId: z.string(),
        comment: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const bid = await ctx.bidRepository.findById(input.bidId);
      if (!bid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The requested bid proposal could not be found.",
        });
      }

      const dbUser = await ctx.userRepository.findById(ctx.user.id);
      if (!dbUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User account not found.",
        });
      }

      const newComment: BidComment = {
        id: crypto.randomUUID(),
        bidId: input.bidId,
        senderId: ctx.user.id,
        senderName: dbUser.name,
        senderRole: dbUser.role,
        comment: input.comment,
        createdAt: new Date().toISOString(),
      };

      const saved = await ctx.bidCommentRepository.create(newComment);
      return saved;
    }),
});
