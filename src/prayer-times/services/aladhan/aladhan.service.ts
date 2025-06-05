import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// Interfaces
import {
  MonthlyPrayerTimes,
  PrayerTimesResponse,
} from '@/prayer-times/interfaces/prayer-times-response.interface';

@Injectable()
export class AladhanService {
  private readonly apiUrl = 'https://api.aladhan.com/v1/calendar';

  constructor(private http: HttpService) {}

  async getPrayerTimes(
    latitude: number,
    longitude: number,
    params?: any,
  ): Promise<PrayerTimesResponse> {
    // Build API parameters
    const apiParams: any = {
      latitude,
      longitude,
      iso8601: true,
      annual: true,
    };

    // Add optional parameters if provided
    if (params?.method !== undefined) {
      apiParams.method = params.method;
    }
    if (params?.school !== undefined) {
      apiParams.school = params.school;
    }
    if (params?.midnightMode !== undefined) {
      apiParams.midnightMode = params.midnightMode;
    }
    if (params?.shafaq) {
      apiParams.shafaq = params.shafaq;
    }
    if (params?.latitudeAdjustment !== undefined) {
      apiParams.latitudeAdjustment = params.latitudeAdjustment;
    }
    if (params?.tune) {
      apiParams.tune = params.tune;
    }
    if (params?.methodSettings) {
      apiParams.methodSettings = params.methodSettings;
    }

    if (params?.year !== undefined) {
      apiParams.year = params.year;
    }
    if (params?.month !== undefined) {
      apiParams.month = params.month;
    }

    const response = await firstValueFrom(
      this.http.get(this.apiUrl, {
        params: apiParams,
      }),
    );

    const data = response.data.data;

    return this.processResponse(data);
  }

  private processResponse(data: Record<string, any[]>): PrayerTimesResponse {
    const months: MonthlyPrayerTimes = {};

    const timezone = data['1'][0].meta.timezone;
    const location = data['1'][0].meta.location;

    for (const month in data) {
      if (data.hasOwnProperty(month)) {
        const days = data[month];
        const monthData = new Array(days.length);

        for (let i = 0; i < days.length; i++) {
          const day = days[i];
          monthData[i] = {
            date: day.date.timestamp,
            timings: {
              fajr: day.timings.Fajr,
              sunrise: day.timings.Sunrise,
              dhuhr: day.timings.Dhuhr,
              asr: day.timings.Asr,
              sunset: day.timings.Sunset,
              maghrib: day.timings.Maghrib,
              isha: day.timings.Isha,
              imsak: day.timings.Imsak,
              midnight: day.timings.Midnight,
              firstthird: day.timings.Firstthird,
              lastthird: day.timings.Lastthird,
            },
          };
        }

        months[month] = monthData;
      }
    }
    return {
      timezone,
      location,
      months,
    };
  }
}
