import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { signToken } from "../jwt.helper";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().optional(),
        role: z.enum(["resident", "contractor", "admin"]).optional(),
        name: z.string().optional(),
        avatarUrl: z.string().optional(),
        phone: z.string().optional(),
        residenceType: z.enum(["owner", "renter"]).optional(),
        residenceStartDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userAgent = ctx.req.headers["user-agent"];
      const { user, sessionId } = await ctx.authUseCase.register(input, userAgent);
      const token = signToken({ id: user.id, role: user.role, email: user.email, sessionId });
      return { user, token };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userAgent = ctx.req.headers["user-agent"];
      const { user, sessionId } = await ctx.authUseCase.login(input.email, input.password, userAgent);
      const token = signToken({ id: user.id, role: user.role, email: user.email, sessionId });
      return { user, token };
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.authUseCase.listUsers();
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        username: z.string(),
        phone: z.string(),
        role: z.enum(["resident", "contractor", "admin"]).optional(),
        houseNumber: z.string().optional(),
        specialty: z.string().optional(),
        avatarUrl: z.string().optional(),
        residenceType: z.enum(["owner", "renter"]).optional(),
        residenceStartDate: z.string().optional(),
        capabilities: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.authUseCase.updateProfile(ctx.user.id, input);
    }),

  listSessions: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await ctx.userRepository.findById(ctx.user.id);
    return dbUser?.activeSessions || [];
  }),

  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const dbUser = await ctx.userRepository.findById(ctx.user.id);
      if (!dbUser) throw new Error("User not found");
      const sessions = (dbUser.activeSessions || []).filter((s) => s.sessionId !== input.sessionId);
      dbUser.activeSessions = sessions;
      await ctx.userRepository.update(dbUser);
      return sessions;
    }),

  logoutOtherDevices: protectedProcedure.mutation(async ({ ctx }) => {
    const dbUser = await ctx.userRepository.findById(ctx.user.id);
    if (!dbUser) throw new Error("User not found");
    const sessions = (dbUser.activeSessions || []).filter((s) => s.sessionId === ctx.user.sessionId);
    dbUser.activeSessions = sessions;
    await ctx.userRepository.update(dbUser);
    return sessions;
  }),
});
