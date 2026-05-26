import { Component } from '@angular/core';

@Component({
  selector: 'app-stats-cards',
  standalone:true,
  templateUrl: './stats-cards.html',
})
export class StatsCardsComponent {

  metrics = [

    {
      title:'Latencia',
      value:'24 ms',
      icon:'📡'
    },

    {
      title:'Jitter',
      value:'5 ms',
      icon:'⚡'
    },

    {
      title:'Packet Loss',
      value:'2%',
      icon:'📉'
    },

    {
      title:'Throughput',
      value:'150 Mbps',
      icon:'🚀'
    }

  ];

}