import { Module } from '@nestjs/common';
import { ProjectTopicsController } from './project-topics.controller';
import { ProjectTopicsService } from './project-topics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [PrismaModule, ProfilesModule, GroupsModule],
  controllers: [ProjectTopicsController],
  providers: [ProjectTopicsService],
  exports: [ProjectTopicsService],
})
export class ProjectTopicsModule {}
