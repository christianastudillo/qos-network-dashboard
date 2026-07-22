import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { firstValueFrom, Subscription, timer } from 'rxjs';

import { StatsCardsComponent } from '../../components/stats-cards/stats-cards';
import { ChartsComponent } from '../../components/charts/charts';
import { NetworkSimulatorComponent } from '../../components/network-simulator/network-simulator';
import { AiRecommendationsComponent } from '../../components/ai-recommendations/ai-recommendations';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { NavbarComponent } from '../../components/navbar/navbar';
import { IconComponent } from '../../components/icon/icon';
import { NetworkLocationMapComponent } from '../../components/network-location-map/network-location-map';

import { NetworkApiService } from '../../services/network-api.service';
import { NetworkMeasurementService } from '../../services/network-measurement.service';
import { GeolocationService } from '../../services/geolocation.service';
import { AuthService } from '../../services/auth.service';
import { AnalysisHistoryService } from '../../services/analysis-history.service';

import {
  LiveMetricsResponse,
  MetricsHistoryResponse,
  StatisticsResponse,
  QueueRealtimeResponse,
  RecommendationResponse
} from '../../models/network.models';
import { NetworkLocation } from '../../models/network-location.model';
import { AnalysisRecord } from '../../models/analysis-record.model';

const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;

