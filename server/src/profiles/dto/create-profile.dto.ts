import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateProfileDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(['student', 'faculty', 'super_admin'])
  role: 'student' | 'faculty' | 'super_admin';

  @IsEnum(['IT', 'CS', 'ECS', 'ETC', 'BM'])
  department: 'IT' | 'CS' | 'ECS' | 'ETC' | 'BM';

  @IsOptional()
  @IsString()
  rollNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  semester?: number;

  @IsOptional()
  @IsString()
  accessCode?: string;

  @IsOptional()
  @IsString()
  domains?: string;
}
