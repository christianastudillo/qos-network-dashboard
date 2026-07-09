import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

import { IconComponent } from '../icon/icon';

const SECTION_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  estadisticas: 'Estadísticas',
  reportes: 'Reportes',
  historial: 'Historial',
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent {
  @Input() activeTab = 'dashboard';
  @Input() userEmail: string | null = null;
  @Output() logout = new EventEmitter<void>();

  menuOpen = false;

  get sectionTitle(): string {
    return SECTION_TITLES[this.activeTab] ?? 'Dashboard';
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideNav = target.closest('app-navbar');
    if (!clickedInsideNav) {
      this.menuOpen = false;
    }
  }

}
