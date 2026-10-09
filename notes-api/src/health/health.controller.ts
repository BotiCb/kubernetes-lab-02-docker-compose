import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async check(): Promise<{ status: string; uptime: number; database: string }> {
    const result = {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      database: 'up',
    };
    if (!(await this.db.isHealthy())) {
      throw new ServiceUnavailableException({
        ...result,
        status: 'error',
        database: 'down',
      });
    }
    return result;
  }
}
