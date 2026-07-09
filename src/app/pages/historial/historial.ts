import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SidebarComponent } from '../../components/sidebar/sidebar';
import { NavbarComponent } from '../../components/navbar/navbar';
import { IconComponent } from '../../components/icon/icon';

import { AuthService } from '../../services/auth.service';
import { AnalysisHistoryService } from '../../services/analysis-history.service';
import { AnalysisRecord } from '../../models/analysis-record.model';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, NavbarComponent, IconComponent],
  templateUrl: './historial.html',
  styleUrls: ['./historial.css']
})
export class HistorialComponent implements OnInit {
  records = signal<AnalysisRecord[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  userEmail = () => this.authService.currentUser()?.email ?? null;

  constructor(
    private readonly authService: AuthService,
    private readonly analysisHistoryService: AnalysisHistoryService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadHistory();
  }

  async loadHistory(): Promise<void> {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const records = await this.analysisHistoryService.getHistory(uid);
      this.records.set(records);
    } catch (error) {
      console.error(error);
      this.errorMessage.set('No se pudo cargar tu historial. Intenta de nuevo más tarde.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteRecord(id: string | undefined, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    if (!id) return;

    this.deletingId.set(id);
    try {
      await this.analysisHistoryService.deleteRecord(id);
      this.records.set(this.records().filter((r) => r.id !== id));
    } catch (error) {
      console.error(error);
    } finally {
      this.deletingId.set(null);
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigateByUrl('/');
  }
}
