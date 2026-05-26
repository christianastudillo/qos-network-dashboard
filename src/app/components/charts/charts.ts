import { Component } from '@angular/core';

import {
  BaseChartDirective
} from 'ng2-charts';

import {
  ChartConfiguration
} from 'chart.js';

@Component({
  selector: 'app-charts',
  standalone:true,
  imports:[
    BaseChartDirective
  ],
  templateUrl: './charts.html',
})
export class ChartsComponent {

  public lineChartData: ChartConfiguration<'line'>['data'] = {

    labels: [
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00'
    ],

    datasets: [

      {
        data: [20,35,28,50,40,70,60],
        label: 'Tráfico QoS',
        tension:0.4,
        fill:true
      }

    ]

  };

  public lineChartOptions: ChartConfiguration<'line'>['options'] = {

    responsive:true,

    plugins: {

      legend: {
        labels:{
          color:'white'
        }
      }

    },

    scales: {

      x: {
        ticks:{
          color:'white'
        },
        grid:{
          color:'rgba(255,255,255,0.05)'
        }
      },

      y: {
        ticks:{
          color:'white'
        },
        grid:{
          color:'rgba(255,255,255,0.05)'
        }
      }

    }

  };

}