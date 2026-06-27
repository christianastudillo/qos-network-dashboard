import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { firstValueFrom, Subscription, timer } from 'rxjs';

import { StatsCardsComponent } from '../../components/stats-cards/stats-cards';
import { ChartsComponent } from '../../components/charts/charts';
import { NetworkSimulatorComponent } from '../../components/network-simulator/network-simulator';
import { AiRecommendationsComponent } from '../../components/ai-recommendations/ai-recommendations';

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
    AiRecommendationsComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  animations: [
    trigger('tabAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate(
          '400ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
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

  async runNetworkTestAndRefresh(showSuccessToast: boolean = true): Promise<void> {
    if (this.isRunningTest()) {
      return;
    }

    this.isRunningTest.set(true);

    try {
      await this.networkMeasurementService.runNetworkTest();
      await this.loadBackendResults();

      if (showSuccessToast) {
        this.showToast('Métricas reales actualizadas desde el backend', 'success');
      }
    } catch (error) {
      console.error(error);
      this.showToast(
        'No se pudo conectar con el backend. Verifica que FastAPI esté encendido.',
        'error'
      );
    } finally {
      this.isRunningTest.set(false);
    }
  }

  async refreshRecommendations(): Promise<void> {
    const currentSessionId = this.sessionId();

    if (!currentSessionId) {
      return;
    }

    this.isLoadingRecommendations.set(true);

    try {
      const result = await firstValueFrom(
        this.networkApiService.getRecommendations(currentSessionId)
      );

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
    const currentSessionId = this.sessionId();

    const [
      live,
      history,
      statistics,
      queueMetrics,
      recommendations
    ] = await Promise.all([
      firstValueFrom(this.networkApiService.getLiveMetrics(currentSessionId)),
      firstValueFrom(this.networkApiService.getMetricsHistory(currentSessionId)),
      firstValueFrom(this.networkApiService.getStatistics(currentSessionId)),
      firstValueFrom(this.networkApiService.getQueueMetrics(currentSessionId)),
      firstValueFrom(this.networkApiService.getRecommendations(currentSessionId))
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

    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  exportData(): void {
    const historyPoints = this.history()?.points ?? [];

    if (historyPoints.length === 0) {
      this.showToast('No hay historial disponible para exportar.', 'info');
      return;
    }

    const headers = [
      'timestamp',
      'latency_ms',
      'jitter_ms',
      'download_mbps',
      'upload_mbps',
      'packet_loss_pct',
      'failed_requests',
      'total_requests'
    ].join(',');

    const rows = historyPoints.map(point => [
      point.timestamp,
      point.latency_ms,
      point.jitter_ms,
      point.download_mbps,
      point.upload_mbps ?? '',
      point.packet_loss_pct,
      point.failed_requests,
      point.total_requests
    ].join(','));

    const blob = new Blob(
      [headers + '\n' + rows.join('\n')],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `reporte_qos_${new Date().toISOString().slice(0, 10)}.csv`
    );

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Archivo CSV descargado correctamente', 'success');
  }

  generarReporte(): void {
    this.exportData();
  }

  getGeneralStatus(): string {
    const queue = this.queueMetrics();

    if (!queue) {
      return 'SIN DATOS';
    }

    return queue.stability_status;
  }

  getGeneralStatusClass(): string {
    const status = this.getGeneralStatus();

    if (status === 'ESTABLE') {
      return 'status-online text-xs md:text-sm';
    }

    if (status === 'ADVERTENCIA' || status === 'ALTA_UTILIZACION') {
      return 'bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold text-xs md:text-sm';
    }

    if (status === 'INESTABLE') {
      return 'bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-xs md:text-sm';
    }

    return 'bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold text-xs md:text-sm';
  }

  getLatencyStatus(): string {
    const latency = this.liveMetrics()?.latency_ms ?? 0;

    if (latency <= 50) {
      return 'Óptimo';
    }

    if (latency <= 120) {
      return 'Moderado';
    }

    return 'Crítico';
  }

  getPacketLossStatus(): string {
    const loss = this.liveMetrics()?.packet_loss_pct ?? 0;

    if (loss <= 2) {
      return 'Bajo';
    }

    if (loss <= 5) {
      return 'Moderado';
    }

    return 'Alto';
  }

  getJitterStatus(): string {
    const jitter = this.liveMetrics()?.jitter_ms ?? 0;

    if (jitter <= 10) {
      return 'Óptimo';
    }

    if (jitter <= 30) {
      return 'Moderado';
    }

    return 'Crítico';
  }

  getStatusTextClass(status: string): string {
    if (status === 'Óptimo' || status === 'Bajo') {
      return 'text-green-600 font-bold dark:text-green-400';
    }

    if (status === 'Moderado') {
      return 'text-yellow-500 font-bold';
    }

    return 'text-red-500 font-bold dark:text-red-400';
  }

  getAvailability(): string {
    const loss = this.liveMetrics()?.packet_loss_pct ?? 0;
    const availability = Math.max(0, 100 - loss);

    return availability.toFixed(2);
  }

  getShortSessionId(): string {
    const id = this.sessionId();

    if (!id) {
      return 'N/A';
    }

    return id.slice(0, 8);
  }
}