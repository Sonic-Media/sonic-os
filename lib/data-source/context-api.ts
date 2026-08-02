"use client";

import { isApiAvailable } from "@/lib/data-source";
import { shouldUseApiDataSource } from "@/lib/env";

export async function shouldUseRemoteDataSource(): Promise<boolean> {
  return shouldUseApiDataSource() && (await isApiAvailable());
}

export async function loadRemoteOrLocal<T>(options: {
  remote: () => Promise<T>;
  local: () => T;
}): Promise<T> {
  if (await shouldUseRemoteDataSource()) {
    try {
      return await options.remote();
    } catch {
      // Fall back to local storage when API is unavailable.
    }
  }

  return options.local();
}

export async function runRemoteOrLocal<T>(options: {
  remote: () => Promise<T>;
  local: () => T;
}): Promise<T> {
  if (await shouldUseRemoteDataSource()) {
    try {
      return await options.remote();
    } catch {
      // Fall back to local persistence below.
    }
  }

  return options.local();
}
