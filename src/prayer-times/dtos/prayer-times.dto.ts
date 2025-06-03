import { IsOptional, IsInt, IsNumber, IsNotEmpty } from 'class-validator';
import { LocationDto } from '@/prayer-times/dtos/location.dto';
import { Type } from 'class-transformer';

export class PrayerTimesQueryDto extends LocationDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  year: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  month: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  method?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  providerId?: number;
}
