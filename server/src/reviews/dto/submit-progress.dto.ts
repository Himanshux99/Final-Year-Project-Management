import { IsInt, IsString, IsNotEmpty, Min, Max } from 'class-validator';

export class SubmitProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercentage: number;

  @IsString()
  @IsNotEmpty()
  progressDescription: string;
}
