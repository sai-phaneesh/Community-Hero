import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import * as crypto from "crypto";

export const capabilityRouter = router({
  listGroups: publicProcedure.query(async ({ ctx }) => {
    const [groups, capabilities] = await Promise.all([
      ctx.capabilityGroupRepository.findAll(),
      ctx.capabilityRepository.findAll(),
    ]);

    // Nest capabilities inside their respective groups
    return groups.map((g) => ({
      ...g,
      capabilities: capabilities.filter((c) => c.groupId === g.id),
    }));
  }),

  createGroup: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Group name must be at least 2 characters long"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const newGroup = {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description,
      };
      return await ctx.capabilityGroupRepository.create(newGroup);
    }),

  updateGroup: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2, "Group name must be at least 2 characters long"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.capabilityGroupRepository.findById(input.id);
      if (!existing) throw new Error("Capability group not found.");
      return await ctx.capabilityGroupRepository.update({
        id: input.id,
        name: input.name,
        description: input.description,
      });
    }),

  deleteGroup: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.capabilityGroupRepository.delete(input.id);
    }),

  createCapability: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Capability name must be at least 2 characters long"),
        description: z.string().min(5, "Description must be at least 5 characters long"),
        imageUrls: z.array(z.string()),
        groupId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const group = await ctx.capabilityGroupRepository.findById(input.groupId);
      if (!group) throw new Error("Target capability group not found.");

      const newCap = {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description,
        imageUrls: input.imageUrls,
        groupId: input.groupId,
      };
      return await ctx.capabilityRepository.create(newCap);
    }),

  updateCapability: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2, "Capability name must be at least 2 characters long"),
        description: z.string().min(5, "Description must be at least 5 characters long"),
        imageUrls: z.array(z.string()),
        groupId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.capabilityRepository.findById(input.id);
      if (!existing) throw new Error("Capability not found.");

      const group = await ctx.capabilityGroupRepository.findById(input.groupId);
      if (!group) throw new Error("Target capability group not found.");

      return await ctx.capabilityRepository.update({
        id: input.id,
        name: input.name,
        description: input.description,
        imageUrls: input.imageUrls,
        groupId: input.groupId,
      });
    }),

  transferCapability: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        groupId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.capabilityRepository.findById(input.id);
      if (!existing) throw new Error("Capability not found.");

      const group = await ctx.capabilityGroupRepository.findById(input.groupId);
      if (!group) throw new Error("Target capability group not found.");

      existing.groupId = input.groupId;
      return await ctx.capabilityRepository.update(existing);
    }),

  deleteCapability: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.capabilityRepository.delete(input.id);
    }),
});
