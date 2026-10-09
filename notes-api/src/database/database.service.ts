import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import { Pool, QueryResult, QueryResultRow } from 'pg';

const CONNECT_ATTEMPTS = 10;
const CONNECT_DELAY_MS = 2_000;

/**
 * Owns the PostgreSQL connection pool. Connection settings come from the
 * standard libpq variables (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE),
 * so in compose PGHOST is simply the database container's name.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool = new Pool({ max: 10 });

  async onModuleInit(): Promise<void> {
    await this.waitForDatabase();
    await this.migrate();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /** depends_on already waits for the healthcheck, this covers restarts of the DB alone. */
  private async waitForDatabase(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.pool.query('SELECT 1');
        this.logger.log(`Connected to PostgreSQL at ${process.env.PGHOST}`);
        return;
      } catch (error) {
        if (attempt === CONNECT_ATTEMPTS) {
          throw error;
        }
        this.logger.warn(
          `PostgreSQL not reachable (attempt ${attempt}/${CONNECT_ATTEMPTS}), retrying`,
        );
        await sleep(CONNECT_DELAY_MS);
      }
    }
  }

  private async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id         uuid PRIMARY KEY,
        title      varchar(120) NOT NULL,
        body       text NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      )
    `);
  }
}
