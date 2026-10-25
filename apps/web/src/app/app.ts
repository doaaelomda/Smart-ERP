import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule],
  // One toast outlet for the whole app (ToastService). Overlays follow <html dir>.
  template: '<router-outlet /><p-toast position="top-center" [life]="3500" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Instantiated at startup so the theme class follows the saved/system preference.
  private readonly theme = inject(ThemeService);
}
