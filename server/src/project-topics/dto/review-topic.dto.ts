import { IsString, IsNotEmpty } from 'class-validator';

export class ReviewTopicDto {
  @IsString()
  @IsNotEmpty()
  feedback?: string;
}
