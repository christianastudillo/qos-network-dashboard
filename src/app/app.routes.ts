import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'QoS Analytics — Monitoreo de Red Inteligente' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'Iniciar sesión — QoS Analytics' },
  { path: 'registro', component: RegisterComponent, canActivate: [guestGuard], title: 'Crear cuenta — QoS Analytics' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], title: 'Dashboard — QoS Analytics' },
  {
    path: 'historial',
    loadComponent: () => import('./pages/historial/historial').then(m => m.HistorialComponent),
    canActivate: [authGuard],
    title: 'Historial — QoS Analytics'
  },
  {
    path: 'historial/:id',
    loadComponent: () => import('./pages/historial-detail/historial-detail').then(m => m.HistorialDetailComponent),
    canActivate: [authGuard],
    title: 'Detalle de análisis — QoS Analytics'
  },
  { path: '**', redirectTo: '' }
];
