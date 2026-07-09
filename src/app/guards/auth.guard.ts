import { Injector, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AuthService } from '../services/auth.service';

/** Espera a que Firebase resuelva el estado de sesión antes de decidir. */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const injector = inject(Injector);

  return toObservable(authService.authReady, { injector }).pipe(
    filter((ready) => ready),
    take(1),
    map(() => {
      if (authService.currentUser()) {
        return true;
      }
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    })
  );
};
