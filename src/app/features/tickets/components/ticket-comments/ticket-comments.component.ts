import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CommentService } from '../../../../core/services/comment.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TicketCommentDto } from '../../models/comment.model';

@Component({
  selector: 'app-ticket-comments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ticket-comments.component.html',
  styleUrls: ['./ticket-comments.component.css'],
})
export class TicketCommentsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) ticketId!: string;

  private readonly commentService = inject(CommentService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  private streamSubscription!: Subscription;

  // Structural State Signals
  readonly comments = signal<TicketCommentDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly activeUserEmail = () => this.authService.currentUser()?.email || '';

  readonly commentForm = this.fb.nonNullable.group({
    content: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(2000),
      ],
    ],
  });

  ngOnInit(): void {
    this.loadCommentsTimeline();
    this.subscribeToRealtimeCommentStream();
  }

  loadCommentsTimeline(): void {
    this.isLoading.set(true);
    this.commentService.getComments(this.ticketId).subscribe({
      next: (data) => {
        const sorted = data.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        this.comments.set(sorted);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  private subscribeToRealtimeCommentStream(): void {
    // Listen directly to the hot comment stream broadcast from the SignalR engine hub
    this.streamSubscription =
      this.notificationService.incomingCommentsStream$.subscribe({
        next: (newComment: TicketCommentDto) => {
          // Only append the comment if it matches the active ticket container context id
          if (newComment.ticketId === this.ticketId) {
            // Verify item doesn't exist in local signal array to avoid duplications from self-submission
            const exists = this.comments().some((c) => c.id === newComment.id);
            if (!exists) {
              this.comments.update((current) => [...current, newComment]);
            }
          }
        },
      });
  }

  onSubmitComment(): void {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.commentForm.controls.content.disable();

    const payload = this.commentForm.getRawValue();

    this.commentService.addComment(this.ticketId, payload).subscribe({
      next: (savedComment) => {
        this.commentForm.controls.content.enable();
        this.commentForm.reset();
        this.isSubmitting.set(false);

        // Optimistically push your own posted response instantly into the signal array
        const exists = this.comments().some((c) => c.id === savedComment.id);
        if (!exists) {
          this.comments.update((current) => [...current, savedComment]);
        }
      },
      error: (err: Error) => {
        this.commentForm.controls.content.enable();
        this.errorMessage.set(err.message);
        this.isSubmitting.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.streamSubscription) {
      this.streamSubscription.unsubscribe();
    }
  }
}
