import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { IconComponent } from '../icon/icon';

export type DashboardTab = 'dashboard' | 'estadisticas' | 'reportes';

interface SidebarTabItem {
  tab: DashboardTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent {
  @Input() activeTab: DashboardTab | null = 'dashboard';
  @Output() tabChange = new EventEmitter<DashboardTab>();

  readonly tabItems: SidebarTabItem[] = [
    { tab: 'dashboard', label: 'Dashboard', icon: 'bar-chart' },
    { tab: 'estadisticas', label: 'Estadísticas', icon: 'trending-up' },
    { tab: 'reportes', label: 'Reportes', icon: 'file-text' },
  ];

  sidebarOpen = false;

  selectTab(tab: DashboardTab) {
    this.tabChange.emit(tab);
    this.closeSidebar();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  // Cierra el sidebar con la tecla Escape
  @HostListener('document:keydown.escape')
  onEscape() {
    this.sidebarOpen = false;
  }

}
