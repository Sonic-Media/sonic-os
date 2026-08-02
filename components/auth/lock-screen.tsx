"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { PageContainer } from "@/components/shared/layout/page-container";
import { useAuth } from "@/context/auth-context";

export function LockScreen() {
  const router = useRouter();
  const { session, unlock, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = unlock(password);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    router.replace("/");
  }

  return (
    <PageContainer className="max-w-md">
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="w-full space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Session Locked</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {session?.displayName ?? "User"} · enter your password to continue
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined }));
              }}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password}</p>
            )}

            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>

          <Button type="button" variant="secondary" className="w-full" onClick={logout}>
            Sign Out
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}
