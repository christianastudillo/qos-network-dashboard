import { Component } from '@angular/core';

import { SidebarComponent } from '../../components/sidebar/sidebar';
import { StatsCardsComponent } from '../../components/stats-cards/stats-cards';
import { ChartsComponent } from '../../components/charts/charts';
import { NetworkSimulatorComponent } from '../../components/network-simulator/network-simulator';

@Component({
  selector: 'app-dashboard',
  standalone:true,
  imports:[
    SidebarComponent,
    StatsCardsComponent,
    ChartsComponent,
    NetworkSimulatorComponent
  ],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {}