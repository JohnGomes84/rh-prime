import { z } from "zod";
import { isFeatureEnabled } from "./feature-flags.js";
import { getCollaboratorAppPilotAccess, getCollaboratorAppRuntimeConfig } from "./collaborator-app-settings.js";
import { notifyOwner } from "./notification.js";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc.js";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  flags: protectedProcedure.query(async ({ ctx }) => ({
    admissionV2: isFeatureEnabled("admission-v2"),
    kanbanV2: isFeatureEnabled("kanban-v2"),
    collaboratorApp: await getCollaboratorAppPilotAccess(ctx.user),
  })),

  collaboratorAppConfig: adminProcedure.query(async () => {
    return getCollaboratorAppRuntimeConfig();
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
