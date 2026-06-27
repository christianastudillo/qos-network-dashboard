import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { RecommendationItem, RecommendationResponse } from '../../models/network.models';

@Component({
  selector: 'app-ai-recommendations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-container dark:bg-slate-800 dark:border-slate-700">
      <div class="ai-header">
        <div class="ai-title-wrapper">
          <span class="ai-icon">✨</span>
          <h2 class="ai-title dark:text-white">QoS AI Engine</h2>
        </div>

        <button
          (click)="refreshRecommendations.emit()"
          class="btn-ai"
          [disabled]="isLoading"
        >
          {{ isLoading ? 'Analizando red...' : 'Actualizar diagnóstico' }}
        </button>
      </div>

      <div class="ai-content">
        @if (isLoading) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Procesando métricas reales, estadística y modelo M/M/1...</p>
          </div>
        } @else if (recommendationResponse) {
          <div class="mb-5 p-4 rounded-xl bg-blue-50 text-blue-900">
            <p class="font-bold mb-1">Resumen</p>
            <p>{{ recommendationResponse.summary }}</p>
            <p class="mt-2 text-sm">
              Probabilidad de congestión:
              <strong>{{ recommendationResponse.congestion_probability_pct | number:'1.2-2' }}%</strong>
            </p>
          </div>

          <ul class="recommendation-list">
            @for (rec of recommendationResponse.recommendations; track rec.title) {
              <li class="rec-item" [ngClass]="getRecommendationClass(rec)">
                <div class="rec-icon">
                  {{ getRecommendationIcon(rec) }}
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
            <p>Ejecuta una medición de red para obtener el contexto de recomendaciones.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .ai-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.04); }
    .ai-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; gap: 1rem; }
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
    .rec-item.info { background: #eff6ff; border-color: #bfdbfe; }
    .rec-item:hover { transform: scale(1.01); }
    .rec-icon { font-size: 1.5rem; }
    .rec-text strong { display: block; color: #0f172a; margin-bottom: 0.25rem; font-size: 1.05rem; }
    .rec-text p { margin: 0; color: #475569; font-size: 0.95rem; line-height: 1.5; }
  `]
})
export class AiRecommendationsComponent {
  @Input() recommendationResponse: RecommendationResponse | null = null;
  @Input() isLoading = false;

  @Output() refreshRecommendations = new EventEmitter<void>();

  getRecommendationClass(rec: RecommendationItem): string {
    if (rec.priority === 'critical') {
      return 'critical';
    }

    if (rec.priority === 'warning') {
      return 'warning';
    }

    if (rec.priority === 'success') {
      return 'success';
    }

    return 'info';
  }

  getRecommendationIcon(rec: RecommendationItem): string {
    if (rec.priority === 'critical') {
      return '⚠️';
    }

    if (rec.priority === 'warning') {
      return '⚡';
    }

    if (rec.priority === 'success') {
      return '✅';
    }

    return 'ℹ️';
  }
}