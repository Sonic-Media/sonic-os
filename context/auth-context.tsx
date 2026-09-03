"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  fetchAuthSession,
  lockSessionApi,
  loginApi,
  logoutApi,
  unlockSessionApi,
} from "@/lib/api/auth";
import {
  createUserApi,
  disableUserApi,
  deleteUserApi,
  enableUserApi,
  fetchUsers,
  resetUserPasswordApi,
  updateUserApi,
} from "@/lib/api/users";
import { ApiError } from "@/lib/api/errors";
import { getDataSourceErrorMessage } from "@/lib/data-source/context-api";
import { setClientSession } from "@/lib/client/session-registry";
import { DEFAULT_OWNER_PASSWORD } from "@/lib/auth/password";
import {
  canImportHistoricalData,
  canManageRoles,
  canManageUsers,
  canViewAuditLog,
} from "@/lib/auth/permissions";
import {
  hasValidationErrors,
  validateAppUserInput,
  validateAppUserUpdateInput,
  validateLoginInput,
  validatePasswordReset,
} from "@/lib/auth/validation";
import {
  clearSession,
  normalizeUserList,
  recordUserAction,
  sortUsersByRole,
} from "@/lib/auth-storage";
import type {
  AppUser,
  AppUserInput,
  AppUserUpdateInput,
  AuthSession,
  AuthValidationResult,
  LoginInput,
} from "@/types/auth";

interface AuthContextValue {
  session: AuthSession | null;
  users: AppUser[];
  isLoaded: boolean;
  isAuthenticated: boolean;
  isLocked: boolean;
  canManageUsers: boolean;
  canImportHistoricalData: boolean;
  canManageRoles: boolean;
  canViewAuditLog: boolean;
  login: (input: LoginInput) => Promise<AuthValidationResult>;
  logout: () => void;
  lock: () => void;
  unlock: (password: string) => Promise<AuthValidationResult>;
  recordAction: (action: string, detail: string) => void;
  addUser: (input: AppUserInput) => Promise<AuthValidationResult>;
  updateUser: (id: string, input: AppUserUpdateInput) => AuthValidationResult;
  resetUserPassword: (id: string, password: string) => Promise<AuthValidationResult>;
  disableUser: (id: string) => AuthValidationResult;
  enableUser: (id: string) => void;
  deleteUser: (id: string) => Promise<AuthValidationResult>;
  getUserById: (id: string) => AppUser | undefined;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function createValidationResult(
  errors: Record<string, string | undefined>,
  user?: AppUser
): AuthValidationResult {
  return {
    success: !hasValidationErrors(errors),
    errors,
    user,
  };
}

function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const usersRef = useRef(users);
  const sessionRef = useRef(session);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const applySession = useCallback(async (next: AuthSession | null) => {
    sessionRef.current = next;
    setSession(next);
    setClientSession(next);
    clearSession();
  }, []);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        try {
          clearSession();

          const payload = await fetchAuthSession();
          await applySession(payload.session);

          if (payload.session) {
            const usersList = await fetchUsers();
            const normalized = sortUsersByRole(
              normalizeUserList(usersList)
            );
            usersRef.current = normalized;
            setUsers(normalized);
          } else {
            usersRef.current = [];
            setUsers([]);
          }
        } catch (error) {
          console.error("[auth] failed to load session:", error);
          sessionRef.current = null;
          setSession(null);
          usersRef.current = [];
          setUsers([]);
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [applySession]);

  const refreshUsersFromApi = useCallback(async () => {
    if (!sessionRef.current) {
      return;
    }

    const remoteUsers = await fetchUsers();
    const normalized = sortUsersByRole(normalizeUserList(remoteUsers));
    usersRef.current = normalized;
    setUsers(normalized);
  }, []);

  const getUserById = useCallback(
    (id: string) => usersRef.current.find((user) => user.id === id),
    []
  );

  const recordAction = useCallback((action: string, detail: string) => {
    recordUserAction(action, detail, sessionRef.current ?? undefined);
  }, []);

  const login = useCallback(
    async (input: LoginInput): Promise<AuthValidationResult> => {
      const errors = validateLoginInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      try {
        const nextSession = await loginApi(input);
        await applySession(nextSession);
        await refreshUsersFromApi();
        return createValidationResult({});
      } catch (error) {
        return createValidationResult({
          form: getAuthErrorMessage(error, "Invalid username or password."),
        });
      }
    },
    [applySession, refreshUsersFromApi]
  );

  const logout = useCallback(() => {
    void (async () => {
      try {
        await logoutApi();
      } catch (error) {
        console.error("[auth] logout failed:", getDataSourceErrorMessage(error));
      }

      await applySession(null);
      usersRef.current = [];
      setUsers([]);
    })();
  }, [applySession]);

