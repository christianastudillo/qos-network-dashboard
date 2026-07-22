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
  'auth/popup-closed-by-user':
    'Cerraste la ventana de Google antes de completar el inicio de sesión.',
  'auth/popup-blocked':
    'El navegador bloqueó la ventana de inicio de sesión de Google.',
  'auth/cancelled-popup-request':
    'La solicitud de inicio de sesión con Google fue cancelada.',
  'auth/account-exists-with-different-credential':
    'Ya existe una cuenta con este correo usando otro método de inicio de sesión.',
  'auth/unauthorized-domain':
    'Este dominio no está autorizado en Firebase Authentication.',
  'auth/operation-not-allowed':
    'El inicio de sesión con Google no está habilitado en Firebase.'
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

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

  private async getAuthModule(): Promise<typeof import('firebase/auth')> {
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
    try {
      const { onAuthStateChanged } = await this.getAuthModule();
      const auth = await this.getAuthInstance();

      onAuthStateChanged(
        auth,
        (user) => {
          this.currentUser.set(user);
          this.authReady.set(true);
        },
        (error) => {
          console.error('Error comprobando la sesión de Firebase:', error);
          this.currentUser.set(null);
          this.authReady.set(true);
        }
      );
    } catch (error) {
      console.error('Error inicializando Firebase Authentication:', error);
      this.currentUser.set(null);
      this.authReady.set(true);
    }
  }

  async login(email: string, password: string): Promise<void> {
    const { signInWithEmailAndPassword } = await this.getAuthModule();
    const auth = await this.getAuthInstance();

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      this.currentUser.set(credential.user);
    } catch (error) {
      throw new Error(this.translateError(error));
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (!this.isBrowser) {
      throw new Error(
        'El inicio de sesión con Google solo está disponible en el navegador.'
      );
    }

    const {
      GoogleAuthProvider,
      signInWithPopup
    } = await this.getAuthModule();

    const auth = await this.getAuthInstance();
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      const credential = await signInWithPopup(auth, provider);
      this.currentUser.set(credential.user);
    } catch (error) {
      throw new Error(this.translateError(error));
    }
  }

  async register(email: string, password: string): Promise<void> {
    const { createUserWithEmailAndPassword } = await this.getAuthModule();
    const auth = await this.getAuthInstance();

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      this.currentUser.set(credential.user);
    } catch (error) {
      throw new Error(this.translateError(error));
    }
  }

  async logout(): Promise<void> {
    const { signOut } = await this.getAuthModule();
    const auth = await this.getAuthInstance();

    await signOut(auth);
    this.currentUser.set(null);
  }

  async getIdToken(): Promise<string | null> {
    const user = this.currentUser();

    if (!user) {
      return null;
    }

    return user.getIdToken();
  }

  private translateError(error: unknown): string {
    const code = (error as { code?: string })?.code ?? '';

    return (
      ERROR_MESSAGES[code] ??
      'Ocurrió un error inesperado. Intenta de nuevo.'
    );
  }
}