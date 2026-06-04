import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink], 
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {
  
  // Función para abrir tu repositorio o cualquier enlace externo
  abrirProyecto() {
    window.open('https://github.com/christianastudillo/qos-network-dashboard', '_blank');
  }

}