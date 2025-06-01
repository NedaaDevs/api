import { IsOptional, IsInt } from 'class-validator';
import { LocationDto } from '@/prayer-times/dtos/location.dto';
import { Type } from 'class-transformer';

export class PrayerTimesQueryDto extends LocationDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  method?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  providerId?: number;
}
