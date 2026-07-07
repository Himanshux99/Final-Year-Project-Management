import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const rawUrl =
      process.env.DATABASE_URL || process.env.DIRECT_URL || '<not set>';
    const maskedUrl =
      typeof rawUrl === 'string'
        ? rawUrl.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@')
        : rawUrl;
    this.logger.log(`Connecting to database: ${maskedUrl}`);

    try {
      // Race between Prisma connect and a short timeout so the process doesn't hang forever
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Database connection timeout (10s)')),
            10000,
          ),
        ),
      ]);

      this.logger.log('Database connection established');
    } catch (err) {
      this.logger.error('Database connection failed', err as Error);
      // Throw so Nest sees the failure and the app fails fast
      throw err;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected');
    } catch (err) {
      this.logger.error('Error during database disconnect', err as Error);
    }
  }
}
