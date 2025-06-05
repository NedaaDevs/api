import { Controller, Get, Query } from '@nestjs/common';

// Services
import { ProviderService } from '@/prayer-times/services/provider/provider.service';
import { PrayerTimesService } from '@/prayer-times/services/prayer-times.service';

// Interfaces
import { PrayerTimesProvider } from '@/prayer-times/interfaces/provider.interface';
import { PrayerTimesResponse } from '@/prayer-times/interfaces/prayer-times-response.interface';

// DTOs
import { AladhanQueryDto } from '@/prayer-times/dtos/aladhan-query.dto';

// Decorators
import { ResponseMessage } from '@/response-message/response-message.decorator';

@Controller({ path: 'prayer-times', version: '2' })
export class PrayerTimesController {
  constructor(
    private readonly prayerTimesService: PrayerTimesService,
    private readonly providerService: ProviderService,
  ) {}

  @Get('/')
  @ResponseMessage('Prayer times retrieved successfully')
  async getPrayerTimes(
    @Query() query: AladhanQueryDto, // Use provider-specific DTO for now, will make dynamic later
  ): Promise<PrayerTimesResponse> {
    const { lat, long, providerId, ...providerParams } = query;

    return this.prayerTimesService.getPrayerTimes(
      lat,
      long,
      providerId,
      providerParams,
    );
  }

  @Get('providers')
  @ResponseMessage('List of providers fetched successfully')
  getProviders(): PrayerTimesProvider[] {
    return this.providerService.getProviders();
  }
}
