"use client";

import { useMemo, useState } from "react";
import {
  getPersonalizedGreetingLine,
  getRandomRoleSubtitle,
  mapAuthRoleToGreetingRole,
  type GreetingRole,
} from "@/lib/ux/greeting";
import { cn } from "@/lib/utils";

interface PersonalGreetingProps {
  name: string;
  role?: GreetingRole;
  showSubtitle?: boolean;
  className?: string;
  align?: "left" | "center";
}

export function PersonalGreeting({
  name,
  role,
  showSubtitle = true,
  className,
  align = "left",
}: PersonalGreetingProps) {
  const greetingLine = getPersonalizedGreetingLine(name);
  const [subtitle] = useState(() =>
    role ? getRandomRoleSubtitle(role) : undefined
  );

  return (
    <div
      className={cn(
        align === "center" && "text-center",
        className
      )}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {greetingLine} 👋
      </h1>
      {showSubtitle && subtitle ? (
        <p className="mt-3 text-sm text-zinc-400">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function usePersonalGreeting(
  name: string,
  authRole?: import("@/types/auth").UserRole
) {
  return useMemo(() => {
    const role = authRole ? mapAuthRoleToGreetingRole(authRole) : undefined;
    return {
      greetingLine: getPersonalizedGreetingLine(name),
      subtitle: role ? getRandomRoleSubtitle(role) : undefined,
      role,
    };
  }, [name, authRole]);
}
