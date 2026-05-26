import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-network-simulator',
  standalone:true,
  imports:[FormsModule],
  templateUrl: './network-simulator.html',
})
export class NetworkSimulatorComponent {

  lambda:number = 5;
  mu:number = 8;

  utilization:number = 0;
  averageTime:number = 0;
  queueLength:number = 0;

  calculate(){

    if(this.mu <= this.lambda){
      alert('µ debe ser mayor que λ');
      return;
    }

    this.utilization =
      this.lambda / this.mu;

    this.averageTime =
      1 / (this.mu - this.lambda);

    this.queueLength =
      this.lambda / (this.mu - this.lambda);

  }

}