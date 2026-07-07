import { Module } from '@nestjs/common';
import { MentorFormsService } from './mentor-forms.service';
import { MentorFormsController } from './mentor-forms.controller';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [ProfilesModule],
  controllers: [MentorFormsController],
  providers: [MentorFormsService],
  exports: [MentorFormsService],
})
export class MentorFormsModule {}
