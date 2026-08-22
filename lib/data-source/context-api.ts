"use client";

import { isApiAvailable } from "@/lib/data-source";
import {
  DataSourceUnavailableError,
  getDataSourceErrorMessage,
} from "@/lib/data-source/errors";
import { shouldUseApiDataSource } from "@/lib/env";

export { DataSourceUnavailableError, getDataSourceErrorMessage };

export async function shouldUseRemoteDataSource(): Promise<boolean> {
  return shouldUseApiDataSource() && (await isApiAvailable());
}

export async function assertRemoteDataSourceAvailable(): Promise<void> {
  if (!shouldUseApiDataSource()) {
    throw new DataSourceUnavailableError(
      "Business data requires the API data source. Set NEXT_PUBLIC_USE_API=true."
    );
  }

  if (!(await isApiAvailable())) {
    throw new DataSourceUnavailableError(
      "PostgreSQL is unavailable. Business data cannot be loaded or saved."
    );
  }
}

export async function loadFromApi<T>(remote: () => Promise<T>): Promise<T> {
  await assertRemoteDataSourceAvailable();

  try {
    return await remote();
  } catch (error) {
    if (error instanceof DataSourceUnavailableError) {
      throw error;
    }

    throw new DataSourceUnavailableError(getDataSourceErrorMessage(error));
  }
}

export async function runOnApi<T>(remote: () => Promise<T>): Promise<T> {
  return loadFromApi(remote);
}
