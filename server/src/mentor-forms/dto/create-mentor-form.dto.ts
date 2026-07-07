import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class CreateMentorFormDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  availableMentorIds: string[];
}
