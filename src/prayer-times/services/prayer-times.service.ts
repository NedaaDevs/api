import { Injectable } from '@nestjs/common';

// Providers
import { ProviderService } from '@/prayer-times/services/provider/provider.service';

// Services
import { ProviderRegistryService } from '@/prayer-times/services/provider/provider-registry.service';

// Interfaces
import { PrayerTimesResponse } from '@/prayer-times/interfaces/prayer-times-response.interface';

@Injectable()
export class PrayerTimesService {
  constructor(
    private readonly providerService: ProviderService,
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  async getPrayerTimes(
    latitude: number,
    longitude: number,
    providerId?: number,
    providerParams?: any,
  ): Promise<PrayerTimesResponse> {
    //  Get the selected provider (default to the first provider if none is specified)
    const provider =
      this.providerService.getProviderById(providerId) ||
      this.providerService.getProviders()[0];

    const providerService = this.providerRegistry.getProviderService(
      provider.id,
    );

    return providerService.getPrayerTimes(latitude, longitude, providerParams);
  }
}
