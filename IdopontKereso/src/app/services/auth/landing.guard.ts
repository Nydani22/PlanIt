import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const landingGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  if (Object.keys(route.queryParams).length > 0) {
    return router.createUrlTree(['/']);
  }

  return true;
};