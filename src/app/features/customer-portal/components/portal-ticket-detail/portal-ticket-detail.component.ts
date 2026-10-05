import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { TicketService } from '../../../../core/services/ticket.service';
import { CategoryService } from '../../../../core/services/category.service';
import { CommentService } from '../../../../core/services/comment.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { TicketDto } from '../../../tickets/models/ticket.model';
import { TicketCommentDto } from '../../../tickets/models/comment.model';
import {
  TicketPriorityIcons,
  TicketPriorityLabels,
  TicketPriorityTones,
  TicketStatus,
} from '../../../tickets/models/ticket-enums.model';

import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { AlertComponent } from '../../../../shared/ui/states/states.component';
import { portalStatusView, stageIndex } from '../../utils/portal-view';

type StepState = 'done' | 'current' | 'todo';

interface ProgressStep {
  label: string;
  date: string | null;
  state: StepState;
}

interface PortalMessage {
  id: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  authorName: string;
}

/**
 * Customer-facing ticket page. Built only from what a customer may read:
 *
 *   GET  /tickets/{id}            the ticket (ids are never rendered)
 *   GET  /categories              category display name (best effort)
 *   GET  /tickets/{id}/comments   the conversation
 *   POST /tickets/{id}/comments   a reply
 *
 * Deliberately NOT called: teams, agent directory, customer records or any
 * management endpoint. Those are staff data; this page never asks for them,
 * so a customer can neither see them nor trigger a 403 looking for them.
 *
 * Author labels follow the backend rule documented on TicketCommentsComponent:
 * only organization members and the ticket's own customer can comment, so from
 * a customer's seat every author who is not them is the support team.
 *
 * Realtime reuses NotificationService.incomingCommentsStream$ exactly as the
 * staff thread does; no SignalR wiring is added or changed.
 */
