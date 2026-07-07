import { IsString, IsNotEmpty } from 'class-validator';

export class SetMeetLinkDto {
  @IsString()
  @IsNotEmpty()
  meetLink: string;
}
