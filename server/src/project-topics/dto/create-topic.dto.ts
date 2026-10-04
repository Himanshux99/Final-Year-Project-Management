import { IsString, IsNotEmpty, MaxLength, IsArray, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';

// Multipart bodies send a single repeated field as a plain string, so normalise to an array.
export const toArray = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? value
    : Array.isArray(value)
      ? value
      : [value];

export class CreateTopicDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Transform(toArray)
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one domain' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  domainIds: string[];
}
