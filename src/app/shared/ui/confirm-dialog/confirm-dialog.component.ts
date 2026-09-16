import { ChangeDetectionStrategy, Component, inject, Injectable } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { map, Observable } from 'rxjs';
import { IconComponent } from '../icon/icon.component';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

@Component({
  selector: 'sc-confirm-dialog',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-[min(420px,90vw)] p-5">
      <div class="flex items-start gap-3">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          [class]="
            data.tone === 'danger'
              ? 'bg-danger-50 text-danger-600'
              : 'bg-brand-50 text-brand-600'
          ">
          <sc-icon [name]="data.tone === 'danger' ? 'warning' : 'help'" size="sm" />
        </div>
        <div class="min-w-0">
          <h2 class="text-[15px] font-semibold text-ink">{{ data.title }}</h2>
          <p class="mt-1 text-[13px] text-ink-muted">{{ data.message }}</p>
        </div>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="sc-btn sc-btn-secondary" (click)="dialogRef.close(false)">
          {{ data.cancelLabel || 'Cancel' }}
        </button>
        <button
          type="button"
          class="sc-btn"
          [class]="data.tone === 'danger' ? 'sc-btn-danger' : 'sc-btn-primary'"
          cdkFocusInitial
          (click)="dialogRef.close(true)">
          {{ data.confirmLabel || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  protected readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

/**
 * Thin wrapper so callers never have to know about MatDialog wiring:
 *   this.confirm.ask({ title: '…', message: '…' }).subscribe(ok => …)
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  ask(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        autoFocus: 'dialog',
        restoreFocus: true,
        panelClass: 'sc-dialog-panel',
      })
      .afterClosed()
      // Backdrop clicks and Escape resolve to undefined; callers only ever
      // care about an explicit confirmation.
      .pipe(map((result) => result === true));
  }
}
