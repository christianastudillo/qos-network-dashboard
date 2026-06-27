import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { QueueRealtimeResponse } from '../../models/network.models';

@Component({
  selector: 'app-network-simulator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './network-simulator.html',
  styleUrls: ['./network-simulator.css']
})
export class NetworkSimulatorComponent {
  @Input() queueMetrics: QueueRealtimeResponse | null = null;
}