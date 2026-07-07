import { IsString, IsNotEmpty } from 'class-validator';

export class SubmitFeedbackDto {
  @IsString()
  @IsNotEmpty()
  feedback: string;
}
