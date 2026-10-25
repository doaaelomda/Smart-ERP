import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * Only the public landing page is prerendered (SEO). The app behind login is a client-side SPA.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
