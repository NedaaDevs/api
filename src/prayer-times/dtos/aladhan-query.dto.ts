import {
  IsOptional,
  IsInt,
  IsString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrayerTimesQueryDto } from '@/prayer-times/dtos/prayer-times.dto';

export class AladhanQueryDto extends PrayerTimesQueryDto {
  /**
   * Calculation method for prayer times
   * @see https://aladhan.com/calculation-methods
   */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  method?: number;

  /**
   * Juristic school for Asr prayer calculation
   * 0: Shafi'i, Maliki, Hanbali (standard)
   * 1: Hanafi
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  school?: number;

  /**
   * Method to calculate midnight time
   * 0: Standard (mid Sunset to Sunrise)
   * 1: Jafari (mid Sunset to Fajr)
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  midnightMode?: number;

  /**
   * Shafaq type for Moonsighting method (method 15)
   * Acceptable values: 'general', 'ahmer', 'abyad'
   */
  @IsOptional()
  @IsString()
  @Matches(/^(general|ahmer|abyad)$/)
  shafaq?: string;

  /**
   * Latitude adjustment method for high latitude locations
   * 1: Middle of Night
   * 2: One-Seventh of Night
   * 3: Angle-Based
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  @Type(() => Number)
  latitudeAdjustment?: number;

  /**
   * Prayer time adjustments in minutes
   * Format: "imsak,fajr,sunrise,dhuhr,asr,maghrib,sunset,isha,midnight"
   * Each value can be -60 to +60 minutes
   * @example "0,5,0,0,0,0,0,-2,0"
   */
  @IsOptional()
  @IsString()
  @Matches(/^-?([0-5]?[0-9]|60)(,-?([0-5]?[0-9]|60)){8}$/)
  tune?: string;

  /**
   * Year for prayer times calculation
   * Used by us to limit the data retrieved
   */
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  /**
   * Month for prayer times calculation (1-12)
   * Used by us to limit the data retrieved
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;
}
