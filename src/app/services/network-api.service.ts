import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  MeasurementPayload,
  MeasurementResponse,
  LiveMetricsResponse,
  MetricsHistoryResponse,
  StatisticsResponse,
  QueueRealtimeResponse,
  RecommendationResponse
} from '../models/network.models';

@Injectable({
  providedIn: 'root'
})
export class NetworkApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  ping(): Observable<{ status: string; message: string; server_timestamp: string }> {
    return this.http.get<{ status: string; message: string; server_timestamp: string }>(
      `${this.apiUrl}/probe/ping`
    );
  }

  downloadProbe(sizeKb: number = 512): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/probe/download?size_kb=${sizeKb}`, {
      responseType: 'blob'
    });
  }

  ingestMeasurement(payload: MeasurementPayload): Observable<MeasurementResponse> {
    return this.http.post<MeasurementResponse>(
      `${this.apiUrl}/measurements/ingest`,
      payload
    );
  }

  getLiveMetrics(sessionId: string): Observable<LiveMetricsResponse> {
    return this.http.get<LiveMetricsResponse>(
      `${this.apiUrl}/metrics/live/${sessionId}`
    );
  }

  getMetricsHistory(sessionId: string): Observable<MetricsHistoryResponse> {
    return this.http.get<MetricsHistoryResponse>(
      `${this.apiUrl}/metrics/history/${sessionId}`
    );
  }

  getStatistics(sessionId: string): Observable<StatisticsResponse> {
    return this.http.get<StatisticsResponse>(
      `${this.apiUrl}/statistics/${sessionId}`
    );
  }

  getQueueMetrics(sessionId: string): Observable<QueueRealtimeResponse> {
    return this.http.get<QueueRealtimeResponse>(
      `${this.apiUrl}/queue/realtime/${sessionId}`
    );
  }

  getRecommendations(sessionId: string): Observable<RecommendationResponse> {
    return this.http.get<RecommendationResponse>(
      `${this.apiUrl}/recommendations/${sessionId}`
    );
  }

  clearMeasurements(sessionId: string): Observable<{ status: string; session_id: string }> {
    return this.http.delete<{ status: string; session_id: string }>(
      `${this.apiUrl}/measurements/${sessionId}`
    );
  }
}