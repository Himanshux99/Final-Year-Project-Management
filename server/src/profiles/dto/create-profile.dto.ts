import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNumber,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

// e.g. 24101B0035 = 24 (admission year) + 101 (branch code) + B (division) + 0035 (roll no.)
export const ROLL_NUMBER_REGEX = /^\d{2}\d{3}[A-Z]\d{4}$/;

export class CreateProfileDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  // Self-onboarding is for students only; faculty accounts are created by a super admin.
  @IsEnum(['student'], { message: 'Only students can create a profile themselves' })
  role: 'student';

  @IsEnum(['IT', 'CS', 'ECS', 'ETC', 'BM'])
  department: 'IT' | 'CS' | 'ECS' | 'ETC' | 'BM';

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(ROLL_NUMBER_REGEX, {
    message:
      'Roll number must look like 24101B0035: 2-digit admission year, 3-digit branch code, 1 division letter, 4-digit roll number',
  })
  rollNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  semester?: number;
}
