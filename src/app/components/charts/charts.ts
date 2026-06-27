import { Component, Input, OnChanges } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

import { MetricHistoryPoint } from '../../models/network.models';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './charts.html',
  styleUrls: ['./charts.css']
})
export class ChartsComponent implements OnChanges {
  @Input() history: MetricHistoryPoint[] = [];

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Latencia (ms)',
        fill: true,
        tension: 0.4,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        pointBackgroundColor: '#1e3a8a'
      },
      {
        data: [],
        label: 'Jitter (ms)',
        fill: false,
        tension: 0.4,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        pointBackgroundColor: '#92400e'
      },
      {
        data: [],
        label: 'Throughput (Mbps)',
        fill: false,
        tension: 0.4,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        pointBackgroundColor: '#047857'
      }
    ]
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  ngOnChanges(): void {
    this.updateChart();
  }

  private updateChart(): void {
    const latestPoints = this.history.slice(-20);

    const labels = latestPoints.map(point =>
      new Date(point.timestamp).toLocaleTimeString()
    );

    const latencyData = latestPoints.map(point => point.latency_ms);
    const jitterData = latestPoints.map(point => point.jitter_ms);
    const throughputData = latestPoints.map(point => point.download_mbps);

    this.lineChartData = {
      labels,
      datasets: [
        {
          ...this.lineChartData.datasets[0],
          data: latencyData
        },
        {
          ...this.lineChartData.datasets[1],
          data: jitterData
        },
        {
          ...this.lineChartData.datasets[2],
          data: throughputData
        }
      ]
    };
  }
}