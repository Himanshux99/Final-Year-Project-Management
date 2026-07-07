import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TopicApprovalController } from './topic-approval.controller';
import { TopicApprovalService } from './topic-approval.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { GroupsModule } from '../groups/groups.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    PrismaModule,
    ProfilesModule,
    GroupsModule,
    SupabaseModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [TopicApprovalController],
  providers: [TopicApprovalService],
  exports: [TopicApprovalService],
})
export class TopicApprovalModule {}
