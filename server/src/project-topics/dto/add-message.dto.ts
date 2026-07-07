import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class AddTopicMessageDto {
  @IsString()
  @IsNotEmpty()
  topicId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsOptional()
  links?: string[];

  @IsString()
  @IsOptional()
  groupId?: string; // Optional: for faculty sending general messages
}