  const lock = useCallback(() => {
    void (async () => {
      const current = sessionRef.current;
      if (!current) return;

      try {
        const nextSession = await lockSessionApi();
        await applySession(nextSession);
      } catch (error) {
        console.error("[auth] lock failed:", getDataSourceErrorMessage(error));
      }
    })();
  }, [applySession]);

  const unlock = useCallback(
    async (password: string): Promise<AuthValidationResult> => {
      const current = sessionRef.current;
      if (!current) {
        return createValidationResult({ form: "Session not found." });
      }

      try {
        const nextSession = await unlockSessionApi(password);
        await applySession(nextSession);
        recordUserAction(
          "unlock",
          `${current.displayName} unlocked the session`,
          nextSession
        );

        return createValidationResult({});
      } catch (error) {
        return createValidationResult({
          password: getAuthErrorMessage(error, "Incorrect password."),
        });
      }
    },
    [applySession]
  );

  const addUser = useCallback(
    async (input: AppUserInput): Promise<AuthValidationResult> => {
      const errors = validateAppUserInput(input, usersRef.current);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      try {
        const user = await createUserApi(input);
        await refreshUsersFromApi();
        return createValidationResult({}, user);
      } catch (error) {
        return createValidationResult({
          form: getAuthErrorMessage(error, "Failed to create user."),
        });
      }
    },
    [refreshUsersFromApi]
  );

  const updateUser = useCallback(
    (id: string, input: AppUserUpdateInput): AuthValidationResult => {
      const existing = usersRef.current.find((user) => user.id === id);
      if (!existing) {
        return createValidationResult({ form: "User not found." });
      }

      const errors = validateAppUserUpdateInput(input, existing.role);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      void (async () => {
        try {
          await updateUserApi(id, input);
          await refreshUsersFromApi();
        } catch (error) {
          console.error("[auth] update user failed:", getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshUsersFromApi]
  );

  const resetUserPassword = useCallback(
    async (id: string, password: string): Promise<AuthValidationResult> => {
      const existing = usersRef.current.find((user) => user.id === id);
      if (!existing) {
        return createValidationResult({ form: "User not found." });
      }

      const errors = validatePasswordReset(password);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      try {
        await resetUserPasswordApi(id, password);
        await refreshUsersFromApi();
        return createValidationResult({});
      } catch (error) {
        return createValidationResult({
          form: getAuthErrorMessage(error, "Unable to reset password."),
        });
      }
    },
    [refreshUsersFromApi]
  );

  const disableUser = useCallback(
    (id: string): AuthValidationResult => {
      const existing = usersRef.current.find((user) => user.id === id);
      if (!existing) {
        return createValidationResult({ form: "User not found." });
      }

      if (existing.role === "owner") {
        return createValidationResult({
          form: "The owner account cannot be disabled.",
        });
      }

      void (async () => {
        try {
          await disableUserApi(id);
          await refreshUsersFromApi();
        } catch (error) {
          console.error("[auth] disable user failed:", getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshUsersFromApi]
  );

  const enableUser = useCallback(
    (id: string) => {
      const existing = usersRef.current.find((user) => user.id === id);
      if (!existing) return;

      void (async () => {
        try {
          await enableUserApi(id);
          await refreshUsersFromApi();
        } catch (error) {
          console.error("[auth] enable user failed:", getDataSourceErrorMessage(error));
        }
      })();
    },
    [refreshUsersFromApi]
  );

  const deleteUser = useCallback(
    async (id: string): Promise<AuthValidationResult> => {
      const existing = usersRef.current.find((user) => user.id === id);
      if (!existing) {
        return createValidationResult({ form: "User not found." });
      }

      if (existing.role === "owner") {
        return createValidationResult({
          form: "The owner account cannot be deleted.",
        });
      }

      try {
        await deleteUserApi(id);
        await refreshUsersFromApi();
        return createValidationResult({});
      } catch (error) {
        return createValidationResult({
          form: getAuthErrorMessage(error, "Failed to delete user."),
        });
      }
    },
    [refreshUsersFromApi]
  );

  const value = useMemo(
    () => ({
      session,
      users,
      isLoaded,
      isAuthenticated: Boolean(session),
      isLocked: Boolean(session?.locked),
      canManageUsers: session ? canManageUsers(session.role) : false,
      canImportHistoricalData: session
        ? canImportHistoricalData(session.role)
        : false,
      canManageRoles: session ? canManageRoles(session.role) : false,
      canViewAuditLog: session ? canViewAuditLog(session.role) : false,
      login,
      logout,
      lock,
      unlock,
      recordAction,
      addUser,
      updateUser,
      resetUserPassword,
      disableUser,
      enableUser,
      deleteUser,
      getUserById,
    }),
    [
      session,
      users,
      isLoaded,
      login,
      logout,
      lock,
      unlock,
      recordAction,
      addUser,
      updateUser,
      resetUserPassword,
      disableUser,
      enableUser,
      deleteUser,
      getUserById,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { DEFAULT_OWNER_PASSWORD };
