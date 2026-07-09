import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { NetworkLocation } from '../../models/network-location.model';

const PIN_ICON_HTML = `
  <svg width="34" height="34" viewBox="0 0 24 24" fill="#2563eb" stroke="#1e3a8a" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="none"></circle>
  </svg>
`;

@Component({
  selector: 'app-network-location-map',
  standalone: true,
  template: `<div #mapEl class="network-location-map"></div>`,
  styles: [`
    .network-location-map {
      width: 100%;
      height: 100%;
      min-height: 220px;
      border-radius: 18px;
      overflow: hidden;
    }
  `]
})
export class NetworkLocationMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() location: NetworkLocation | null = null;
  @Input() editable = false;
  @Output() locationChange = new EventEmitter<NetworkLocation>();

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private marker: any;
  private ready = false;

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const L = await import('leaflet');
    const startLocation = this.location ?? { lat: -0.1807, lng: -78.4678 }; // Quito, Ecuador (default)

    this.map = L.map(this.mapEl.nativeElement, {
      center: [startLocation.lat, startLocation.lng],
      zoom: this.location ? 15 : 6,
      scrollWheelZoom: this.editable,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    const icon = L.divIcon({
      html: PIN_ICON_HTML,
      className: 'network-location-pin',
      iconSize: [34, 34],
      iconAnchor: [17, 32],
    });

    if (this.location) {
      this.marker = L.marker([this.location.lat, this.location.lng], { icon, draggable: this.editable }).addTo(this.map);
    }

    if (this.editable) {
      this.map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        this.setMarker(event.latlng.lat, event.latlng.lng, L);
        this.locationChange.emit({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      this.marker?.on('dragend', () => {
        const pos = this.marker.getLatLng();
        this.locationChange.emit({ lat: pos.lat, lng: pos.lng });
      });
    }

    this.ready = true;
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!this.ready || !changes['location'] || !this.location) {
      return;
    }

    const L = await import('leaflet');
    this.setMarker(this.location.lat, this.location.lng, L);
    this.map.setView([this.location.lat, this.location.lng], 15);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setMarker(lat: number, lng: number, L: any): void {
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
      return;
    }

    const icon = L.divIcon({
      html: PIN_ICON_HTML,
      className: 'network-location-pin',
      iconSize: [34, 34],
      iconAnchor: [17, 32],
    });

    this.marker = L.marker([lat, lng], { icon, draggable: this.editable }).addTo(this.map);

    if (this.editable) {
      this.marker.on('dragend', () => {
        const pos = this.marker.getLatLng();
        this.locationChange.emit({ lat: pos.lat, lng: pos.lng });
      });
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
