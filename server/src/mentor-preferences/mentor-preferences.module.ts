import { Module } from '@nestjs/common';
import { MentorPreferencesService } from './mentor-preferences.service';
import { MentorPreferencesController } from './mentor-preferences.controller';
import { ProfilesModule } from '../profiles/profiles.module';
import { GroupsModule } from '../groups/groups.module';
import { MentorFormsModule } from '../mentor-forms/mentor-forms.module';

@Module({
  imports: [ProfilesModule, GroupsModule, MentorFormsModule],
  controllers: [MentorPreferencesController],
  providers: [MentorPreferencesService],
  exports: [MentorPreferencesService],
})
export class MentorPreferencesModule {}
