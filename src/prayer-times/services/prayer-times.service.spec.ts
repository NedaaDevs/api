import { Test, TestingModule } from '@nestjs/testing';
import { PrayerTimesService } from './prayer-times.service';
import { ProviderRegistryService } from '@/prayer-times/services/provider/provider-registry.service';
import { ProviderService } from '@/prayer-times/services/provider/provider.service';

describe('PrayerTimesService', () => {
  let service: PrayerTimesService;
  let providerService: ProviderService;
  let providerRegistry: ProviderRegistryService;

  const mockProvider = {
    id: 1,
    name: 'Aladhan',
    website: 'https://aladhan.com',
  };
  const mockProviderService = {
    getPrayerTimes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrayerTimesService,
        {
          provide: ProviderService,
          useValue: {
            getProviderById: jest.fn().mockReturnValue(mockProvider),
            getProviders: jest.fn().mockReturnValue([mockProvider]),
          },
        },
        {
          provide: ProviderRegistryService,
          useValue: {
            getProviderService: jest.fn().mockReturnValue(mockProviderService),
          },
        },
      ],
    }).compile();

    service = module.get<PrayerTimesService>(PrayerTimesService);
    providerService = module.get<ProviderService>(ProviderService);
    providerRegistry = module.get<ProviderRegistryService>(
      ProviderRegistryService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPrayerTimes', () => {
    it('should call provider service with correct parameters', async () => {
      const mockResponse = {
        timezone: 'Asia/Riyadh',
        location: { latitude: 24.7136, longitude: 46.6753 },
        months: {},
      };

      mockProviderService.getPrayerTimes.mockResolvedValue(mockResponse);

      const result = await service.getPrayerTimes(24.7136, 46.6753, 1, {
        method: 3,
        school: 1,
      });

      expect(result).toEqual(mockResponse);
      expect(providerRegistry.getProviderService).toHaveBeenCalledWith(1);
      expect(mockProviderService.getPrayerTimes).toHaveBeenCalledWith(
        24.7136,
        46.6753,
        { method: 3, school: 1 },
      );
    });

    it('should use default provider when none specified', async () => {
      const mockResponse = {
        timezone: 'Asia/Riyadh',
        location: { latitude: 24.7136, longitude: 46.6753 },
        months: {},
      };

      mockProviderService.getPrayerTimes.mockResolvedValue(mockResponse);
      (providerService.getProviderById as jest.Mock).mockReturnValue(null);

      await service.getPrayerTimes(24.7136, 46.6753, undefined, { method: 3 });

      expect(providerService.getProviders).toHaveBeenCalled();
      expect(providerRegistry.getProviderService).toHaveBeenCalledWith(1);
    });
  });
});
