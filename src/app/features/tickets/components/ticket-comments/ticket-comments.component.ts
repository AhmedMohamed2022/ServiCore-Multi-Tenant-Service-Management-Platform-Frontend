import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommentService } from '../../../../core/services/comment.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { TicketCommentDto } from '../../models/comment.model';

@Component({
  selector: 'app-ticket-comments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ticket-comments.component.html',
  styleUrls: ['./ticket-comments.component.css'],
})
export class TicketCommentsComponent implements OnInit {
  @Input({ required: true }) ticketId!: string;

  private readonly commentService = inject(CommentService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // Structural Signals tracking state data trees
  readonly comments = signal<TicketCommentDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Identity profile reference helper
  readonly activeUserEmail = () => this.authService.currentUser()?.email || '';

  // Operational Form Controls matching AddTicketCommentRequest
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
  }

  loadCommentsTimeline(): void {
    this.isLoading.set(true);
    this.commentService.getComments(this.ticketId).subscribe({
      next: (data) => {
        // Sort chronologically ensuring earliest records appear at the top
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

  onSubmitComment(): void {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = this.commentForm.getRawValue();

    this.commentService.addComment(this.ticketId, payload).subscribe({
      next: () => {
        this.commentForm.reset();
        this.isSubmitting.set(false);
        this.loadCommentsTimeline();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isSubmitting.set(false);
      },
    });
  }
}
