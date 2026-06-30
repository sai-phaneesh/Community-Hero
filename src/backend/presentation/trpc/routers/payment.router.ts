import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Payment } from "../../../../types";

export const paymentRouter = router({
  listForIssue: publicProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.paymentRepository.findByIssueId(input.issueId);
    }),

  listAll: publicProcedure
    .query(async ({ ctx }) => {
      return await ctx.paymentRepository.findAll();
    }),

  myPayments: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "contractor") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Only contractors can view their payments" });
      }
      return await ctx.paymentRepository.findByContractorId(ctx.user.id);
    }),

  updatePayment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["Pending", "Processing", "Paid", "Overdue"]),
        method: z.enum(["Cash", "UPI", "Bank Transfer", "Cheque", "Other"]).optional(),
        proofUrl: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Only admins can update payments" });
      }

      const existing = await ctx.paymentRepository.findById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      let paidAt = existing.paidAt;
      if (input.status === "Paid" && existing.status !== "Paid") {
        paidAt = new Date().toISOString();
      }

      await ctx.paymentRepository.updateStatus(
        input.id,
        input.status,
        paidAt,
        input.proofUrl,
        input.notes,
        input.method
      );

      // Log timeline event for significant payment updates
      const issue = await ctx.issueUseCase.getIssue(existing.issueId);
      if (issue) {
        const callingUser = await ctx.userRepository.findById(ctx.user.id);
        const callingUserName = callingUser?.name || "Administrator";

        const title = `Payment ${input.status}`;
        let desc = `Payment status updated to ${input.status} by ${callingUserName}.`;
        if (input.status === "Paid" && input.method) desc += ` Method: ${input.method}.`;

        await ctx.issueTimelineRepository.create({
          id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          issueId: existing.issueId,
          title,
          description: desc,
          createdAt: new Date().toISOString(),
          creatorId: ctx.user.id,
          creatorName: callingUserName,
          creatorRole: ctx.user.role,
          isSystem: true
        });

        // Notify contractor if marked Paid or Processing
        if (input.status === "Paid" || input.status === "Processing") {
            await ctx.notificationUseCase.createNotification(
                existing.contractorId,
                `Payment ${input.status}`,
                `Your payment for "${issue.title}" has been marked as ${input.status}.`,
                existing.issueId,
                "payment"
            );
        }
      }

      return { success: true };
    }),
});
