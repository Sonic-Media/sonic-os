export class DataSourceUnavailableError extends Error {
  constructor(
    message = "PostgreSQL is unavailable. Business data requires the API and database."
  ) {
    super(message);
    this.name = "DataSourceUnavailableError";
  }
}

import { isApiError } from "@/lib/api/errors";

export function getDataSourceErrorMessage(error: unknown): string {
  if (error instanceof DataSourceUnavailableError) {
    return error.message;
  }

  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Business data request failed.";
}
