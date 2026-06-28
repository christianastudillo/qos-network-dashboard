import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { firstValueFrom, Subscription, timer } from 'rxjs';

import { StatsCardsComponent } from '../../components/stats-cards/stats-cards';
import { ChartsComponent } from '../../components/charts/charts';
import { NetworkSimulatorComponent } from '../../components/network-simulator/network-simulator';
import { AiRecommendationsComponent } from '../../components/ai-recommendations/ai-recommendations';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { NavbarComponent } from '../../components/navbar/navbar';

import { NetworkApiService } from '../../services/network-api.service';
import { NetworkMeasurementService } from '../../services/network-measurement.service';

import {
  LiveMetricsResponse,
  MetricsHistoryResponse,
  StatisticsResponse,
  QueueRealtimeResponse,
  RecommendationResponse
} from '../../models/network.models';

type DashboardTab = 'dashboard' | 'estadisticas' | 'reportes';
type Timeframe = 'dia' | 'semana' | 'mes';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    StatsCardsComponent,
    ChartsComponent,
    NetworkSimulatorComponent,
    AiRecommendationsComponent,
    SidebarComponent,
    NavbarComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  animations: [
    trigger('tabAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('350ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  activeTab = signal<DashboardTab>('dashboard');
  chartTimeframe = signal<Timeframe>('dia');
  sessionId = signal<string>('');

  isRunningTest = signal(false);
  isLoadingRecommendations = signal(false);

  liveMetrics = signal<LiveMetricsResponse | null>(null);
  history = signal<MetricsHistoryResponse | null>(null);
  statistics = signal<StatisticsResponse | null>(null);
  queueMetrics = signal<QueueRealtimeResponse | null>(null);
  recommendations = signal<RecommendationResponse | null>(null);

  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'info' | 'error'>('info');

  private dataStreamSubscription?: Subscription;

  constructor(
    private readonly networkMeasurementService: NetworkMeasurementService,
    private readonly networkApiService: NetworkApiService
  ) {}

  ngOnInit(): void {
    this.sessionId.set(this.networkMeasurementService.getSessionId());
    this.dataStreamSubscription = timer(0, 15000).subscribe(() => {
      this.runNetworkTestAndRefresh(false);
    });
  }

  ngOnDestroy(): void {
    this.dataStreamSubscription?.unsubscribe();
  }

  setTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  setTimeframe(timeframe: Timeframe): void {
    this.chartTimeframe.set(timeframe);
    this.showToast(`Vista cambiada a: ${timeframe}`, 'info');
  }

  refreshData(): void {
    this.runNetworkTestAndRefresh(true);
  }

  async runNetworkTestAndRefresh(showSuccessToast = true): Promise<void> {
    if (this.isRunningTest()) return;
    this.isRunningTest.set(true);

    try {
      await this.networkMeasurementService.runNetworkTest();
      await this.loadBackendResults();
      if (showSuccessToast) {
        this.showToast('Métricas reales actualizadas desde el backend', 'success');
      }
    } catch (error) {
      console.error(error);
      this.showToast('No se pudo conectar con el backend. Verifica que FastAPI esté encendido.', 'error');
    } finally {
      this.isRunningTest.set(false);
    }
  }

  async refreshRecommendations(): Promise<void> {
    const currentSessionId = this.sessionId();
    if (!currentSessionId) return;

    this.isLoadingRecommendations.set(true);
    try {
      const result = await firstValueFrom(this.networkApiService.getRecommendations(currentSessionId));
      this.recommendations.set(result);
      this.showToast('Recomendaciones actualizadas', 'success');
    } catch (error) {
      console.error(error);
      this.showToast('No existen datos suficientes para generar recomendaciones.', 'error');
    } finally {
      this.isLoadingRecommendations.set(false);
    }
  }

  private async loadBackendResults(): Promise<void> {
    const id = this.sessionId();
    const [live, history, statistics, queueMetrics, recommendations] = await Promise.all([
      firstValueFrom(this.networkApiService.getLiveMetrics(id)),
      firstValueFrom(this.networkApiService.getMetricsHistory(id)),
      firstValueFrom(this.networkApiService.getStatistics(id)),
      firstValueFrom(this.networkApiService.getQueueMetrics(id)),
      firstValueFrom(this.networkApiService.getRecommendations(id)),
    ]);
    this.liveMetrics.set(live);
    this.history.set(history);
    this.statistics.set(statistics);
    this.queueMetrics.set(queueMetrics);
    this.recommendations.set(recommendations);
  }

  showToast(message: string, type: 'success' | 'info' | 'error'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  exportData(): void {
    const historyPoints = this.history()?.points ?? [];
    if (historyPoints.length === 0) {
      this.showToast('No hay historial disponible para exportar.', 'info');
      return;
    }
    const headers = ['timestamp','latency_ms','jitter_ms','download_mbps','upload_mbps','packet_loss_pct','failed_requests','total_requests'].join(',');
    const rows = historyPoints.map(p => [p.timestamp, p.latency_ms, p.jitter_ms, p.download_mbps, p.upload_mbps ?? '', p.packet_loss_pct, p.failed_requests, p.total_requests].join(','));
    const blob = new Blob([headers + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_qos_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Archivo CSV descargado correctamente', 'success');
  }

  getGeneralStatus(): string {
    return this.queueMetrics()?.stability_status ?? 'SIN DATOS';
  }

  getGeneralStatusClass(): string {
    const status = this.getGeneralStatus();
    if (status === 'ESTABLE') return 'status-online text-xs';
    if (status === 'ADVERTENCIA' || status === 'ALTA_UTILIZACION') return 'bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold text-xs';
    if (status === 'INESTABLE') return 'bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-xs';
    return 'bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold text-xs';
  }

  getLatencyStatus(): string {
    const v = this.liveMetrics()?.latency_ms ?? 0;
    return v <= 50 ? 'Óptimo' : v <= 120 ? 'Moderado' : 'Crítico';
  }

  getPacketLossStatus(): string {
    const v = this.liveMetrics()?.packet_loss_pct ?? 0;
    return v <= 2 ? 'Bajo' : v <= 5 ? 'Moderado' : 'Alto';
  }

  getJitterStatus(): string {
    const v = this.liveMetrics()?.jitter_ms ?? 0;
    return v <= 10 ? 'Óptimo' : v <= 30 ? 'Moderado' : 'Crítico';
  }

  getStatusTextClass(status: string): string {
    if (status === 'Óptimo' || status === 'Bajo') return 'text-green-600 font-bold';
    if (status === 'Moderado') return 'text-yellow-500 font-bold';
    return 'text-red-500 font-bold';
  }

  getAvailability(): string {
    const loss = this.liveMetrics()?.packet_loss_pct ?? 0;
    return Math.max(0, 100 - loss).toFixed(2);
  }

  getShortSessionId(): string {
    const id = this.sessionId();
    return id ? id.slice(0, 8) : 'N/A';
  }
}
