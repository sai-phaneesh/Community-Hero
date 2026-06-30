import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Announcement } from "../../../../types";

export const announcementRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.announcementRepository.findAll();
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(5),
        description: z.string().min(15),
        category: z.enum(["Water Cut", "Electricity Outage", "Garbage Collection", "Water Outlet", "Other"]),
        scheduledDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        affectedAreas: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can schedule utility announcements.",
        });
      }

      const id = crypto.randomUUID();
      const newAnn: Announcement = {
        id,
        title: input.title,
        description: input.description,
        category: input.category,
        scheduledDate: input.scheduledDate,
        startTime: input.startTime,
        endTime: input.endTime,
        affectedAreas: input.affectedAreas || [],
        createdAt: new Date().toISOString(),
        creatorId: ctx.user.id,
      };

      const saved = await ctx.announcementRepository.create(newAnn);

      // Notify all residents about this new official utility alert
      const allUsers = await ctx.userRepository.findById(ctx.user.id); // placeholder logic or find all residents
      // Wait, let's query all users and notify them!
      if (ctx.userRepository.findAll) {
        try {
          const users = await ctx.userRepository.findAll();
          for (const u of users) {
            await ctx.notificationUseCase.createNotification({
              userId: u.id,
              title: `[ANNOUNCEMENT] ${input.title}`,
              message: `Official utility notification: ${input.description}. Scheduled date: ${input.scheduledDate || 'N/A'}.`,
            });
          }
        } catch (_) {}
      } else {
        // Fallback: create notification for self at least
        await ctx.notificationUseCase.createNotification({
          userId: ctx.user.id,
          title: `[ANNOUNCEMENT] ${input.title}`,
          message: input.description,
        });
      }

      return saved;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can delete announcements.",
        });
      }
      await ctx.announcementRepository.delete(input.id);
      return { success: true };
    }),
});
