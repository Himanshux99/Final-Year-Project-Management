import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateDomainDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