@Component({
  selector: 'app-portal-ticket-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    IconComponent,
    AvatarComponent,
    AlertComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portal-ticket-detail.component.html',
  styleUrls: ['./portal-ticket-detail.component.css'],
})
export class PortalTicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketService = inject(TicketService);
  private readonly categoryService = inject(CategoryService);
  private readonly commentService = inject(CommentService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  private readonly composer =
    viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private readonly threadEnd = viewChild<ElementRef<HTMLElement>>('threadEnd');

  readonly ticketId = signal<string>('');

  readonly ticket = signal<TicketDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly categoryName = signal<string>('');

  readonly comments = signal<TicketCommentDto[]>([]);
  readonly commentsLoading = signal<boolean>(false);
  readonly commentsError = signal<string | null>(null);
  readonly isSending = signal<boolean>(false);
  readonly sendError = signal<string | null>(null);

  readonly replyForm = this.fb.nonNullable.group({
    content: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(2000),
      ],
    ],
  });

  protected readonly replyLength = signal<number>(0);
  protected readonly maxReply = 2000;
  protected readonly TicketStatus = TicketStatus;

  private readonly currentUserId = computed(
    () => this.authService.currentUser()?.userId ?? null,
  );
  protected readonly customerEmail = computed(
    () => this.authService.currentUser()?.email ?? '',
  );

  readonly status = computed(() => {
    const t = this.ticket();
    return t ? portalStatusView(t.status) : null;
  });

  readonly isClosed = computed(
    () => this.ticket()?.status === TicketStatus.Closed,
  );

  readonly priority = computed(() => {
    const t = this.ticket();
    if (!t) return null;
    return {
      label: TicketPriorityLabels[t.priority] ?? '',
      tone: TicketPriorityTones[t.priority] ?? 'neutral',
      icon: TicketPriorityIcons[t.priority] ?? 'remove',
    };
  });

  /**
   * Progress is derived from `status` and the three timestamps the DTO really
   * has (createdAt, resolvedAt, closedAt). The "In progress" step has no
   * timestamp in the API, so none is shown for it.
   */
  readonly steps = computed<ProgressStep[]>(() => {
    const t = this.ticket();
    const s = this.status();
    if (!t || !s) return [];

    const current = stageIndex(s.stage);
    const labels = ['Submitted', 'In progress', 'Resolved', 'Closed'];
    const dates: (string | null)[] = [
      t.createdAt,
      null,
      t.resolvedAt,
      t.closedAt,
    ];

    return labels.map((label, i) => {
      let state: StepState =
        i < current ? 'done' : i === current ? 'current' : 'todo';
      // Resolved and Closed are end states: reaching one means it is complete.
      if (i === current && current >= 2) state = 'done';
      return { label, date: dates[i], state };
    });
  });

  /** Who has the ticket, stated only as far as the DTO supports it. */
  readonly handling = computed(() => {
    const t = this.ticket();
    if (!t) return null;
    if (t.assignedAgentId) {
      return {
        icon: 'support_agent',
        text: 'A support agent is working on this.',
      };
    }
    if (t.teamId) {
      return {
        icon: 'groups',
        text: 'With the support team, waiting for an agent.',
      };
    }
    return { icon: 'schedule', text: 'Waiting to be routed to a team.' };
  });

  readonly messages = computed<PortalMessage[]>(() => {
    const me = this.currentUserId();
    return this.comments().map((c) => {
      const isMine = !!me && c.authorUserId === me;
      return {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        isMine,
        authorName: isMine ? 'You' : 'Support team',
      };
    });
  });

  ngOnInit(): void {
    this.replyForm.controls.content.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.replyLength.set(value?.length ?? 0));

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (!id) return;
        this.ticketId.set(id);
        this.ticket.set(null);
        this.comments.set([]);
        this.loadTicket();
        this.loadComments();
      });

    this.notificationService.incomingCommentsStream$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((incoming) => {
        if (incoming.ticketId !== this.ticketId()) return;
        // Guard against the echo of a message this client just posted.
        if (this.comments().some((c) => c.id === incoming.id)) return;
        this.comments.update((list) => this.sorted([...list, incoming]));
        this.scrollToEnd();
      });
  }

  loadTicket(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ticketService.getTicketById(this.ticketId()).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.isLoading.set(false);
        this.loadCategoryName(ticket);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  private loadCategoryName(ticket: TicketDto): void {
    this.categoryService
      .getCategories()
      .pipe(catchError(() => of([])))
      .subscribe((categories) => {
        this.categoryName.set(
          categories.find((c) => c.id === ticket.categoryId)?.name ?? '',
        );
      });
  }

  loadComments(): void {
    this.commentsLoading.set(true);
    this.commentsError.set(null);

    this.commentService.getComments(this.ticketId()).subscribe({
      next: (data) => {
        this.comments.set(this.sorted(data));
        this.commentsLoading.set(false);
      },
      error: (err: Error) => {
        this.commentsError.set(err.message);
        this.commentsLoading.set(false);
      },
    });
  }

  onSubmitReply(): void {
    if (this.replyForm.invalid || this.isSending() || this.isClosed()) {
      this.replyForm.markAllAsTouched();
      return;
    }

    this.isSending.set(true);
    this.sendError.set(null);
    this.replyForm.controls.content.disable();

    const payload = this.replyForm.getRawValue();

    this.commentService.addComment(this.ticketId(), payload).subscribe({
      next: (saved) => {
        this.replyForm.controls.content.enable();
        this.replyForm.reset();
        this.isSending.set(false);

        if (!this.comments().some((c) => c.id === saved.id)) {
          this.comments.update((list) => this.sorted([...list, saved]));
        }
        this.scrollToEnd();
      },
      error: (err: Error) => {
        this.replyForm.controls.content.enable();
        this.sendError.set(err.message);
        this.isSending.set(false);
      },
    });
  }

  /** Ctrl/Cmd + Enter sends, matching every other conversation UI. */
  onComposerKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      this.onSubmitReply();
    }
  }

  /** The "Reply" call to action in the waiting-for-you banner. */
  focusComposer(): void {
    const el = this.composer()?.nativeElement;
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: this.scrollBehavior() });
    el.focus({ preventScroll: true });
  }

  private scrollToEnd(): void {
    queueMicrotask(() =>
      this.threadEnd()?.nativeElement.scrollIntoView({
        block: 'nearest',
        behavior: this.scrollBehavior(),
      }),
    );
  }

  private scrollBehavior(): ScrollBehavior {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
  }

  private sorted(data: TicketCommentDto[]): TicketCommentDto[] {
    return [...data].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
}
