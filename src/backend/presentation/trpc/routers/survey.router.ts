import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";

export const surveyRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.surveyUseCase.listSurveys();
  }),

  submit: protectedProcedure
    .input(
      z.object({
        overallHappiness: z.number(),
        localServicesRating: z.number().optional(),
        roadQualityRating: z.number().optional(),
        cleanlinessRating: z.number().optional(),
        feedbackText: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbUser = await ctx.userRepository.findById(ctx.user.id);
      return await ctx.surveyUseCase.submitSurvey({
        ...input,
        residentId: ctx.user.id,
        residentName: dbUser?.name || "Anonymous Resident",
      });
    }),
});
