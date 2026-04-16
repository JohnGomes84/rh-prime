import { trpc } from "@/lib/trpc";
import { isOAuthConfigured } from "@/const";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

const LOCAL_FALLBACK_USER = {
  id: 1,
  openId: "local-admin",
  name: "Administrador Local",
  email: "adm@mlservicoseco.com.br",
  loginMethod: "local",
  role: "admin",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  lastSignedIn: new Date(0),
};

export function useAuth(options?: UseAuthOptions) {
  const redirectOnUnauthenticated =
    options?.redirectOnUnauthenticated ?? false;
  const redirectPath = options?.redirectPath;
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const localMode = !isOAuthConfigured();
    const user =
      meQuery.data ??
      (localMode && !meQuery.isLoading ? LOCAL_FALLBACK_USER : null);
    const error = localMode ? null : meQuery.error ?? logoutMutation.error ?? null;

    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(user)
    );

    return {
      user,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error,
      isAuthenticated: Boolean(user),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    const targetPath = redirectPath;
    if (targetPath === "#") return;
    if (!targetPath) return;
    if (window.location.pathname === targetPath) return;

    window.location.href = targetPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
