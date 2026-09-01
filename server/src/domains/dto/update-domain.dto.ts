import { IsBoolean, IsOptional, IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class UpdateDomainDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
