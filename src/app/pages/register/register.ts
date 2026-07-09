import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  async onSubmit(): Promise<void> {
    if (!this.email().trim() || !this.password()) {
      this.errorMessage.set('Completa todos los campos.');
      return;
    }

    if (this.password().length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.register(this.email().trim(), this.password());
      this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
