import { IsOptional, IsInt, IsNumber, IsNotEmpty } from 'class-validator';
import { LocationDto } from '@/prayer-times/dtos/location.dto';
import { Type } from 'class-transformer';

/**
 * Base DTO for prayer times queries
 * Contains only provider-agnostic parameters
 */
export class PrayerTimesQueryDto extends LocationDto {
  /**
   * ID of the prayer times provider
   * 1: Aladhan
   */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  providerId?: number;
}
