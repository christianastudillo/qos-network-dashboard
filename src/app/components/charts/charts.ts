import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="block w-full h-[300px]">
      <canvas baseChart
        [type]="'line'"
        [datasets]="lineChartData.datasets"
        [labels]="lineChartData.labels"
        [options]="lineChartOptions"
        [legend]="true">
      </canvas>
    </div>
  `
})
export class ChartsComponent implements OnChanges {
  @Input() realTimeData: number = 0; // Para recibir datos del dashboard

  // Configuración del gráfico
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['10s', '20s', '30s', '40s', '50s', '60s', 'Ahora'],
    datasets: [
      {
        data: [22, 28, 24, 45, 25, 30, 24],
        label: 'Latencia (ms)',
        fill: true,
        tension: 0.4,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        pointBackgroundColor: '#1e3a8a'
      }
    ]
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: { enabled: true, mode: 'index', intersect: false }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.5)' } },
      x: { grid: { display: false } }
    }
  };

  // Actualiza el gráfico cuando recibe nuevos datos (RxJS del Dashboard)
  ngOnChanges(changes: SimpleChanges) {
    if (changes['realTimeData'] && !changes['realTimeData'].isFirstChange()) {
      const newData = this.lineChartData.datasets[0].data;
      newData.shift(); // Elimina el dato más antiguo
      newData.push(this.realTimeData); // Añade el nuevo dato
      
      // Forzamos la actualización de la referencia
      this.lineChartData = { ...this.lineChartData };
    }
  }
}