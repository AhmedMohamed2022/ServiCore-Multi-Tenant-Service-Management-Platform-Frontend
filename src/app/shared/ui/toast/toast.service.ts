import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Transient feedback for actions that succeed or fail without changing the
 * page. Persistent, in-context problems (a failed page load, a validation
 * summary) should still use <sc-alert> inline — a toast that disappears is the
 * wrong place for something the user needs to act on.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'sc-toast-success', 3500, 'polite');
  }

  error(message: string): void {
    // Errors stay longer — they are usually unexpected and worth reading.
    this.show(message, 'sc-toast-error', 6000, 'assertive');
  }

  info(message: string): void {
    this.show(message, 'sc-toast-info', 3500, 'polite');
  }

  /**
   * Material announces the message through an aria-live region. Failures are
   * announced assertively (they interrupt); confirmations politely (they wait
   * for the screen reader to finish).
   */
  private show(
    message: string,
    panelClass: string,
    duration: number,
    politeness: 'polite' | 'assertive',
  ): void {
    this.snackBar.open(message, 'Dismiss', {
      duration,
      politeness,
      panelClass: [panelClass],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }
}
