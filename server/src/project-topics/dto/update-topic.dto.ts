import { IsOptional, IsString, IsArray, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';
import { toArray } from './create-topic.dto';

export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one domain' })
  @IsString({ each: true })
  domainIds?: string[];
}
