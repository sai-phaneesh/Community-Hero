import { router, publicProcedure } from "../trpc";
import { z } from "zod";

export const notificationRouter = router({
  list: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await ctx.notificationUseCase.listNotifications(input.userId);
    }),

  read: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.notificationUseCase.markAsRead(input.id);
      return { success: true };
    }),

  markAllRead: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.notificationUseCase.markAllRead(input.userId);
      return { success: true };
    }),

  broadcast: publicProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.notificationUseCase.broadcastNotification(input.title, input.message);
      return { success: true };
    }),
});
