import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { LiveMetricsResponse } from '../../models/network.models';

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-cards.html',
  styleUrls: ['./stats-cards.css']
})
export class StatsCardsComponent {
  @Input() liveMetrics: LiveMetricsResponse | null = null;

  get metrics() {
    return [
      {
        title: 'Latencia',
        value: this.liveMetrics ? `${this.liveMetrics.latency_ms.toFixed(2)} ms` : '--',
        icon: '📡'
      },
      {
        title: 'Jitter',
        value: this.liveMetrics ? `${this.liveMetrics.jitter_ms.toFixed(2)} ms` : '--',
        icon: '⚡'
      },
      {
        title: 'Packet Loss',
        value: this.liveMetrics ? `${this.liveMetrics.packet_loss_pct.toFixed(2)}%` : '--',
        icon: '📉'
      },
      {
        title: 'Throughput',
        value: this.liveMetrics ? `${this.liveMetrics.download_mbps.toFixed(2)} Mbps` : '--',
        icon: '🚀'
      }
    ];
  }
}