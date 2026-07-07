import { IsString, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class SubmitPreferencesDto {
  @IsString()
  formId: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  mentorChoices: [string, string, string];
}
