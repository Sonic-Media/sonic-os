"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { PageContainer } from "@/components/shared/layout/page-container";
import { DEFAULT_OWNER_PASSWORD, useAuth } from "@/context/auth-context";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    void (async () => {
      const result = await login({ username, password });
      if (!result.success) {
        setErrors(result.errors);
        return;
      }

      router.replace("/");
    })();
  }

  return (
    <PageContainer className="max-w-md">
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="w-full space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Sign in</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Local Sonic OS authentication
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setErrors((current) => ({
                  ...current,
                  username: undefined,
                  form: undefined,
                }));
              }}
              autoComplete="username"
            />
            {errors.username && (
              <p className="text-xs text-red-400">{errors.username}</p>
            )}

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({
                  ...current,
                  password: undefined,
                  form: undefined,
                }));
              }}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password}</p>
            )}

            {errors.form && (
              <p className="text-xs text-red-400">{errors.form}</p>
            )}

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <p className="text-xs text-zinc-500">
            Default owner login: username <span className="text-zinc-400">owner</span>, password{" "}
            <span className="text-zinc-400">{DEFAULT_OWNER_PASSWORD}</span>
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
