import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ai } from "../../../infrastructure/gemini";

export const issueRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(), // <-- "cursor" needs to exist, but can be any type
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const limit = input?.limit ?? 10;
      const { cursor } = input || {};
      return await ctx.issueUseCase.listIssuesPaginated(limit, cursor || undefined);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.issueRepository.findById(input.id);
    }),

  report: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        category: z.string().optional(),
        capabilityId: z.string().optional(),
        severity: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
        wasteCaused: z.string().optional(),
        beforeImages: z.array(z.string()).optional(),
        beforeVideos: z.array(z.string()).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbUser = await ctx.userRepository.findById(ctx.user.id);
      return await ctx.issueUseCase.reportIssue({
        ...input,
        reporterId: ctx.user.id,
        reporterName: dbUser?.name || "Anonymous Resident",
        reporterHouse: dbUser?.houseNumber || "N/A",
      });
    }),

  update: protectedProcedure
    .input(
      z
        .object({
          id: z.string(),
          title: z.string().min(5).max(255).optional(),
          description: z.string().min(15).optional(),
          category: z.string().min(2).optional(),
          capabilityId: z.string().nullable().optional(),
          severity: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
          wasteCaused: z.string().min(3).optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        })
        .refine(
          (input) =>
            input.title !== undefined ||
            input.description !== undefined ||
            input.category !== undefined ||
            input.capabilityId !== undefined ||
            input.severity !== undefined ||
            input.wasteCaused !== undefined ||
            input.latitude !== undefined ||
            input.longitude !== undefined,
          {
            message: "At least one editable field is required.",
          },
        ),
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.issueUseCase.updateIssue({
        ...input,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
      });
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.issueUseCase.deleteIssue({
        id: input.id,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
      });
    }),

  validate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.issueUseCase.validateIssue(input.id, ctx.user.id);
    }),

  assign: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        priceQuote: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.issueUseCase.assignIssue({
        id: input.id,
        contractorId: ctx.user.id,
        priceQuote: input.priceQuote,
      });
    }),

  start: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.issueUseCase.startProgress(input.id, ctx.user.id);
    }),

  resolve: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        resolutionNotes: z.string().optional(),
        afterImages: z.array(z.string()).optional(),
        afterVideos: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.issueUseCase.resolveIssue(
        input.id,
        ctx.user.id,
        input.resolutionNotes,
        input.afterImages,
        input.afterVideos
      );
    }),

  pay: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.issueUseCase.releasePayment(input.id);
    }),

  toggleFollow: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.issueUseCase.toggleFollowIssue(input.id, ctx.user.id);
    }),

  markDuplicate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        canonicalId: z.string().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can mark reports as duplicate.",
        });
      }

      const issue = await ctx.issueRepository.findById(input.id);
      if (!issue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Issue report not found.",
        });
      }

      if (input.canonicalId) {
        const canonical = await ctx.issueRepository.findById(input.canonicalId);
        if (!canonical) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Canonical parent report not found.",
          });
        }
        issue.duplicateOfIssueId = input.canonicalId;
        issue.status = "Resolved";
        issue.resolutionNotes = `Marked as duplicate of report #${input.canonicalId}.`;
      } else {
        issue.duplicateOfIssueId = undefined;
      }

      const updated = await ctx.issueRepository.update(issue);

      // Add timeline event
      await ctx.issueTimelineRepository.create({
        id: crypto.randomUUID(),
        issueId: issue.id,
        title: input.canonicalId ? "Marked as Duplicate" : "Duplicate Flag Removed",
        description: input.canonicalId 
          ? `Report marked as duplicate of #${input.canonicalId} by admin.` 
          : "Report duplicate flag cleared by admin.",
        createdAt: new Date().toISOString(),
        isSystem: true,
      });

      return updated;
    }),

  reopen: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.issueUseCase.reopenIssue(input.id, ctx.user.id, input.reason);
    }),

  analyze: publicProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { title, description } = input;

      // If Gemini is available, query it!
      if (ai) {
        try {
          const prompt = `Analyze this hyperlocal community issue to automatically categorize it and estimate its impacts.
Title: "${title}"
Description: "${description}"

Please return a structured JSON response with exactly the following schema. Avoid markdown tags around the JSON, return ONLY pure JSON.
{
  "category": "Water Leakage" | "Road Repair" | "Garbage Disposal" | "Plants Overgrown" | "Electricity Out" | "Public Infrastructure",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "wasteCaused": "Description of physical or resource waste (e.g., liters of clean water leaking, power grid strain, garbage scattering, health risk)",
  "repairSuggestion": "Short action suggestion for plumbers, electricians, or council contractors",
  "authenticityClues": "Details in the description that help prove or challenge authenticity"
}`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          });

          const responseText = response.text || "{}";
          return JSON.parse(responseText.trim());
        } catch (err) {
          console.error("Gemini analysis error, falling back to rule-based analysis", err);
        }
      }

      // Rule-based fallback if Gemini API is not configured or fails
      const lowerTitle = title.toLowerCase();
      const lowerDesc = description.toLowerCase();

      let category = "Public Infrastructure";
      let severity: "Low" | "Medium" | "High" | "Critical" = "Medium";
      let wasteCaused = "Resource damage & public inconvenience.";
      let repairSuggestion = "Standard contractor repair required.";
      let authenticityClues = "Detailed description provides positive authenticity indicator.";

      if (lowerTitle.includes("leak") || lowerTitle.includes("water") || lowerDesc.includes("leak") || lowerDesc.includes("pipe")) {
        category = "Water Leakage";
        severity = "High";
        wasteCaused = "Estimated 300 to 1,500 liters of treated tap water wasted per day depending on pressure.";
        repairSuggestion = "Immediate pipeline shut-off and joint replacement by a plumber.";
      } else if (lowerTitle.includes("hole") || lowerTitle.includes("pothole") || lowerTitle.includes("road") || lowerDesc.includes("road") || lowerDesc.includes("pothole")) {
        category = "Road Repair";
        severity = "Medium";
        wasteCaused = "Wear & tear on resident vehicles, high risk of micro-accidents.";
        repairSuggestion = "Cold asphalt filling and tamping by road repair contractors.";
      } else if (lowerTitle.includes("light") || lowerTitle.includes("lamp") || lowerTitle.includes("power") || lowerDesc.includes("dark") || lowerDesc.includes("streetlight") || lowerDesc.includes("outage")) {
        category = "Electricity Out";
        severity = "Medium";
        wasteCaused = "Pedestrian risk, visual blackout, minor safety/crime hazard increase.";
        repairSuggestion = "Bulb or photocell replacement by an electrician.";
      } else if (lowerTitle.includes("trash") || lowerTitle.includes("garbage") || lowerTitle.includes("waste") || lowerDesc.includes("waste") || lowerDesc.includes("litter") || lowerDesc.includes("dump")) {
        category = "Garbage Disposal";
        severity = "High";
        wasteCaused = "Odor emissions, rodent/pest attraction, soil contamination.";
        repairSuggestion = "Bulk waste disposal truck dispatch and cleanup.";
      } else if (lowerTitle.includes("plant") || lowerTitle.includes("tree") || lowerTitle.includes("branch") || lowerDesc.includes("weed") || lowerDesc.includes("grow") || lowerDesc.includes("bush") || lowerDesc.includes("grass")) {
        category = "Plants Overgrown";
        severity = "Low";
        wasteCaused = "Sidewalk obstruction, pedestrian hazard, wildfire hazard risk.";
        repairSuggestion = "Tree trimming or weed clearing by a gardening contractor.";
      }

      if (lowerDesc.includes("urgent") || lowerDesc.includes("dangerous") || lowerDesc.includes("accident") || lowerDesc.includes("critical")) {
        severity = "Critical";
      }

      return {
        category,
        severity,
        wasteCaused,
        repairSuggestion,
        authenticityClues,
      };
    }),
});
