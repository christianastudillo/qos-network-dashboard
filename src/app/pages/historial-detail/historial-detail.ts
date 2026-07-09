import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SidebarComponent } from '../../components/sidebar/sidebar';
import { NavbarComponent } from '../../components/navbar/navbar';
import { IconComponent } from '../../components/icon/icon';
import { StatsCardsComponent } from '../../components/stats-cards/stats-cards';
import { NetworkSimulatorComponent } from '../../components/network-simulator/network-simulator';
import { AiRecommendationsComponent } from '../../components/ai-recommendations/ai-recommendations';
import { NetworkLocationMapComponent } from '../../components/network-location-map/network-location-map';

import { AuthService } from '../../services/auth.service';
import { AnalysisHistoryService } from '../../services/analysis-history.service';
import { AnalysisRecord } from '../../models/analysis-record.model';

@Component({
  selector: 'app-historial-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SidebarComponent,
    NavbarComponent,
    IconComponent,
    StatsCardsComponent,
    NetworkSimulatorComponent,
    AiRecommendationsComponent,
    NetworkLocationMapComponent,
  ],
  templateUrl: './historial-detail.html',
  styleUrls: ['./historial-detail.css']
})
export class HistorialDetailComponent implements OnInit {
  record = signal<AnalysisRecord | null>(null);
  isLoading = signal(true);
  notFound = signal(false);

  userEmail = () => this.authService.currentUser()?.email ?? null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly analysisHistoryService: AnalysisHistoryService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }

    try {
      const record = await this.analysisHistoryService.getById(id);
      const uid = this.authService.currentUser()?.uid;
      if (!record || record.uid !== uid) {
        this.notFound.set(true);
      } else {
        this.record.set(record);
      }
    } catch (error) {
      console.error(error);
      this.notFound.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigateByUrl('/');
  }
}
