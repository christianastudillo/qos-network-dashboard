import { NetworkLocation } from './network-location.model';
import {
  LiveMetricsResponse,
  QueueRealtimeResponse,
  RecommendationResponse,
} from './network.models';

export interface StatisticsSummary {
  latency_mean: number;
  latency_std_dev: number;
  jitter_mean: number;
  download_mean: number;
  lambda_rate: number;
  traffic_trend: string;
}

/**
 * Snapshot puntual de un análisis, guardado en Firestore bajo la cuenta
 * del usuario. Se guardan las respuestas completas de queue/recommendations
 * (no resúmenes) para poder reutilizar tal cual NetworkSimulatorComponent y
 * AiRecommendationsComponent en la vista de detalle del historial.
 */
export interface AnalysisRecord {
  id?: string;
  uid: string;
  networkName: string;
  location: NetworkLocation | null;
  sessionId: string;
  createdAt: string;
  liveMetrics: LiveMetricsResponse | null;
  statistics: StatisticsSummary | null;
  queue: QueueRealtimeResponse | null;
  recommendations: RecommendationResponse | null;
}
