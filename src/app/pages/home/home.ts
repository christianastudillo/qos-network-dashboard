import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NavbarComponent } from '../../components/navbar/navbar';

@Component({
  selector: 'app-home',
  standalone:true,
  imports:[
    RouterLink,
    NavbarComponent
  ],
  templateUrl: './home.html',
})
export class HomeComponent {}