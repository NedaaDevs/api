import { Injectable } from '@nestjs/common';
import { ReverseGeocodeDto } from '@/reverse-geocode/reverse-geocode.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// interfaces
import {
  BDCReverseGeocodeTimezoneResponse,
  ReverseGeocodeResponse,
} from '@/reverse-geocode/interfaces/reverse-geocode-response.interface';

@Injectable()
export class ReverseGeocodeService {
  private url = 'https://api-bdc.net';
  private apiKey = process.env.BDC_KEY;

  constructor(private http: HttpService) {}
  async reverseGeocodeWithTimezone(
    query: ReverseGeocodeDto,
  ): Promise<ReverseGeocodeResponse> {
    const latitude = query.latitude;
    const longitude = query.longitude;
    const locale = query.locale;

    const endpoint = `/data/reverse-geocode-with-timezone`;

    const response = await firstValueFrom(
      this.http.get(`${this.url}${endpoint}`, {
        params: {
          latitude,
          longitude,
          localityLanguage: locale,
          key: this.apiKey,
        },
      }),
    );

    const data = response.data as BDCReverseGeocodeTimezoneResponse;

    return {
      countryName: data.countryName,
      city: data.city,
      timezone: data.timeZone.ianaTimeId,
    };
  }
}
