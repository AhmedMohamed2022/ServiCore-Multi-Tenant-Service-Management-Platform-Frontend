import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Injectable,
} from '@angular/core';
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

/** Added by ConfirmService so the dialog can label itself for assistive tech. */
interface ConfirmDialogInternalData extends ConfirmDialogData {
  titleId: string;
  messageId: string;
}

@Component({
  selector: 'sc-confirm-dialog',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-[min(420px,90vw)]">
      <div class="flex items-start gap-3 p-5">
        <div
          class="sc-icon-chip"
          [class.sc-icon-chip-danger]="data.tone === 'danger'"
        >
          <sc-icon
            [name]="data.tone === 'danger' ? 'warning' : 'help'"
            size="sm"
          />
        </div>
        <div class="min-w-0">
          <h2
            [id]="data.titleId"
            class="text-[15px] font-semibold tracking-[-0.011em] text-ink"
          >
            {{ data.title }}
          </h2>
          <p
            [id]="data.messageId"
            class="mt-1 text-[13px] leading-relaxed text-ink-muted"
          >
            {{ data.message }}
          </p>
        </div>
      </div>

      <div
        class="flex justify-end gap-2 rounded-b-sc-lg border-t border-line bg-surface-muted px-5 py-3"
      >
        <!-- A destructive prompt opens on the safe choice, so a stray Enter
             or Space cancels instead of deleting. -->
        <button
          type="button"
          class="sc-btn sc-btn-secondary"
          [attr.cdkFocusInitial]="data.tone === 'danger' ? '' : null"
          (click)="dialogRef.close(false)"
        >
          {{ data.cancelLabel || 'Cancel' }}
        </button>
        <button
          type="button"
          class="sc-btn"
          [class]="data.tone === 'danger' ? 'sc-btn-danger' : 'sc-btn-primary'"
          [attr.cdkFocusInitial]="data.tone === 'danger' ? null : ''"
          (click)="dialogRef.close(true)"
        >
          {{ data.confirmLabel || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  protected readonly dialogRef = inject(
    MatDialogRef<ConfirmDialogComponent, boolean>,
  );
  protected readonly data = inject<ConfirmDialogInternalData>(MAT_DIALOG_DATA);
}

/**
 * Thin wrapper so callers never have to know about MatDialog wiring:
 *   this.confirm.ask({ title: '…', message: '…' }).subscribe(ok => …)
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);
  private nextId = 0;

  ask(data: ConfirmDialogData): Observable<boolean> {
    const id = `sc-confirm-${this.nextId++}`;
    const titleId = `${id}-title`;
    const messageId = `${id}-message`;

    return (
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogInternalData, boolean>(
          ConfirmDialogComponent,
          {
            data: { ...data, titleId, messageId },
            // Focus lands on the element marked cdkFocusInitial (see the
            // template), falling back to the first tabbable control.
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            // A destructive confirmation interrupts, so it is announced as an
            // alert dialog; the rest are ordinary dialogs.
            role: data.tone === 'danger' ? 'alertdialog' : 'dialog',
            ariaLabelledBy: titleId,
            ariaDescribedBy: messageId,
            panelClass: 'sc-dialog-panel',
          },
        )
        .afterClosed()
        // Backdrop clicks and Escape resolve to undefined; callers only ever
        // care about an explicit confirmation.
        .pipe(map((result) => result === true))
    );
  }
}
