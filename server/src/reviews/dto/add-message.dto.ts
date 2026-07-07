import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class AddReviewMessageDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsOptional()
  links?: string[];
}
