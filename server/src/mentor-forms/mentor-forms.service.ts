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

  // Loads a form the calling super admin is allowed to manage (own department only).
  private async getManageableForm(userId: string, formId: string, action: string) {
    const profile = await this.profilesService.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }
    if (profile.role !== 'super_admin') {
      throw new ForbiddenException(`Only super admins can ${action} forms`);
    }

    const form = await this.prisma.mentorAllocationForm.findUnique({
      where: { id: formId },
    });
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    if (form.department !== profile.department) {
      throw new ForbiddenException(`Cannot ${action} forms from other departments`);
    }
    // Holds manual-assignment records, not a real published form.
    if (form.id.startsWith('manual-allocation-')) {
      throw new BadRequestException('This system form cannot be modified');
    }
    return form;
  }

  // What would be lost if the form were deleted - shown in the confirmation dialog.
  async getFormSummary(userId: string, formId: string) {
    await this.getManageableForm(userId, formId, 'view');

    const [preferences, allocations, acceptedAllocations] = await Promise.all([
      this.prisma.mentorPreference.count({ where: { formId } }),
      this.prisma.mentorAllocation.count({ where: { formId } }),
      this.prisma.mentorAllocation.count({ where: { formId, status: 'accepted' } }),
    ]);

    return { preferences, allocations, acceptedAllocations };
  }

  // Permanently removes the form and, via FK cascade, every preference submission,
  // allocation (including accepted mentor assignments) and available-mentor row.
  async deleteForm(userId: string, formId: string) {
    await this.getManageableForm(userId, formId, 'delete');

    const summary = await this.getFormSummary(userId, formId);
    await this.prisma.mentorAllocationForm.delete({ where: { id: formId } });

    return { message: 'Form deleted successfully', deleted: summary };
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
