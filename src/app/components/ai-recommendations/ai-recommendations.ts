import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-recommendations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-container">
      <div class="ai-header">
        <div class="ai-title-wrapper">
          <span class="ai-icon">✨</span>
          <h2 class="ai-title">QoS AI Engine</h2>
        </div>
        <button (click)="generateRecommendations()" class="btn-ai" [disabled]="isAnalyzing()">
          {{ isAnalyzing() ? 'Analizando Red...' : 'Generar Diagnóstico' }}
        </button>
      </div>

      <div class="ai-content">
        @if (isAnalyzing()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Procesando métricas de latencia, jitter y rendimiento mediante modelos M/M/1...</p>
          </div>
        } @else if (recommendations().length > 0) {
          <ul class="recommendation-list">
            @for (rec of recommendations(); track rec.id) {
              <li class="rec-item" [ngClass]="rec.type">
                <div class="rec-icon">
                  {{ rec.type === 'critical' ? '⚠️' : (rec.type === 'warning' ? '⚡' : '✅') }}
                </div>
                <div class="rec-text">
                  <strong>{{ rec.title }}</strong>
                  <p>{{ rec.description }}</p>
                </div>
              </li>
            }
          </ul>
        } @else {
          <div class="empty-state">
            <p>El motor de IA está en reposo. Ejecuta un diagnóstico para obtener recomendaciones sobre la configuración de QoS.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .ai-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.04); }
    .ai-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; }
    .ai-title-wrapper { display: flex; align-items: center; gap: 0.75rem; }
    .ai-icon { font-size: 1.5rem; }
    .ai-title { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0; }
    
    .btn-ai { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.3); }
    .btn-ai:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); }
    .btn-ai:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; color: #64748b; }
    
    .loading-state, .empty-state { text-align: center; padding: 3rem 1rem; color: #64748b; font-weight: 500; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    .recommendation-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
    .rec-item { display: flex; gap: 1rem; padding: 1.25rem; border-radius: 1rem; border: 1px solid transparent; transition: all 0.2s; align-items: flex-start; }
    .rec-item.critical { background: #fef2f2; border-color: #fecaca; }
    .rec-item.warning { background: #fffbeb; border-color: #fde68a; }
    .rec-item.success { background: #f0fdf4; border-color: #bbf7d0; }
    .rec-item:hover { transform: scale(1.01); }
    
    .rec-icon { font-size: 1.5rem; }
    .rec-text strong { display: block; color: #0f172a; margin-bottom: 0.25rem; font-size: 1.05rem; }
    .rec-text p { margin: 0; color: #475569; font-size: 0.95rem; line-height: 1.5; }
  `]
})
export class AiRecommendationsComponent {
  isAnalyzing = signal(false);
  recommendations = signal<any[]>([]);

  generateRecommendations() {
    this.isAnalyzing.set(true);
    this.recommendations.set([]);

    // Simulamos el tiempo de procesamiento de una API de IA
    setTimeout(() => {
      this.recommendations.set([
        {
          id: 1,
          type: 'critical',
          title: 'Saturación en el Gateway Principal detectada',
          description: 'El uso del CPU en el Gateway Principal supera el 85%. Se recomienda aplicar políticas de Traffic Shaping (conformación de tráfico) para limitar los flujos no críticos.'
        },
        {
          id: 2,
          type: 'warning',
          title: 'Fluctuación de Jitter en enlaces UDP',
          description: 'Se ha registrado un incremento del 4% en el Jitter. Implemente una cola de prioridad estricta (PQ) para el tráfico de voz/video para garantizar la calidad de la llamada.'
        },
        {
          id: 3,
          type: 'success',
          title: 'Rendimiento general estable',
          description: 'La latencia promedio se mantiene en niveles óptimos (< 30ms). La configuración actual de Differentiated Services (DiffServ) está operando correctamente.'
        }
      ]);
      this.isAnalyzing.set(false);
    }, 2500);
  }
}