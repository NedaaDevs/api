import { Type } from 'class-transformer';
import { IsLatitude, IsLocale, IsLongitude, IsNotEmpty } from 'class-validator';

export class ReverseGeocodeDto {
  @IsNotEmpty()
  @IsLatitude()
  @Type(() => Number)
  latitude: number;

  @IsNotEmpty()
  @IsLongitude()
  @Type(() => Number)
  longitude: number;

  @IsNotEmpty()
  @IsLocale()
  locale: string;
}
