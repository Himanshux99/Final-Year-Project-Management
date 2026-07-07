import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReviewType } from '@prisma/client';

export class RolloutReviewDto {
  @IsEnum(['review_1', 'review_2', 'final_review'])
  @IsNotEmpty()
  reviewType: ReviewType;
}
