import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { RecommendationItem, RecommendationResponse } from '../../models/network.models';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-ai-recommendations',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="ai-container">
      <div class="ai-header">
        <div class="ai-title-wrapper">
          <app-icon name="star" [size]="22" class="ai-icon"></app-icon>
          <h2 class="ai-title">QoS AI Engine</h2>
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
                  <app-icon [name]="getRecommendationIcon(rec)" [size]="20"></app-icon>
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
    .ai-container { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.04); }
    .ai-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; gap: 1rem; }
    .ai-title-wrapper { display: flex; align-items: center; gap: 0.75rem; color: var(--color-primary); }
    .ai-title { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0; }
    .btn-ai { background: linear-gradient(135deg, var(--color-primary-darker) 0%, var(--color-primary-light) 100%); color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.3); }
    .btn-ai:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); }
    .btn-ai:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; color: #64748b; }
    .loading-state, .empty-state { text-align: center; padding: 3rem 1rem; color: var(--color-text-muted); font-weight: 500; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .recommendation-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
    .rec-item { display: flex; gap: 1rem; padding: 1.25rem; border-radius: 1rem; border: 1px solid transparent; transition: all 0.2s; align-items: flex-start; }
    .rec-item.critical { background: var(--color-danger-soft); border-color: var(--color-danger-border); color: var(--color-danger-text); }
    .rec-item.warning { background: var(--color-warning-soft); border-color: var(--color-warning-border); color: var(--color-warning-text); }
    .rec-item.success { background: var(--color-success-soft); border-color: var(--color-success-border); color: var(--color-success-text); }
    .rec-item.info { background: var(--color-primary-soft); border-color: var(--color-primary-border); color: var(--color-primary-darker); }
    .rec-item:hover { transform: scale(1.01); }
    .rec-icon { flex-shrink: 0; }
    .rec-text strong { display: block; color: var(--color-text); margin-bottom: 0.25rem; font-size: 1.05rem; }
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
      return 'alert-triangle';
    }

    if (rec.priority === 'warning') {
      return 'zap';
    }

    if (rec.priority === 'success') {
      return 'check-circle';
    }

    return 'info';
  }
}