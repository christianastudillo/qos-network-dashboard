import { FirebaseApp, initializeApp } from 'firebase/app';

import { environment } from '../environments/environment';

/**
 * Instancia única de la app de Firebase. Se usa el SDK modular "firebase"
 * directamente (sin @angular/fire) porque esa librería aún no publica
 * soporte para Angular 21 (peer dependency desactualizada).
 */
let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(environment.firebase);
  }
  return app;
}
