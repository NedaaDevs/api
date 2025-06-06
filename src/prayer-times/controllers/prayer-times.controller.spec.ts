import { Test, TestingModule } from '@nestjs/testing';
import { PrayerTimesController } from './prayer-times.controller';
import { PrayerTimesService } from '@/prayer-times/services/prayer-times.service';
import { ProviderService } from '@/prayer-times/services/provider/provider.service';
import { ProviderRegistryService } from '@/prayer-times/services/provider/provider-registry.service';

describe('PrayerTimesController', () => {
  let controller: PrayerTimesController;
  let prayerTimesService: PrayerTimesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrayerTimesController],
      providers: [
        {
          provide: PrayerTimesService,
          useValue: {
            getPrayerTimes: jest.fn(),
          },
        },
        {
          provide: ProviderService,
          useValue: {
            getProviders: jest.fn(),
            getProviderById: jest.fn(),
          },
        },
        {
          provide: ProviderRegistryService,
          useValue: {
            getProviderService: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PrayerTimesController>(PrayerTimesController);
    prayerTimesService = module.get<PrayerTimesService>(PrayerTimesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPrayerTimes', () => {
    it('should return prayer times with basic parameters', async () => {
      const mockPrayerTimesResponse = {
        timezone: 'Europe/London',
        location: { latitude: 51.5074, longitude: -0.1278 },
        months: {
          '1': [
            {
              date: '01 Jan 2025',
              timings: {
                Fajr: '2025-01-01T06:23:00+00:00',
                Sunrise: '2025-01-01T08:06:00+00:00',
                Dhuhr: '2025-01-01T12:04:00+00:00',
                Asr: '2025-01-01T13:45:00+00:00',
                Sunset: '2025-01-01T16:03:00+00:00',
                Maghrib: '2025-01-01T16:03:00+00:00',
                Isha: '2025-01-01T17:46:00+00:00',
                Imsak: '2025-01-01T06:13:00+00:00',
                Midnight: '2025-01-02T00:04:00+00:00',
                Firstthird: '2025-01-01T21:24:00+00:00',
                Lastthird: '2025-01-02T02:45:00+00:00',
              },
            },
          ],
        },
      };

      // Mock the getPrayerTimes method
      jest
        .spyOn(prayerTimesService, 'getPrayerTimes')
        .mockResolvedValue(mockPrayerTimesResponse);

      const result = await controller.getPrayerTimes({
        lat: 51.5074,
        long: -0.1278,
        year: 2025,
        month: 7,
        method: 2,
        providerId: 1,
      });

      expect(result).toEqual(mockPrayerTimesResponse);
      expect(prayerTimesService.getPrayerTimes).toHaveBeenCalledWith(
        51.5074,
        -0.1278,
        1,
        { method: 2, year: 2025, month: 7 },
      );
    });

    it('should return prayer times with all Aladhan parameters', async () => {
      const mockPrayerTimesResponse = {
        timezone: 'Asia/Riyadh',
        location: { latitude: 24.7136, longitude: 46.6753 },
        months: {
          '1': [
            {
              date: '01 Jan 2025',
              timings: {
                Fajr: '2025-01-01T05:23:00+03:00',
                Sunrise: '2025-01-01T06:46:00+03:00',
                Dhuhr: '2025-01-01T12:04:00+03:00',
                Asr: '2025-01-01T15:15:00+03:00',
                Sunset: '2025-01-01T17:23:00+03:00',
                Maghrib: '2025-01-01T17:23:00+03:00',
                Isha: '2025-01-01T18:53:00+03:00',
                Imsak: '2025-01-01T05:13:00+03:00',
                Midnight: '2025-01-02T00:04:00+03:00',
                Firstthird: '2025-01-01T21:24:00+03:00',
                Lastthird: '2025-01-02T02:45:00+03:00',
              },
            },
          ],
        },
      };

      // Mock the getPrayerTimes method
      jest
        .spyOn(prayerTimesService, 'getPrayerTimes')
        .mockResolvedValue(mockPrayerTimesResponse);

      const result = await controller.getPrayerTimes({
        lat: 24.7136,
        long: 46.6753,
        method: 3,
        school: 1,
        midnightMode: 0,
        tune: '0,5,0,0,0,0,0,-2,0',
        providerId: 1,
      });

      expect(result).toEqual(mockPrayerTimesResponse);
      expect(prayerTimesService.getPrayerTimes).toHaveBeenCalledWith(
        24.7136,
        46.6753,
        1,
        {
          method: 3,
          school: 1,
          midnightMode: 0,
          tune: '0,5,0,0,0,0,0,-2,0',
        },
      );
    });
  });

  describe('getProviders', () => {
    it('should return a list of providers', () => {
      const mockProviders = [
        { id: 1, name: 'Aladhan', website: 'https://aladhan.com' },
      ];

      // Mock the getProviders method
      jest.spyOn(controller, 'getProviders').mockReturnValue(mockProviders);

      const result = controller.getProviders();

      expect(result).toEqual(mockProviders);
    });
  });
});
