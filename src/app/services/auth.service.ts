import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Auth, User } from 'firebase/auth';

import { getFirebaseApp } from '../firebase';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'El correo ingresado no es válido.',
  'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo más tarde.',
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** null = sin verificar todavía, undefined-like inicial hasta que Firebase resuelva el estado */
  currentUser = signal<User | null>(null);
  authReady = signal(false);

  private authInstance: Auth | null = null;
  private authModulePromise: Promise<typeof import('firebase/auth')> | null = null;

  constructor() {
    if (this.isBrowser) {
      this.initAuthState();
    } else {
      this.authReady.set(true);
    }
  }

  private async getAuthModule() {
    if (!this.authModulePromise) {
      this.authModulePromise = import('firebase/auth');
    }
    return this.authModulePromise;
  }

  private async getAuthInstance(): Promise<Auth> {
    if (!this.authInstance) {
      const { getAuth } = await this.getAuthModule();
      this.authInstance = getAuth(getFirebaseApp());
    }
    return this.authInstance;
  }

  private async initAuthState(): Promise<void> {
    const { onAuthStateChanged } = await this.getAuthModule();
    const auth = await this.getAuthInstance();
    onAuthStateChanged(auth, (user) => {
      this.currentUser.set(user);
      this.authReady.set(true);
    });
  }

  async login(email: string, password: string): Promise<void> {
    const { signInWithEmailAndPassword } = await this.getAuthModule();
    const auth = await this.getAuthInstance();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error(this.translateError(error));
    }
  }

  async register(email: string, password: string): Promise<void> {
    const { createUserWithEmailAndPassword } = await this.getAuthModule();
    const auth = await this.getAuthInstance();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error(this.translateError(error));
    }
  }

  async logout(): Promise<void> {
    const { signOut } = await this.getAuthModule();
    const auth = await this.getAuthInstance();
    await signOut(auth);
  }

  private translateError(error: unknown): string {
    const code = (error as { code?: string })?.code ?? '';
    return ERROR_MESSAGES[code] ?? 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}
