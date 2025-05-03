import { Controller, Get, Query, Version } from '@nestjs/common';
import { ReverseGeocodeService } from '@/reverse-geocode/reverse-geocode.service';
import { ReverseGeocodeDto } from '@/reverse-geocode/reverse-geocode.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('reverse-geocode')
export class ReverseGeocodeController {
  constructor(private readonly geocodingService: ReverseGeocodeService) {}

  // Allow only three request every 15m
  @Throttle({ default: { limit: 3, ttl: 1000 * 60 * 15 } })
  @Get()
  @Version('2')
  getTimezone(@Query() query: ReverseGeocodeDto) {
    return this.geocodingService.reverseGeocodeWithTimezone(query);
  }
}
