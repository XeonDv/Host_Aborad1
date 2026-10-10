export function runMigrations(
  db: { query(sql: string, params?: unknown[]): Promise<any> },
  log?: (message: string) => void,
): Promise<void>;
