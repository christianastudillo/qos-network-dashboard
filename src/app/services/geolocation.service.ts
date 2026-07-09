import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { NetworkLocation } from '../models/network-location.model';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private readonly platformId = inject(PLATFORM_ID);

  getCurrentPosition(): Promise<NetworkLocation> {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      return Promise.reject(new Error('La geolocalización no está disponible en este navegador.'));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
        { headers: { Accept: 'application/json' } }
      );

      if (!response.ok) {
        throw new Error('No se pudo resolver la dirección.');
      }

      const data = await response.json();
      return (data?.display_name as string) ?? this.formatCoordinates(lat, lng);
    } catch {
      return this.formatCoordinates(lat, lng);
    }
  }

  async locateAndDescribe(): Promise<NetworkLocation> {
    const position = await this.getCurrentPosition();
    const address = await this.reverseGeocode(position.lat, position.lng);
    return { ...position, address };
  }

  formatCoordinates(lat: number, lng: number): string {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
