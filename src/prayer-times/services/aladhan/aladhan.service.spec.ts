import { Test, TestingModule } from '@nestjs/testing';
import { AladhanService } from './aladhan.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('AladhanService', () => {
  let service: AladhanService;
  let httpService: HttpService;

  const mockAladhanResponseData = {
    data: {
      '1': [
        {
          date: { timestamp: '01 Jan 2025' },
          meta: {
            timezone: 'Asia/Riyadh',
            location: { latitude: 24.7136, longitude: 46.6753 },
          },
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

  const mockAxiosResponse: AxiosResponse = {
    data: mockAladhanResponseData,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AladhanService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AladhanService>(AladhanService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPrayerTimes', () => {
    it('should fetch prayer times with basic parameters', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockAxiosResponse));

      const result = await service.getPrayerTimes(24.7136, 46.6753, {
        method: 3,
      });

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.aladhan.com/v1/calendar',
        {
          params: {
            latitude: 24.7136,
            longitude: 46.6753,
            iso8601: true,
            annual: true,
            method: 3,
          },
        },
      );

      expect(result.timezone).toBe('Asia/Riyadh');
      expect(result.location).toEqual({
        latitude: 24.7136,
        longitude: 46.6753,
      });
      expect(result.months['1']).toBeDefined();
    });

    it('should fetch prayer times with all Aladhan parameters', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockAxiosResponse));

      const params = {
        method: 3,
        school: 1,
        midnightMode: 0,
        shafaq: 'general',
        latitudeAdjustment: 1,
        tune: '0,5,0,0,0,0,0,-2,0',
        year: 2025,
        month: 1,
      };

      await service.getPrayerTimes(24.7136, 46.6753, params);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.aladhan.com/v1/calendar',
        {
          params: {
            latitude: 24.7136,
            longitude: 46.6753,
            iso8601: true,
            annual: true,
            method: 3,
            school: 1,
            midnightMode: 0,
            shafaq: 'general',
            latitudeAdjustment: 1,
            tune: '0,5,0,0,0,0,0,-2,0',
            year: 2025,
            month: 1,
          },
        },
      );
    });

    it('should fetch prayer times with no optional parameters', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockAxiosResponse));

      await service.getPrayerTimes(24.7136, 46.6753);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.aladhan.com/v1/calendar',
        {
          params: {
            latitude: 24.7136,
            longitude: 46.6753,
            iso8601: true,
            annual: true,
          },
        },
      );
    });
  });
});
