export interface ParsedDatabaseUrl {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
  schema: string;
}

export function parseDatabaseUrl(connectionString: string): ParsedDatabaseUrl {
  let url: URL;

  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(
      `DATABASE_URL must use the postgresql:// scheme (received "${url.protocol}").`
    );
  }

  const database = url.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  const user = decodeURIComponent(url.username);
  if (!user) {
    throw new Error("DATABASE_URL must include a database user.");
  }

  return {
    user,
    password: decodeURIComponent(url.password),
    host: url.hostname || "localhost",
    port: url.port || "5432",
    database,
    schema: url.searchParams.get("schema") || "public",
  };
}

export function sanitizeDatabaseName(database: string): string {
  return database.replace(/[^a-zA-Z0-9_-]+/g, "-");
}
