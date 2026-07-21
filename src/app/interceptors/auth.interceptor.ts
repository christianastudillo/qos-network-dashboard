import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Adjunta el ID token de Firebase a las peticiones dirigidas al backend propio. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = environment.apiUrl;
  const isOwnApiRequest = req.url === apiUrl || req.url.startsWith(`${apiUrl}/`);

  if (!isOwnApiRequest) {
    return next(req);
  }

  const authService = inject(AuthService);

  return from(authService.getIdToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return next(req);
      }

      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });

      return next(authReq);
    })
  );
};
