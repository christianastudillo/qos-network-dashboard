import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { NetworkApiService } from './network-api.service';
import { MeasurementPayload, MeasurementResponse } from '../models/network.models';

@Injectable({
  providedIn: 'root'
})
export class NetworkMeasurementService {
  private readonly sessionStorageKey = 'qos_network_session_id';

  constructor(private readonly networkApiService: NetworkApiService) {}

  getSessionId(): string {
    const existingSessionId = localStorage.getItem(this.sessionStorageKey);

    if (existingSessionId) {
      return existingSessionId;
    }

    const newSessionId = crypto.randomUUID();
    localStorage.setItem(this.sessionStorageKey, newSessionId);

    return newSessionId;
  }

  async runNetworkTest(): Promise<MeasurementResponse> {
    const sessionId = this.getSessionId();

    const testStart = performance.now();

    const latencyResults = await this.measureLatency(10);
    const downloadMbps = await this.measureDownloadSpeed(512);

    const testEnd = performance.now();
    const measurementDurationS = (testEnd - testStart) / 1000;

    const successfulLatencies = latencyResults.latencies;
    const failedRequests = latencyResults.failedRequests;
    const totalRequests = latencyResults.totalRequests;

    const averageLatency = this.calculateAverage(successfulLatencies);
    const jitter = this.calculateJitter(successfulLatencies);

    const payload: MeasurementPayload = {
      session_id: sessionId,
      latency_ms: Number(averageLatency.toFixed(2)),
      jitter_ms: Number(jitter.toFixed(2)),
      download_mbps: Number(downloadMbps.toFixed(2)),
      upload_mbps: null,
      failed_requests: failedRequests,
      total_requests: totalRequests,
      measurement_duration_s: Number(measurementDurationS.toFixed(2)),
      client_timestamp: new Date().toISOString(),
      device_type: this.detectDeviceType(),
      network_type: this.detectNetworkType()
    };

    return firstValueFrom(
      this.networkApiService.ingestMeasurement(payload)
    );
  }

  private async measureLatency(requestCount: number): Promise<{
    latencies: number[];
    failedRequests: number;
    totalRequests: number;
  }> {
    const latencies: number[] = [];
    let failedRequests = 0;

    for (let i = 0; i < requestCount; i++) {
      const start = performance.now();

      try {
        await firstValueFrom(this.networkApiService.ping());

        const end = performance.now();
        latencies.push(end - start);
      } catch {
        failedRequests++;
      }
    }

    return {
      latencies,
      failedRequests,
      totalRequests: requestCount
    };
  }

  private async measureDownloadSpeed(sizeKb: number): Promise<number> {
    const start = performance.now();

    const blob = await firstValueFrom(
      this.networkApiService.downloadProbe(sizeKb)
    );

    const end = performance.now();

    const durationSeconds = (end - start) / 1000;
    const bytesDownloaded = blob.size;

    if (durationSeconds <= 0) {
      return 0;
    }

    return (bytesDownloaded * 8) / durationSeconds / 1_000_000;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
  }

  private calculateJitter(latencies: number[]): number {
    if (latencies.length < 2) {
      return 0;
    }

    const differences: number[] = [];

    for (let i = 1; i < latencies.length; i++) {
      differences.push(Math.abs(latencies[i] - latencies[i - 1]));
    }

    return this.calculateAverage(differences);
  }

  private detectDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/mobile|android|iphone|ipod/.test(userAgent)) {
      return 'mobile';
    }

    if (/ipad|tablet/.test(userAgent)) {
      return 'tablet';
    }

    return 'desktop';
  }

  private detectNetworkType(): string {
    const navigatorWithConnection = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        type?: string;
      };
    };

    return (
      navigatorWithConnection.connection?.effectiveType ||
      navigatorWithConnection.connection?.type ||
      'unknown'
    );
  }
}