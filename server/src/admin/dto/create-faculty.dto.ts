import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const toArray = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? value
    : Array.isArray(value)
      ? value
      : [value];

export class CreateFacultyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  // Full login email, including the domain the admin chooses.
  @IsEmail()
  email: string;

  // Initial password; the faculty member can change it after logging in.
  @IsString()
  @MinLength(6)
  password: string;

  // Ids of domains from the admin-managed Domain list.
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  domainIds?: string[];
}

export class UpdateFacultyDomainsDto {
  // Replaces the faculty's domains; an empty array clears them.
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  domainIds: string[];
}
