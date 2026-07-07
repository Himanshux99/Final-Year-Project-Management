import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateMentorFormDto } from './dto/create-mentor-form.dto';
import { Department } from '@prisma/client';

@Injectable()
export class MentorFormsService {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
  ) {}

  async create(userId: string, createFormDto: CreateMentorFormDto) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can create mentor allocation forms');
    }

    if (createFormDto.availableMentorIds.length === 0) {
      throw new BadRequestException('Please select at least one mentor');
    }

    // Deactivate any existing active forms for this department
    await this.prisma.mentorAllocationForm.updateMany({
      where: {
        department: profile.department,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create new form with available mentors
    const form = await this.prisma.mentorAllocationForm.create({
      data: {
        department: profile.department,
        createdBy: profile.id,
        isActive: true,
        availableMentors: {
          create: createFormDto.availableMentorIds.map(mentorId => ({
            mentorId,
          })),
        },
      },
      include: {
        availableMentors: {
          include: {
            mentor: true,
          },
        },
      },
    });

    return form;
  }

  async getActiveForm(department: Department) {
    const form = await this.prisma.mentorAllocationForm.findFirst({
      where: {
        department,
        isActive: true,
      },
      include: {
        availableMentors: {
          include: {
            mentor: true,
          },
        },
      },
    });

    return form;
  }

  async getActiveFormForUser(userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      return null;
    }

    return this.getActiveForm(profile.department);
  }

  async findById(id: string) {
    return this.prisma.mentorAllocationForm.findUnique({
      where: { id },
      include: {
        availableMentors: {
          include: {
            mentor: true,
          },
        },
      },
    });
  }

  async deactivateForm(userId: string, formId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    if (profile.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can deactivate forms');
    }

    const form = await this.prisma.mentorAllocationForm.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (form.department !== profile.department) {
      throw new ForbiddenException('Cannot deactivate forms from other departments');
    }

    return this.prisma.mentorAllocationForm.update({
      where: { id: formId },
      data: { isActive: false },
    });
  }
}
