import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { timer, Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

import { SidebarComponent } from '../../components/sidebar/sidebar';
import { StatsCardsComponent } from '../../components/stats-cards/stats-cards';
import { ChartsComponent } from '../../components/charts/charts';
import { NetworkSimulatorComponent } from '../../components/network-simulator/network-simulator';
import { AiRecommendationsComponent } from '../../components/ai-recommendations/ai-recommendations';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    SidebarComponent,
    StatsCardsComponent,
    ChartsComponent,
    NetworkSimulatorComponent,
    AiRecommendationsComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  animations: [
    // Definición de la animación Fade-in y Fade-out
    trigger('tabAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  activeTab = signal<'dashboard' | 'estadisticas' | 'reportes'>('dashboard');
  chartTimeframe = signal<'dia' | 'semana' | 'mes'>('dia');
  
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'info'>('info');

  metrics = signal({
    latency: 24,
    packetLoss: 2,
    throughput: 150,
    jitter: 5
  });

  nodesData = signal([
    { name: 'Router Central', status: 'ONLINE', cpu: '74%', conn: 'Estable' },
    { name: 'Servidor QoS', status: 'ONLINE', cpu: '52%', conn: 'Excelente' },
    { name: 'Gateway Principal', status: 'MODERADO', cpu: '88%', conn: 'Saturación parcial' }
  ]);

  private dataStreamSubscription!: Subscription;

  ngOnInit() {
    this.dataStreamSubscription = timer(4000, 4000).subscribe(() => {
      this.autoUpdateMetrics();
    });
  }

  ngOnDestroy() {
    if (this.dataStreamSubscription) {
      this.dataStreamSubscription.unsubscribe();
    }
  }

  setTab(tab: 'dashboard' | 'estadisticas' | 'reportes') {
    this.activeTab.set(tab);
  }

  setTimeframe(timeframe: 'dia' | 'semana' | 'mes') {
    this.chartTimeframe.set(timeframe);
    this.showToast(`Timeframe cambiado a: ${timeframe}`, 'info');
  }

  refreshData() {
    this.autoUpdateMetrics();
    this.showToast('Métricas de red actualizadas manualmente', 'success');
  }

  private autoUpdateMetrics() {
    this.metrics.update(() => ({
      latency: Math.floor(Math.random() * 15) + 18, 
      packetLoss: Math.floor(Math.random() * 3) + 1,
      throughput: Math.floor(Math.random() * 30) + 135,
      jitter: Math.floor(Math.random() * 4) + 3
    }));
  }

  showToast(message: string, type: 'success' | 'info') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  exportData() {
    const headers = 'Nodo,Estado,CPU,Conectividad\n';
    const rows = this.nodesData()
      .map(n => `${n.name},${n.status},${n.cpu},${n.conn}`)
      .join('\n');
      
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_nodos_qos_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Archivo CSV descargado con éxito', 'success');
  }

  generarReporte() {
    const horaActual = new Date().toLocaleTimeString();
    this.showToast('Reporte de auditoría generado a las ' + horaActual, 'success');
  }
}