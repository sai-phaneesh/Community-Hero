import { router, publicProcedure } from "../trpc";
import { z } from "zod";

export const uploadRouter = router({
  getPresignedUrl: publicProcedure
    .input(
      z.object({
        fileName: z.string(),
        contentType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.uploadUseCase.getUploadUrl(input.fileName, input.contentType);
    }),
});
