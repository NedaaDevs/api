export interface BDCReverseGeocodeTimezoneResponse {
  latitude: number;
  longitude: number;
  localityLanguageRequested: string;
  continent: string;
  continentCode: string;
  countryName: string;
  countryCode: string;
  principalSubdivision: string;
  principalSubdivisionCode: string;
  city: string;
  locality: string;
  postcode: string;
  plusCode: string;
  localityInfo: {
    administrative: Array<{
      name: string;
      description: string;
      isoName?: string;
      order: number;
      adminLevel: number;
      isoCode?: string;
      wikidataId?: string;
      geonameId?: number;
    }>;
    informative: Array<{
      name: string;
      description: string;
      isoName?: string;
      order: number;
      isoCode?: string;
      wikidataId?: string;
      geonameId?: number;
    }>;
  };
  timeZone: {
    ianaTimeId: string;
    displayName: string;
    effectiveTimeZoneFull: string;
    effectiveTimeZoneShort: string;
    utcOffsetSeconds: number;
    utcOffset: string;
    isDaylightSavingTime: boolean;
    localTime: string;
  };
}

export interface ReverseGeocodeResponse {
  countryName: string;
  city: string;
  timezone: string;
}
