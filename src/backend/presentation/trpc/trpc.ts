import { initTRPC, TRPCError } from "@trpc/server";

import { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication token is missing or invalid.",
    });
  }

  const dbUser = await ctx.userRepository.findById(ctx.user.id);
  if (!dbUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User account no longer exists.",
    });
  }

  const activeSessions = dbUser.activeSessions || [];
  const isSessionValid = activeSessions.some((s) => s.sessionId === ctx.user?.sessionId);
  if (!isSessionValid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Session has been revoked or logged out from this device.",
    });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
