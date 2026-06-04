import { Component, signal } from '@angular/core';

import { SidebarComponent } from '../../components/sidebar/sidebar';
import { StatsCardsComponent } from '../../components/stats-cards/stats-cards';
import { ChartsComponent } from '../../components/charts/charts';
import { NetworkSimulatorComponent } from '../../components/network-simulator/network-simulator';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    SidebarComponent,
    StatsCardsComponent,
    ChartsComponent,
    NetworkSimulatorComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  activeTab = signal<'dashboard' | 'estadisticas' | 'reportes'>('dashboard');
  chartTimeframe = signal<'dia' | 'semana' | 'mes'>('dia');

  metrics = signal({
    latency: 24,
    packetLoss: 2,
    throughput: 150,
    jitter: 5
  });

  setTab(tab: 'dashboard' | 'estadisticas' | 'reportes') {
    this.activeTab.set(tab);
  }

  setTimeframe(timeframe: 'dia' | 'semana' | 'mes') {
    this.chartTimeframe.set(timeframe);
  }

  refreshData() {
    this.metrics.update(() => ({
      latency: Math.floor(Math.random() * 40) + 10,
      packetLoss: Math.floor(Math.random() * 4),
      throughput: Math.floor(Math.random() * 100) + 100,
      jitter: Math.floor(Math.random() * 8) + 1
    }));
  }

  exportData() {
    alert('Exportando registro de nodos a CSV...');
  }
}