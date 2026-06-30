import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";

export const campaignRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.campaignUseCase.listCampaigns();
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(5),
        description: z.string().min(10),
        category: z.enum(["Cleaning", "Planting", "Safety", "Social", "Other"]),
        location: z.string().min(3),
        date: z.string(),
        maxAttendees: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbUser = await ctx.userRepository.findById(ctx.user.id);
      return await ctx.campaignUseCase.createCampaign({
        ...input,
        creatorId: ctx.user.id,
        creatorName: dbUser?.name || "Neighbor",
      });
    }),

  toggleJoin: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.campaignUseCase.toggleJoinCampaign(input.campaignId, ctx.user.id);
    }),
});