type DashboardTab = 'dashboard' | 'estadisticas' | 'reportes';
type Timeframe = 'dia' | 'semana' | 'mes';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatsCardsComponent,
    ChartsComponent,
    NetworkSimulatorComponent,
    AiRecommendationsComponent,
    SidebarComponent,
    NavbarComponent,
    IconComponent,
    NetworkLocationMapComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  animations: [
    trigger('tabAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate(
          '350ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly networkNameStorageKey = 'qos_network_name';

  isSavingNetworkName = signal(false);

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

  private readonly initialNetworkName = this.getStoredNetworkName();

  networkName = signal<string>(this.initialNetworkName);
  networkNameDraft = signal<string>(this.initialNetworkName);
  isEditingNetworkName = signal<boolean>(
    this.initialNetworkName.trim().length === 0
  );

  location = signal<NetworkLocation | null>(null);
  isLocating = signal(false);

  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'info' | 'error'>('info');

  private dataStreamSubscription?: Subscription;
  private autosaveSubscription?: Subscription;

  userEmail = computed(() => this.authService.currentUser()?.email ?? null);

  constructor(
    private readonly networkMeasurementService: NetworkMeasurementService,
    private readonly networkApiService: NetworkApiService,
    private readonly geolocationService: GeolocationService,
    private readonly authService: AuthService,
    private readonly analysisHistoryService: AnalysisHistoryService,
    private readonly router: Router
  ) {
    effect(() => {
      const name = this.networkName();

      if (typeof window === 'undefined') {
        return;
      }

      try {
        if (name.trim()) {
          localStorage.setItem(this.networkNameStorageKey, name);
        } else {
          localStorage.removeItem(this.networkNameStorageKey);
        }
      } catch (error) {
        console.warn('No se pudo guardar el nombre de la red:', error);
      }
    });
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigateByUrl('/');
  }

  ngOnInit(): void {
    this.sessionId.set(this.networkMeasurementService.getSessionId());

    void this.loadNetworkNameFromBackend();

    this.dataStreamSubscription = timer(0, 15000).subscribe(() => {
      this.runNetworkTestAndRefresh(false);
    });

    this.detectLocation();

    this.autosaveSubscription = timer(
      AUTOSAVE_INTERVAL_MS,
      AUTOSAVE_INTERVAL_MS
    ).subscribe(() => {
      this.autosaveAnalysis();
    });
  }

  ngOnDestroy(): void {
    this.dataStreamSubscription?.unsubscribe();
    this.autosaveSubscription?.unsubscribe();
  }

  private getStoredNetworkName(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    try {
      return localStorage.getItem(this.networkNameStorageKey) ?? '';
    } catch {
      return '';
    }
  }

  private async autosaveAnalysis(): Promise<void> {
    const uid = this.authService.currentUser()?.uid;
    const name = this.networkName().trim();
    const metrics = this.liveMetrics();

    if (!uid || !name || !metrics) {
      return;
    }

    const stats = this.statistics();
    const queue = this.queueMetrics();
    const recommendations = this.recommendations();

    const record: Omit<AnalysisRecord, 'id'> = {
      uid,
      networkName: name,
      location: this.location(),
      sessionId: this.sessionId(),
      createdAt: new Date().toISOString(),
      liveMetrics: metrics,
      statistics: stats
        ? {
          latency_mean: stats.latency_stats.mean,
          latency_std_dev: stats.latency_stats.std_dev,
          jitter_mean: stats.jitter_stats.mean,
          download_mean: stats.download_stats.mean,
          lambda_rate: stats.lambda_rate,
          traffic_trend: stats.traffic_trend,
        }
        : null,
      queue,
      recommendations,
    };

    try {
      await this.analysisHistoryService.saveSnapshot(record);

      this.showToast(
        `Análisis de "${name}" guardado en tu historial`,
        'success'
      );
    } catch (error) {
      console.error(error);
    }
  }

  async detectLocation(): Promise<void> {
    this.isLocating.set(true);

    try {
      const location = await this.geolocationService.locateAndDescribe();
      this.location.set(location);
    } catch {
      // La aplicación continúa funcionando aunque no se conceda ubicación.
    } finally {
      this.isLocating.set(false);
    }
  }

  onLocationChange(location: NetworkLocation): void {
    this.location.set(location);
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

  async runNetworkTestAndRefresh(
    showSuccessToast = true
  ): Promise<void> {
    if (this.isRunningTest()) {
      return;
    }

    this.isRunningTest.set(true);

    try {
      await this.networkMeasurementService.runNetworkTest();
      await this.loadBackendResults();

      if (showSuccessToast) {
        this.showToast(
          'Métricas reales actualizadas desde el backend',
          'success'
        );
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

      this.showToast(
        'No existen datos suficientes para generar recomendaciones.',
        'error'
      );
    } finally {
      this.isLoadingRecommendations.set(false);
    }
  }

  private async loadBackendResults(): Promise<void> {
    const id = this.sessionId();

    const [
      live,
      history,
      statistics,
      queueMetrics,
      recommendations
    ] = await Promise.all([
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

  showToast(
    message: string,
    type: 'success' | 'info' | 'error'
  ): void {
    this.toastMessage.set(message);
    this.toastType.set(type);

    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  exportData(): void {
    const historyPoints = this.history()?.points ?? [];

    if (historyPoints.length === 0) {
      this.showToast(
        'No hay historial disponible para exportar.',
        'info'
      );
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

    const rows = historyPoints.map((point) =>
      [
        point.timestamp,
        point.latency_ms,
        point.jitter_ms,
        point.download_mbps,
        point.upload_mbps ?? '',
        point.packet_loss_pct,
        point.failed_requests,
        point.total_requests
      ].join(',')
    );

    const blob = new Blob(
      [headers + '\n' + rows.join('\n')],
      {
        type: 'text/csv;charset=utf-8;'
      }
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
    URL.revokeObjectURL(url);

    this.showToast(
      'Archivo CSV descargado correctamente',
      'success'
    );
  }

  getGeneralStatus(): string {
    return this.queueMetrics()?.stability_status ?? 'SIN DATOS';
  }

  getGeneralStatusClass(): string {
    const status = this.getGeneralStatus();

    if (status === 'ESTABLE') {
      return 'status-online';
    }

    if (
      status === 'ADVERTENCIA' ||
      status === 'ALTA_UTILIZACION'
    ) {
      return 'status-warning';
    }

    if (status === 'INESTABLE') {
      return 'status-danger';
    }

    return 'status-neutral';
  }

  getLatencyStatus(): string {
    const value = this.liveMetrics()?.latency_ms ?? 0;

    return value <= 50
      ? 'Óptimo'
      : value <= 120
        ? 'Moderado'
        : 'Crítico';
  }

  getPacketLossStatus(): string {
    const value = this.liveMetrics()?.packet_loss_pct ?? 0;

    return value <= 2
      ? 'Bajo'
      : value <= 5
        ? 'Moderado'
        : 'Alto';
  }

  getJitterStatus(): string {
    const value = this.liveMetrics()?.jitter_ms ?? 0;

    return value <= 10
      ? 'Óptimo'
      : value <= 30
        ? 'Moderado'
        : 'Crítico';
  }

  getStatusTextClass(status: string): string {
    if (
      status === 'Óptimo' ||
      status === 'Bajo'
    ) {
      return 'text-green-600 font-bold';
    }

    if (status === 'Moderado') {
      return 'text-yellow-500 font-bold';
    }

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

  confirmNetworkName(): void {
    const newName = this.networkNameDraft().trim();

    if (!newName) {
      this.showToast(
        'Debes ingresar un nombre para la red.',
        'error'
      );
      return;
    }

    const previousName = this.networkName().trim();
    const networkChanged =
      previousName.length > 0 &&
      previousName !== newName;

    if (networkChanged) {
      const newSessionId =
        this.networkMeasurementService.startNewSession();

      this.sessionId.set(newSessionId);
      this.clearCurrentAnalysis();
    }

    this.networkName.set(newName);
    this.networkNameDraft.set(newName);
    this.isEditingNetworkName.set(false);

    this.showToast(
      networkChanged
        ? `Red actualizada a "${newName}". Se inició una nueva sesión.`
        : `Red "${newName}" confirmada.`,
      'success'
    );
  }

  editNetworkName(): void {
    this.networkNameDraft.set(this.networkName());
    this.isEditingNetworkName.set(true);
  }

  private clearCurrentAnalysis(): void {
    this.liveMetrics.set(null);
    this.history.set(null);
    this.statistics.set(null);
    this.queueMetrics.set(null);
    this.recommendations.set(null);
  }

  private async loadNetworkNameFromBackend(): Promise<void> {
    const currentSessionId = this.sessionId();

    if (!currentSessionId) {
      return;
    }

    try {
      const profile = await firstValueFrom(
        this.networkApiService.getNetworkProfileForSession(
          currentSessionId
        )
      );

      this.networkName.set(profile.name);
      this.networkNameDraft.set(profile.name);
      this.isEditingNetworkName.set(false);
    } catch (error) {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 404
      ) {
        // Es una sesión nueva y todavía no tiene una red asociada.
        return;
      }

      console.error(
        'No se pudo recuperar la red guardada:',
        error
      );
    }
  }
}