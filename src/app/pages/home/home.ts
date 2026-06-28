import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {

  menuOpen = false;

  // Abre/cierra el menú hamburguesa
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  // Cierra el menú al hacer click en un link
  closeMenu() {
    this.menuOpen = false;
  }

  // Cierra el menú si se hace click fuera de él
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideNav = target.closest('.navbar');
    if (!clickedInsideNav) {
      this.menuOpen = false;
    }
  }

  // Abre el repositorio en una nueva pestaña
  abrirProyecto() {
    window.open('https://github.com/christianastudillo/qos-network-dashboard', '_blank');
  }

}
