import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Bid } from "../../../../types";

export const bidRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        materialsCost: z.number().min(0),
        laborCost: z.number().min(0),
        estimatedHours: z.number().min(1),
        proposalNotes: z.string().min(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "contractor") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only contractors can submit service bids.",
        });
      }

      // Check if issue exists
      const issue = await ctx.issueUseCase.getIssueById(input.issueId);
      if (!issue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The requested issue could not be found.",
        });
      }

      const dbUser = await ctx.userRepository.findById(ctx.user.id);
      const contractorName = dbUser?.name || "Contractor Specialist";

      const id = crypto.randomUUID();
      const newBid: Bid = {
        id,
        issueId: input.issueId,
        contractorId: ctx.user.id,
        contractorName,
        materialsCost: input.materialsCost,
        laborCost: input.laborCost,
        estimatedHours: input.estimatedHours,
        proposalNotes: input.proposalNotes,
        status: "Pending",
        createdAt: new Date().toISOString(),
      };

      const saved = await ctx.bidRepository.create(newBid);

      // Notify the reporter
      await ctx.notificationUseCase.createNotification({
        userId: issue.reporterId,
        title: "New Bid Proposal Received",
        message: `Contractor ${contractorName} submitted a quote of $${input.materialsCost + input.laborCost} for "${issue.title}".`,
      });

      return saved;
    }),

  listForIssue: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.bidRepository.findByIssueId(input.issueId);
    }),

  listForContractor: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "contractor") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only contractors can view their submitted bids.",
        });
      }
      return await ctx.bidRepository.findByContractorId(ctx.user.id);
    }),

  accept: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const bid = await ctx.bidRepository.findById(input.id);
      if (!bid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid proposal not found.",
        });
      }

      const issue = await ctx.issueUseCase.getIssueById(bid.issueId);
      if (!issue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Associated issue not found.",
        });
      }

      // Authorize: user must be reporter or admin
      if (ctx.user.role !== "admin" && issue.reporterId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the issue reporter or an administrator can accept bid proposals.",
        });
      }

      // Assign issue to contractor
      issue.assignedContractorId = bid.contractorId;
      issue.assignedContractorName = bid.contractorName;
      issue.status = "Assigned";
      issue.priceQuote = bid.materialsCost + bid.laborCost;

      // Save issue update using usecase or repo
      await ctx.issueRepository.update(issue);

      // Accept this bid and reject other bids for the same issue
      const updatedBid = { ...bid, status: "Accepted" as const };
      await ctx.bidRepository.update(updatedBid);

      const allBids = await ctx.bidRepository.findByIssueId(bid.issueId);
      for (const b of allBids) {
        if (b.id !== bid.id) {
          await ctx.bidRepository.update({ ...b, status: "Rejected" as const });
        }
      }

      // Notify winning contractor
      await ctx.notificationUseCase.createNotification({
        userId: bid.contractorId,
        title: "Bid Proposal Accepted",
        message: `Your bid proposal of $${issue.priceQuote} for "${issue.title}" has been accepted! You can now start the work.`,
      });

      // Notify other bidders
      for (const b of allBids) {
        if (b.id !== bid.id) {
          await ctx.notificationUseCase.createNotification({
            userId: b.contractorId,
            title: "Bid Closed",
            message: `The inquiry "${issue.title}" accepted another bid proposal.`,
          });
        }
      }

      return updatedBid;
    }),

  reject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const bid = await ctx.bidRepository.findById(input.id);
      if (!bid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid proposal not found.",
        });
      }

      const issue = await ctx.issueUseCase.getIssueById(bid.issueId);
      if (!issue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Associated issue not found.",
        });
      }

      // Authorize
      if (ctx.user.role !== "admin" && issue.reporterId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the issue reporter or an administrator can reject proposals.",
        });
      }

      const updated = { ...bid, status: "Rejected" as const };
      await ctx.bidRepository.update(updated);

      // Notify contractor
      await ctx.notificationUseCase.createNotification({
        userId: bid.contractorId,
        title: "Proposal Declined",
        message: `Your bid proposal for "${issue.title}" was declined.`,
      });

      return updated;
    }),

  counter: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const bid = await ctx.bidRepository.findById(input.id);
      if (!bid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid proposal not found.",
        });
      }

      const issue = await ctx.issueUseCase.getIssueById(bid.issueId);
      if (!issue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Associated issue not found.",
        });
      }

      if (ctx.user.role !== "admin" && issue.reporterId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the issue reporter or an administrator can propose counter offers.",
        });
      }

      const updated = {
        ...bid,
        status: "Countered" as const,
        counterAmount: input.amount,
        counterStatus: "Pending" as const,
      };

      await ctx.bidRepository.update(updated);

      // Create notification for contractor
      await ctx.notificationUseCase.createNotification({
        userId: bid.contractorId,
        title: "Counter Offer Proposed",
        message: `A counter-offer of $${input.amount} was proposed for your "${issue.title}" bid.`,
      });

      // Log to issue timeline
      await ctx.issueTimelineRepository.create({
        id: crypto.randomUUID(),
        issueId: issue.id,
        title: "Counter Offer Made",
        description: `Counter-offer of $${input.amount} proposed to contractor ${bid.contractorName}.`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      });

      return updated;
    }),

  acceptCounter: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const bid = await ctx.bidRepository.findById(input.id);
      if (!bid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid proposal not found.",
        });
      }

      if (bid.contractorId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the contractor who submitted the bid can accept the counter offer.",
        });
      }

      const issue = await ctx.issueUseCase.getIssueById(bid.issueId);
      if (!issue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Associated issue not found.",
        });
      }

      const finalPrice = bid.counterAmount || (bid.materialsCost + bid.laborCost);

      // Accept this bid & update issue assignment
      const updatedBid = {
        ...bid,
        status: "Accepted" as const,
        counterStatus: "Accepted" as const,
      };
      await ctx.bidRepository.update(updatedBid);

      issue.assignedContractorId = bid.contractorId;
      issue.assignedContractorName = bid.contractorName;
      issue.status = "Assigned";
      issue.priceQuote = finalPrice;
      await ctx.issueRepository.update(issue);

      // Reject other bids
      const allBids = await ctx.bidRepository.findByIssueId(bid.issueId);
      for (const b of allBids) {
        if (b.id !== bid.id) {
          await ctx.bidRepository.update({ ...b, status: "Rejected" as const });
        }
      }

      // Notify reporter
      await ctx.notificationUseCase.createNotification({
        userId: issue.reporterId,
        title: "Counter Offer Accepted",
        message: `Contractor ${bid.contractorName} accepted your counter-offer of $${finalPrice} for "${issue.title}".`,
      });

      // Log to issue timeline
      await ctx.issueTimelineRepository.create({
        id: crypto.randomUUID(),
        issueId: issue.id,
        title: "Counter Offer Accepted",
        description: `Contractor accepted counter-offer. Assigned to contractor at locked rate of $${finalPrice}.`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      });

      return updatedBid;
    }),

  rejectCounter: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const bid = await ctx.bidRepository.findById(input.id);
      if (!bid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid proposal not found.",
        });
      }

      if (bid.contractorId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the contractor who submitted the bid can reject the counter offer.",
        });
      }

      const issue = await ctx.issueUseCase.getIssueById(bid.issueId);
      if (!issue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Associated issue not found.",
        });
      }

      const updatedBid = {
        ...bid,
        status: "Rejected" as const,
        counterStatus: "Rejected" as const,
      };
      await ctx.bidRepository.update(updatedBid);

      // Notify reporter
      await ctx.notificationUseCase.createNotification({
        userId: issue.reporterId,
        title: "Counter Offer Declined",
        message: `Contractor ${bid.contractorName} declined your counter-offer for "${issue.title}".`,
      });

      // Log to issue timeline
      await ctx.issueTimelineRepository.create({
        id: crypto.randomUUID(),
        issueId: issue.id,
        title: "Counter Offer Declined",
        description: `Contractor declined counter-offer from resident.`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      });

      return updatedBid;
    }),
});
