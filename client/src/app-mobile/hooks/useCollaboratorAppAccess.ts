import { trpc } from "@/lib/trpc";
import { collaboratorAppEnabled } from "../config";

export function useCollaboratorAppAccess() {
  const flagsQuery = trpc.system.flags.useQuery(undefined, {
    enabled: collaboratorAppEnabled,
    staleTime: 30000,
    retry: false,
  });

  const access = flagsQuery.data?.collaboratorApp;

  return {
    ...flagsQuery,
    access,
    isAvailable: collaboratorAppEnabled && (access?.enabled ?? false),
    reason: access?.reason ?? (collaboratorAppEnabled ? "loading" : "feature_disabled"),
  };
}
