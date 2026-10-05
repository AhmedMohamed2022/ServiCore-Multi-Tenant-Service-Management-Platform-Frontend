import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { ErrorViewComponent } from './shared/ui/error-view/error-view.component';

/**
 * Browsers word a failed dynamic `import()` differently. All of these mean the
 * same thing for the person: this part of the app could not be downloaded
 * (offline, a flaky connection, or a new deploy removed the old file).
 */
const CHUNK_FAILURE =
  /dynamically imported module|importing a module script failed|loading chunk|chunkloaderror|loading css chunk/i;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ErrorViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  host: { '(document:keydown.escape)': 'dismissChunkError()' },
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** True while the "couldn't load this page" view is showing. */
  protected readonly chunkError = signal(false);

  private readonly reloadButton =
    viewChild<ElementRef<HTMLButtonElement>>('reloadButton');
  private returnFocusTo: HTMLElement | null = null;

  constructor() {
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event instanceof NavigationError) {
          const message = String(
            (event.error as { message?: unknown } | undefined)?.message ??
              event.error ??
              '',
          );
          if (CHUNK_FAILURE.test(message)) {
            this.returnFocusTo = document.activeElement as HTMLElement | null;
            this.chunkError.set(true);
          }
        } else if (event instanceof NavigationStart) {
          this.chunkError.set(false);
        }
      });

    // Move focus into the view when it appears so keyboard and screen-reader
    // users land on the action rather than behind it.
    effect(() => {
      const button = this.reloadButton();
      if (this.chunkError() && button) {
        button.nativeElement.focus();
      }
    });
  }

  protected reload(): void {
    location.reload();
  }

  protected dismissChunkError(): void {
    if (!this.chunkError()) {
      return;
    }
    this.chunkError.set(false);
    const target = this.returnFocusTo;
    this.returnFocusTo = null;
    // The page behind is `inert` until change detection removes the attribute,
    // so focus has to be restored after that render, not in this handler.
    setTimeout(() => target?.focus?.());
  }
}
