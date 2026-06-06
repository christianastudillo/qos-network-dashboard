import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-network-simulator',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="sim-container">
      <div class="controls">
        <button (click)="runSimulation()" class="btn-sim" [disabled]="isRunning()">
          {{ isRunning() ? 'Calculando M/M/1...' : 'Ejecutar Simulación QoS' }}
        </button>
      </div>
      
      <div class="results" [class.show]="hasResults()">
        <div class="result-card">
          <span class="label">Tasa de Llegada (λ)</span>
          <strong class="value text-blue-600">{{ lambda() }} paq/s</strong>
        </div>
        <div class="result-card">
          <span class="label">Tasa de Servicio (μ)</span>
          <strong class="value text-green-600">{{ mu() }} paq/s</strong>
        </div>
        <div class="result-card">
          <span class="label">Utilización de Red (ρ)</span>
          <strong class="value text-yellow-600">{{ rho() | number:'1.2-2' }}%</strong>
        </div>
        <div class="result-card">
          <span class="label">Tiempo en Cola (Wq)</span>
          <strong class="value text-red-600">{{ wq() | number:'1.2-2' }} ms</strong>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sim-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .controls { display: flex; justify-content: center; margin-bottom: 2rem; }
    .btn-sim { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39); }
    .btn-sim:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-2px); }
    .btn-sim:disabled { background: #94a3b8; cursor: not-allowed; box-shadow: none; }
    .results { display: none; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
    .results.show { display: grid; }
    .result-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.5rem; }
    .label { color: #64748b; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 2rem; font-weight: 900; }
  `]
})
export class NetworkSimulatorComponent {
  isRunning = signal(false);
  hasResults = signal(false);
  
  lambda = signal(0);
  mu = signal(0);
  rho = signal(0);
  wq = signal(0);

  runSimulation() {
    this.isRunning.set(true);
    
    setTimeout(() => {
      const l = Math.floor(Math.random() * 80) + 20; 
      const m = Math.floor(Math.random() * 50) + 120; 
      
      const r = (l / m) * 100;
      const w = (l / (m * (m - l))) * 1000;
      
      this.lambda.set(l);
      this.mu.set(m);
      this.rho.set(r);
      this.wq.set(w);
      
      this.isRunning.set(false);
      this.hasResults.set(true);
    }, 1500);
  }
}