import { Controller, Get, Query, Version } from '@nestjs/common';
import { ReverseGeocodeService } from '@/reverse-geocode/reverse-geocode.service';
import { ReverseGeocodeDto } from '@/reverse-geocode/reverse-geocode.dto';

@Controller('reverse-geocode')
export class ReverseGeocodeController {
  constructor(private readonly geocodingService: ReverseGeocodeService) {}

  @Get()
  @Version('2')
  getTimezone(@Query() query: ReverseGeocodeDto) {
    return this.geocodingService.reverseGeocodeWithTimezone(query);
  }
}
