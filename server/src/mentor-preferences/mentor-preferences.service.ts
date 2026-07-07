import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { GroupsService } from '../groups/groups.service';
import { MentorFormsService } from '../mentor-forms/mentor-forms.service';
import { SubmitPreferencesDto } from './dto/submit-preferences.dto';

@Injectable()
export class MentorPreferencesService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
    private groupsService: GroupsService,
    private mentorFormsService: MentorFormsService,
  ) {}

  async submitPreferences(userId: string, submitDto: SubmitPreferencesDto) {
    const { formId, mentorChoices } = submitDto;

    // Validate mentor choices
    if (mentorChoices.length !== 3) {
      throw new BadRequestException('Exactly 3 mentor choices are required');
    }

    // Check for duplicates
    const uniqueChoices = new Set(mentorChoices);
    if (uniqueChoices.size !== 3) {
      throw new BadRequestException('Mentor choices must be unique');
    }

    // Get user profile
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'student') {
      throw new ForbiddenException(
        'Only students can submit mentor preferences',
      );
    }

    // Get user's group
    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      throw new BadRequestException(
        'You must be in a group to submit preferences',
      );
    }

    // Check if user is the group leader
    if (group.createdBy !== profile.id) {
      throw new ForbiddenException(
        'Only the group leader can submit preferences',
      );
    }

    // Validate form exists and is active
    const form = await this.mentorFormsService.findById(formId);
    if (!form) {
      throw new NotFoundException('Mentor allocation form not found');
    }

    if (!form.isActive) {
      throw new BadRequestException('This form is no longer active');
    }

    if (form.department !== profile.department) {
      throw new ForbiddenException(
        'Cannot submit to forms from other departments',
      );
    }

    // Check if preferences already submitted
    const existingPreference = await this.prisma.mentorPreference.findUnique({
      where: {
        groupId_formId: {
          groupId: group.id,
          formId,
        },
      },
    });

    if (existingPreference) {
      throw new BadRequestException(
        'Preferences already submitted for this group',
      );
    }

    // Validate mentor choices are in the available mentors
    const availableMentorIds = form.availableMentors.map((am) => am.mentorId);
    for (const mentorId of mentorChoices) {
      if (!availableMentorIds.includes(mentorId)) {
        throw new BadRequestException('Invalid mentor selection');
      }
    }

    // Create preference and allocations in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create mentor preference
      const preference = await tx.mentorPreference.create({
        data: {
          groupId: group.id,
          formId,
          mentorChoice1: mentorChoices[0],
          mentorChoice2: mentorChoices[1],
          mentorChoice3: mentorChoices[2],
          submittedBy: profile.id,
        },
      });

      // Create mentor allocations (only 1st choice is pending, others wait)
      for (let i = 0; i < mentorChoices.length; i++) {
        await tx.mentorAllocation.create({
          data: {
            groupId: group.id,
            mentorId: mentorChoices[i],
            formId,
            preferenceRank: i + 1,
            status: i === 0 ? 'pending' : 'waiting',
          },
        });
      }

      return preference;
    });

    return result;
  }

  async getByGroup(groupId: string) {
    return this.prisma.mentorPreference.findFirst({
      where: { groupId },
      include: {
        group: true,
        form: true,
      },
    });
  }

  async getMyPreferences(userId: string) {
    const group = await this.groupsService.getMyGroup(userId);
    if (!group) {
      return null;
    }

    return this.getByGroup(group.id);
  }

  async hasSubmittedPreferences(userId: string) {
    const preferences = await this.getMyPreferences(userId);
    return !!preferences;
  }
}
