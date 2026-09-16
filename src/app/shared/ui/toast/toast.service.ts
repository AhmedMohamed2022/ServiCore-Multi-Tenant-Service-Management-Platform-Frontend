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
    this.show(message, 'sc-toast-success', 3500);
  }

  error(message: string): void {
    // Errors stay longer — they are usually unexpected and worth reading.
    this.show(message, 'sc-toast-error', 6000);
  }

  info(message: string): void {
    this.show(message, 'sc-toast-info', 3500);
  }

  private show(message: string, panelClass: string, duration: number): void {
    this.snackBar.open(message, 'Dismiss', {
      duration,
      panelClass: [panelClass],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }
}
