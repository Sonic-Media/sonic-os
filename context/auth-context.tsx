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
import { isApiAvailable } from "@/lib/data-source";
import { shouldUseApiDataSource } from "@/lib/env";
import { DEFAULT_OWNER_PASSWORD } from "@/lib/auth/password";
import { canImportHistoricalData, canManageRoles, canManageUsers } from "@/lib/auth/permissions";
import {
  hasValidationErrors,
  validateAppUserInput,
  validateAppUserUpdateInput,
  validateLoginInput,
  validatePasswordReset,
} from "@/lib/auth/validation";
import {
  clearSession,
  createSessionFromUser,
  getSession,
  getUsers,
  hashUserPassword,
  normalizeUserList,
  recordUserAction,
  saveSession,
  saveUsers,
  sortUsersByRole,
} from "@/lib/auth-storage";
import { verifyPassword } from "@/lib/auth/password";
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
  login: (input: LoginInput) => Promise<AuthValidationResult>;
  logout: () => void;
  lock: () => void;
  unlock: (password: string) => AuthValidationResult;
  recordAction: (action: string, detail: string) => void;
  addUser: (input: AppUserInput) => AuthValidationResult;
  updateUser: (id: string, input: AppUserUpdateInput) => AuthValidationResult;
  resetUserPassword: (id: string, password: string) => AuthValidationResult;
  disableUser: (id: string) => AuthValidationResult;
  enableUser: (id: string) => void;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [users, setUsers] = useState<AppUser[]>(() => getUsers());
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

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        if (shouldUseApiDataSource() && (await isApiAvailable())) {
          try {
            const payload = await fetchAuthSession();
            setSession(payload.session);
            setUsers(getUsers());
            setIsLoaded(true);
            return;
          } catch {
            // Fall back to local auth storage.
          }
        }

        setUsers(getUsers());
        setSession(getSession());
        setIsLoaded(true);
      })();
    });
  }, []);

  const persistUsers = useCallback((next: AppUser[]) => {
    const normalized = sortUsersByRole(normalizeUserList(next));
    saveUsers(normalized);
    usersRef.current = normalized;
    setUsers(normalized);
  }, []);

  const persistSession = useCallback((next: AuthSession | null) => {
    if (next) {
      saveSession(next);
    } else {
      clearSession();
    }
    sessionRef.current = next;
    setSession(next);
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

      if (shouldUseApiDataSource() && (await isApiAvailable())) {
        try {
          const nextSession = await loginApi(input);
          persistSession(nextSession);
          return createValidationResult({});
        } catch (error) {
          return createValidationResult({
            form:
              error instanceof Error
                ? error.message
                : "Invalid username or password.",
          });
        }
      }

      const username = input.username.trim().toLowerCase();
      const user = usersRef.current.find(
        (entry) => entry.username === username && entry.active
      );

      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        return createValidationResult({
          form: "Invalid username or password.",
        });
      }

      const nextSession = createSessionFromUser(user);
      persistSession(nextSession);
      recordUserAction("login", `${user.displayName} signed in`, nextSession);

      return createValidationResult({});
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    void (async () => {
      const current = sessionRef.current;
      if (shouldUseApiDataSource() && (await isApiAvailable())) {
        try {
          await logoutApi();
          persistSession(null);
          return;
        } catch {
          // Fall back to local logout below.
        }
      }

      if (current) {
        recordUserAction("logout", `${current.displayName} signed out`, current);
      }
      persistSession(null);
    })();
  }, [persistSession]);

  const lock = useCallback(() => {
    void (async () => {
      const current = sessionRef.current;
      if (!current) return;

      if (shouldUseApiDataSource() && (await isApiAvailable())) {
        try {
          const nextSession = await lockSessionApi();
          persistSession(nextSession);
          return;
        } catch {
          // Fall back to local lock below.
        }
      }

      const nextSession = { ...current, locked: true };
      persistSession(nextSession);
      recordUserAction("lock", `${current.displayName} locked the session`, nextSession);
    })();
  }, [persistSession]);

  const unlock = useCallback(
    (password: string): AuthValidationResult => {
      const current = sessionRef.current;
      if (!current) {
        return createValidationResult({ form: "Session not found." });
      }

      const user = usersRef.current.find((entry) => entry.id === current.userId);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return createValidationResult({ password: "Incorrect password." });
      }

      const nextSession = { ...current, locked: false };
      persistSession(nextSession);
      recordUserAction(
        "unlock",
        `${current.displayName} unlocked the session`,
        nextSession
      );

      return createValidationResult({});
    },
    [persistSession]
  );

  const addUser = useCallback(
    (input: AppUserInput): AuthValidationResult => {
      const errors = validateAppUserInput(input, usersRef.current);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const now = new Date().toISOString();
      const user: AppUser = {
        id: crypto.randomUUID(),
        username: input.username.trim().toLowerCase(),
        displayName: input.displayName.trim(),
        role: input.role,
        passwordHash: hashUserPassword(input.password),
        branch: input.branch,
        active: true,
        staffId: input.staffId,
        createdAt: now,
        updatedAt: now,
      };

      persistUsers([...usersRef.current, user]);

      recordAction(
        "user-created",
        `Created ${user.displayName} (${user.role})`
      );

      return createValidationResult({}, user);
    },
    [persistUsers, recordAction]
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

      persistUsers(
        usersRef.current.map((user) =>
          user.id === id
            ? {
                ...user,
                displayName: input.displayName.trim(),
                role: input.role,
                branch: input.branch,
                updatedAt: new Date().toISOString(),
              }
            : user
        )
      );

      recordAction(
        "user-updated",
        `Updated ${input.displayName.trim()} role to ${input.role}`
      );

      return createValidationResult({});
    },
    [persistUsers, recordAction]
  );

  const resetUserPassword = useCallback(
    (id: string, password: string): AuthValidationResult => {
      const existing = usersRef.current.find((user) => user.id === id);
      if (!existing) {
        return createValidationResult({ form: "User not found." });
      }

      const errors = validatePasswordReset(password);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      persistUsers(
        usersRef.current.map((user) =>
          user.id === id
            ? {
                ...user,
                passwordHash: hashUserPassword(password),
                updatedAt: new Date().toISOString(),
              }
            : user
        )
      );

      recordAction(
        "password-reset",
        `Reset password for ${existing.displayName}`
      );

      return createValidationResult({});
    },
    [persistUsers, recordAction]
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

      persistUsers(
        usersRef.current.map((user) =>
          user.id === id
            ? { ...user, active: false, updatedAt: new Date().toISOString() }
            : user
        )
      );

      recordAction("user-disabled", `Disabled ${existing.displayName}`);

      return createValidationResult({});
    },
    [persistUsers, recordAction]
  );

  const enableUser = useCallback(
    (id: string) => {
      const existing = usersRef.current.find((user) => user.id === id);
      if (!existing) return;

      persistUsers(
        usersRef.current.map((user) =>
          user.id === id
            ? { ...user, active: true, updatedAt: new Date().toISOString() }
            : user
        )
      );

      recordAction("user-enabled", `Re-enabled ${existing.displayName}`);
    },
    [persistUsers, recordAction]
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
