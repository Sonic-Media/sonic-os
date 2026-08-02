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
  enableUserApi,
  fetchUsers,
  resetUserPasswordApi,
  updateUserApi,
} from "@/lib/api/users";
import {
  loadRemoteOrLocal,
  runRemoteOrLocal,
  shouldUseRemoteDataSource,
} from "@/lib/data-source/context-api";
import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
import { DEFAULT_OWNER_PASSWORD } from "@/lib/auth/password";
import { canImportHistoricalData, canManageRoles, canManageUsers, canViewAuditLog } from "@/lib/auth/permissions";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { recordAuditEntry } from "@/lib/audit-log/record";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import {
  hasValidationErrors,
  validateAppUserInput,
  validateAppUserUpdateInput,
  validateLoginInput,
  validatePasswordReset,
} from "@/lib/auth/validation";
import { recordStaffAction, resolveStaffByUserId } from "@/lib/staff/audit";
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
  canViewAuditLog: boolean;
  login: (input: LoginInput) => Promise<AuthValidationResult>;
  logout: () => void;
  lock: () => void;
  unlock: (password: string) => Promise<AuthValidationResult>;
  recordAction: (action: string, detail: string) => void;
  addUser: (input: AppUserInput) => Promise<AuthValidationResult>;
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
        const result = await loadRemoteOrLocal({
          remote: async () => {
            const [payload, usersList] = await Promise.all([
              fetchAuthSession(),
              fetchUsers(),
            ]);
            return {
              session: payload.session,
              users: sortUsersByRole(normalizeUserList(usersList)),
            };
          },
          local: () => ({
            session: getSession(),
            users: sortUsersByRole(normalizeUserList(getUsers())),
          }),
        });

        setSession(result.session);
        setUsers(result.users);
        usersRef.current = result.users;
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

  const refreshUsersFromApi = useCallback(async () => {
    if (!(await shouldUseRemoteDataSource())) {
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
        const nextSession = await runRemoteOrLocal({
          remote: () => loginApi(input),
          local: () => {
            const username = input.username.trim().toLowerCase();
            const user = usersRef.current.find(
              (entry) => entry.username === username && entry.active
            );

            if (!user || !verifyPassword(input.password, user.passwordHash)) {
              recordUserAction(
                "login-failed",
                `Failed login attempt for ${username}`,
                {
                  userId: user?.id ?? "unknown",
                  username,
                  branch: user?.branch ?? DEFAULT_BRANCH_CODE,
                }
              );
              throw new Error("Invalid username or password.");
            }

            const session = createSessionFromUser(user);
            recordUserAction("login", `${user.displayName} signed in`, session);
            const linkedStaff = resolveStaffByUserId(user.id);
            if (linkedStaff) {
              recordStaffAction({
                staffId: linkedStaff.id,
                staffName: linkedStaff.name,
                role: linkedStaff.role,
                branch: linkedStaff.branch,
                action: AUDIT_ACTIONS.LOGIN,
                module: "auth",
              });
            }

            return session;
          },
        });

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
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    void (async () => {
      const current = sessionRef.current;

      try {
        await runRemoteOrLocal({
          remote: async () => {
            await logoutApi();
          },
          local: () => {
            if (current) {
              recordUserAction("logout", `${current.displayName} signed out`, current);
              const linkedStaff = resolveStaffByUserId(current.userId);
              if (linkedStaff) {
                recordStaffAction({
                  staffId: linkedStaff.id,
                  staffName: linkedStaff.name,
                  role: linkedStaff.role,
                  branch: linkedStaff.branch,
                  action: AUDIT_ACTIONS.LOGOUT,
                  module: "auth",
                });
              }
            }
          },
        });
      } catch {
        if (current) {
          recordUserAction("logout", `${current.displayName} signed out`, current);
          const linkedStaff = resolveStaffByUserId(current.userId);
          if (linkedStaff) {
            recordStaffAction({
              staffId: linkedStaff.id,
              staffName: linkedStaff.name,
              role: linkedStaff.role,
              branch: linkedStaff.branch,
              action: AUDIT_ACTIONS.LOGOUT,
              module: "auth",
            });
          }
        }
      }

      persistSession(null);
    })();
  }, [persistSession]);

  const lock = useCallback(() => {
    void (async () => {
      const current = sessionRef.current;
      if (!current) return;

      try {
        const nextSession = await runRemoteOrLocal({
          remote: () => lockSessionApi(),
          local: () => {
            recordUserAction(
              "lock",
              `${current.displayName} locked the session`,
              current
            );
            return { ...current, locked: true };
          },
        });

        persistSession(nextSession);
      } catch {
        const nextSession = { ...current, locked: true };
        persistSession(nextSession);
        recordUserAction("lock", `${current.displayName} locked the session`, current);
      }
    })();
  }, [persistSession]);

  const unlock = useCallback(
    async (password: string): Promise<AuthValidationResult> => {
      const current = sessionRef.current;
      if (!current) {
        return createValidationResult({ form: "Session not found." });
      }

      try {
        const nextSession = await runRemoteOrLocal({
          remote: () => unlockSessionApi(password),
          local: () => {
            const user = usersRef.current.find((entry) => entry.id === current.userId);
            if (!user || !verifyPassword(password, user.passwordHash)) {
              throw new Error("Incorrect password.");
            }

            return { ...current, locked: false };
          },
        });

        persistSession(nextSession);
        recordUserAction(
          "unlock",
          `${current.displayName} unlocked the session`,
          nextSession
        );

        return createValidationResult({});
      } catch (error) {
        return createValidationResult({
          password:
            error instanceof Error ? error.message : "Incorrect password.",
        });
      }
    },
    [persistSession]
  );

  const addUser = useCallback(
    async (input: AppUserInput): Promise<AuthValidationResult> => {
      const errors = validateAppUserInput(input, usersRef.current);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      try {
        const user = await runRemoteOrLocal({
          remote: () => createUserApi(input),
          local: () => {
            const now = new Date().toISOString();
            const created: AppUser = {
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

            persistUsers([...usersRef.current, created]);

            recordAction(
              "user-created",
              `Created ${created.displayName} (${created.role})`
            );
            recordAuditEntry({
              action: AUDIT_ACTIONS.CREATE,
              module: "settings",
              branch: created.branch,
              recordId: created.id,
              newValues: pickAuditFields(created, [
                "id",
                "username",
                "displayName",
                "role",
                "branch",
                "active",
              ]),
            });

            return created;
          },
        });

        if (await shouldUseRemoteDataSource()) {
          await refreshUsersFromApi();
        }

        return createValidationResult({}, user);
      } catch {
        return createValidationResult({ form: "Failed to create user." });
      }
    },
    [persistUsers, recordAction, refreshUsersFromApi]
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
        await runRemoteOrLocal({
          remote: async () => {
            await updateUserApi(id, input);
            await refreshUsersFromApi();
          },
          local: () => {
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

            const roleChanged = existing.role !== input.role;
            recordAuditEntry({
              action: roleChanged ? AUDIT_ACTIONS.ROLE_CHANGED : AUDIT_ACTIONS.EDIT,
              module: "settings",
              branch: input.branch,
              recordId: existing.id,
              oldValues: pickAuditFields(existing, [
                "displayName",
                "role",
                "branch",
                "active",
              ]),
              newValues: pickAuditFields(
                {
                  displayName: input.displayName.trim(),
                  role: input.role,
                  branch: input.branch,
                  active: existing.active,
                },
                ["displayName", "role", "branch", "active"]
              ),
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [persistUsers, recordAction, refreshUsersFromApi]
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

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            await resetUserPasswordApi(id, password);
            await refreshUsersFromApi();
          },
          local: () => {
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
          },
        });
      })();

      return createValidationResult({});
    },
    [persistUsers, recordAction, refreshUsersFromApi]
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
        await runRemoteOrLocal({
          remote: async () => {
            await disableUserApi(id);
            await refreshUsersFromApi();
          },
          local: () => {
            persistUsers(
              usersRef.current.map((user) =>
                user.id === id
                  ? { ...user, active: false, updatedAt: new Date().toISOString() }
                  : user
              )
            );

            recordAction("user-disabled", `Disabled ${existing.displayName}`);
            recordAuditEntry({
              action: AUDIT_ACTIONS.DEACTIVATE,
              module: "settings",
              branch: existing.branch,
              recordId: existing.id,
              oldValues: pickAuditFields(existing, ["displayName", "active"]),
              newValues: { active: false },
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [persistUsers, recordAction, refreshUsersFromApi]
  );

  const enableUser = useCallback(
    (id: string) => {
      const existing = usersRef.current.find((user) => user.id === id);
      if (!existing) return;

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            await enableUserApi(id);
            await refreshUsersFromApi();
          },
          local: () => {
            persistUsers(
              usersRef.current.map((user) =>
                user.id === id
                  ? { ...user, active: true, updatedAt: new Date().toISOString() }
                  : user
              )
            );

            recordAction("user-enabled", `Re-enabled ${existing.displayName}`);
            recordAuditEntry({
              action: AUDIT_ACTIONS.ACTIVATE,
              module: "settings",
              branch: existing.branch,
              recordId: existing.id,
              oldValues: pickAuditFields(existing, ["displayName", "active"]),
              newValues: { active: true },
            });
          },
        });
      })();
    },
    [persistUsers, recordAction, refreshUsersFromApi]
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
