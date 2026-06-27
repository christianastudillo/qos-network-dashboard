export interface MeasurementPayload {
  session_id: string;
  latency_ms: number;
  jitter_ms: number;
  download_mbps: number;
  upload_mbps?: number | null;
  failed_requests: number;
  total_requests: number;
  measurement_duration_s: number;
  client_timestamp?: string;
  device_type?: string;
  network_type?: string;
}

export interface MeasurementResponse {
  session_id: string;
  latency_ms: number;
  jitter_ms: number;
  download_mbps: number;
  upload_mbps?: number | null;
  failed_requests: number;
  total_requests: number;
  packet_loss_pct: number;
  measurement_duration_s: number;
  server_timestamp: string;
}

export interface LiveMetricsResponse {
  session_id: string;
  latency_ms: number;
  jitter_ms: number;
  download_mbps: number;
  upload_mbps?: number | null;
  packet_loss_pct: number;
  failed_requests: number;
  total_requests: number;
  measurement_duration_s: number;
  last_updated: string;
}

export interface MetricHistoryPoint {
  timestamp: string;
  latency_ms: number;
  jitter_ms: number;
  download_mbps: number;
  upload_mbps?: number | null;
  packet_loss_pct: number;
  failed_requests: number;
  total_requests: number;
}

export interface MetricsHistoryResponse {
  session_id: string;
  points: MetricHistoryPoint[];
  total_points: number;
}

export interface BasicStats {
  mean: number;
  median: number;
  variance: number;
  std_dev: number;
  minimum: number;
  maximum: number;
}

export interface HistogramData {
  bins: string[];
  counts: number[];
}

export interface StatisticsResponse {
  session_id: string;
  sample_count: number;
  latency_stats: BasicStats;
  jitter_stats: BasicStats;
  download_stats: BasicStats;
  packet_loss_stats: BasicStats;
  lambda_rate: number;
  traffic_trend: string;
  latency_histogram?: HistogramData | null;
  throughput_histogram?: HistogramData | null;
  analysis_message: string;
}

export interface QueueRealtimeResponse {
  session_id: string;
  lambda_rate: number;
  mu_rate: number;
  rho: number;
  rho_pct: number;
  l: number;
  lq: number;
  w_ms: number;
  wq_ms: number;
  is_stable: boolean;
  stability_status: string;
  congestion_probability: number;
  congestion_probability_pct: number;
  analysis_message: string;
}

export interface RecommendationItem {
  title: string;
  description: string;
  priority: string;
  metric_reference?: string | null;
}

export interface RecommendationResponse {
  session_id: string;
  overall_status: string;
  congestion_probability_pct: number;
  summary: string;
  recommendations: RecommendationItem[];
  generated_by: string;
  generated_at: string;
}