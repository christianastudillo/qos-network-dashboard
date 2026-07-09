import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rutas dinámicas/con sesión de usuario: no tiene sentido prerenderizarlas
  // en build-time (no hay usuario ni datos todavía) y dependen de Firebase
  // Auth/Firestore, que solo se inicializan en el navegador.
  {
    path: 'dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: 'registro',
    renderMode: RenderMode.Client
  },
  {
    path: 'historial',
    renderMode: RenderMode.Client
  },
  {
    path: 'historial/:id',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
