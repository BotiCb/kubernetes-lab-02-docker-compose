import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [DatabaseModule, NotesModule],
  controllers: [HealthController],
})
export class AppModule {}
