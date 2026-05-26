import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home';
import { DashboardComponent } from './pages/dashboard/dashboard';

export const routes: Routes = [

  {
    path:'',
    component:HomeComponent
  },

  {
    path:'dashboard',
    component:DashboardComponent
  }

];