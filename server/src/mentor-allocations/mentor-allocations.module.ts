import { Module } from '@nestjs/common';
import { MentorAllocationsService } from './mentor-allocations.service';
import { MentorAllocationsController } from './mentor-allocations.controller';
import { ProfilesModule } from '../profiles/profiles.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [ProfilesModule, GroupsModule],
  controllers: [MentorAllocationsController],
  providers: [MentorAllocationsService],
  exports: [MentorAllocationsService],
})
export class MentorAllocationsModule {}
