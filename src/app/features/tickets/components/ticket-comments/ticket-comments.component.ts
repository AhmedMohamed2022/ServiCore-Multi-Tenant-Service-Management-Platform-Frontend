import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, Subscription } from 'rxjs';

import { CommentService } from '../../../../core/services/comment.service';
import { TeamService } from '../../../../core/services/team.service';
import { AgentDirectoryService } from '../../../../core/services/agent-directory.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { TicketCommentDto } from '../../models/comment.model';

import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
  LoadingStateComponent,
} from '../../../../shared/ui/states/states.component';

/**
 * Everything the view needs to render one message, resolved once per comment
 * instead of being recomputed inside the template.
 */
export interface ResolvedComment {
  readonly id: string;
  readonly content: string;
  readonly createdAt: string;
  /** Name printed on the author line. Never blank. */
  readonly authorName: string;
  /** Short role chip, or '' when no role can honestly be asserted. */
  readonly roleLabel: string;
  /** Drives the deterministic avatar tint — stable per author. */
  readonly avatarKey: string;
  readonly isMine: boolean;
  readonly isStaff: boolean;
}

@Component({
  selector: 'app-ticket-comments',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    AvatarComponent,
    IconComponent,
    AlertComponent,
    EmptyStateComponent,
    LoadingStateComponent,
  ],
  templateUrl: './ticket-comments.component.html',
  styleUrls: ['./ticket-comments.component.css'],
})
export class TicketCommentsComponent implements OnInit, OnDestroy {
  readonly ticketId = input.required<string>();

  /**
   * The ticket's own team. Used to tell which authors are staff on this
   * ticket — see resolveAuthor notes below.
   */
  readonly teamId = input<string | null>(null);

  /** The ticket's customer, when the viewer may see that record. */
  readonly customerName = input<string | null>(null);

  /**
   * Closed tickets reject comments server-side
   * (TicketCommentService.AddAsync throws on TicketStatus.Closed), so the
   * composer is withdrawn rather than offered and then rejected.
   */
  readonly locked = input<boolean>(false);

  private readonly commentService = inject(CommentService);
  private readonly teamService = inject(TeamService);
  private readonly agentDirectory = inject(AgentDirectoryService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly fb = inject(FormBuilder);

  private streamSubscription?: Subscription;

  private readonly scrollAnchor =
    viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');

  readonly comments = signal<TicketCommentDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  /**
   * Members of the ticket's team, as ids. TeamMemberDto carries no name, so
   * this set answers exactly one question: is this author staff on this
   * ticket's team?
   */
  private readonly teamMemberIds = signal<Set<string>>(new Set<string>());

  /**
   * Whether the reader is a customer. Set only for customer sessions (see
   * TenantContextService.currentCustomerId), and it is what lets the
   * "other party" fallback below point the right way.
   */
  private readonly viewerIsCustomer = computed(
    () => !!this.tenantContext.currentCustomerId(),
  );

  private readonly currentUserId = computed(
    () => this.authService.currentUser()?.userId ?? null,
  );

  readonly commentForm = this.fb.nonNullable.group({
    content: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(2000)],
    ],
  });

  protected readonly remainingChars = signal<number>(2000);

  /**
   * ---------------------------------------------------------------------
   * Author identity — defect #2
   * ---------------------------------------------------------------------
   * A comment arrives as `authorUserId` and nothing else. No endpoint
   * resolves an arbitrary user id to a name, so this resolves as far as the
   * contract genuinely supports and then stops:
   *
   *  1. Author is the signed-in user -> "You". Always available, and the
   *     comparison that used to be made against an email field that does not
   *     exist now runs against the same Identity id the server stamps on.
   *  2. Author is in the agent directory (GET /reports/agents, Owner and
   *     Manager only) -> that agent's real name.
   *  3. Author is on the ticket's team but not in the directory -> we know
   *     they are staff, so "Support staff" with the id abbreviated.
   *  4. Otherwise -> the other party. The backend only lets organization
   *     members and the ticket's own customer comment, so from a customer's
   *     seat every other author is staff, and from a staff seat the remaining
   *     author is the ticket's customer.
   *
   * Step 4 has one blind spot that is deliberately not papered over: an Owner
   * or Manager who is not on the ticket's team lands here too when a staff
   * member is reading. No field in the API separates that case from the
   * customer. The label therefore stays generic and the avatar falls back to
   * the id, so nothing claims more than the data supports.
   */
  readonly resolvedComments = computed<ResolvedComment[]>(() => {
    const me = this.currentUserId();
    const directory = this.agentDirectory.names();
    const teamIds = this.teamMemberIds();
    const viewerIsCustomer = this.viewerIsCustomer();
    const customer = this.customerName();

    return this.comments().map((comment) => {
      const authorId = comment.authorUserId;
      const base = {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
      };

      if (me && authorId === me) {
        return {
          ...base,
          authorName: 'You',
          roleLabel: '',
          avatarKey: authorId,
          isMine: true,
          isStaff: !viewerIsCustomer,
        };
      }

      const directoryName = directory.get(authorId);
      if (directoryName) {
        return {
          ...base,
          authorName: directoryName,
          roleLabel: 'Agent',
          avatarKey: directoryName,
          isMine: false,
          isStaff: true,
        };
      }

      if (teamIds.has(authorId)) {
        return {
          ...base,
          authorName: 'Support staff',
          roleLabel: authorId.substring(0, 8),
          avatarKey: authorId,
          isMine: false,
          isStaff: true,
        };
      }

      if (viewerIsCustomer) {
        return {
          ...base,
          authorName: 'Support team',
          roleLabel: 'Staff',
          avatarKey: authorId,
          isMine: false,
          isStaff: true,
        };
      }

      return {
        ...base,
        authorName: customer ?? 'Customer',
        roleLabel: 'Customer',
        avatarKey: customer ?? authorId,
        isMine: false,
        isStaff: false,
      };
    });
  });

  readonly messageCount = computed(() => this.comments().length);

  constructor() {
    this.commentForm.controls.content.valueChanges.subscribe((value) =>
      this.remainingChars.set(2000 - (value?.length ?? 0)),
    );

    // Keep the newest message in view as the thread grows, including when one
    // arrives over SignalR while the user is reading.
    effect(() => {
      this.resolvedComments();
      queueMicrotask(() =>
        this.scrollAnchor()?.nativeElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        }),
      );
    });
  }

  ngOnInit(): void {
    this.loadCommentsTimeline();
    this.loadAuthorSources();
    this.subscribeToRealtimeCommentStream();
  }

  loadCommentsTimeline(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.commentService.getComments(this.ticketId()).subscribe({
      next: (data) => {
        this.comments.set(this.sortChronologically(data));
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Both sources are best-effort. The agent directory 403s for anyone below
   * Manager, and the roster call can fail for a customer session, so neither
   * may fail the thread — they only improve the labels when they succeed.
   */
  private loadAuthorSources(): void {
    this.agentDirectory.loadIfPermitted();

    const teamId = this.teamId();
    if (!teamId) return;

    this.teamService
      .getTeamMembers(teamId)
      .pipe(catchError(() => of([])))
      .subscribe((members) =>
        this.teamMemberIds.set(new Set(members.map((m) => m.userId))),
      );
  }

  private subscribeToRealtimeCommentStream(): void {
    this.streamSubscription =
      this.notificationService.incomingCommentsStream$.subscribe({
        next: (newComment: TicketCommentDto) => {
          if (newComment.ticketId !== this.ticketId()) return;

          // Guard against the echo of a message this client just posted.
          if (this.comments().some((c) => c.id === newComment.id)) return;

          this.comments.update((current) =>
            this.sortChronologically([...current, newComment]),
          );
        },
      });
  }

  onSubmitComment(): void {
    if (this.commentForm.invalid || this.isSubmitting() || this.locked()) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.commentForm.controls.content.disable();

    const payload = this.commentForm.getRawValue();

    this.commentService.addComment(this.ticketId(), payload).subscribe({
      next: (savedComment) => {
        this.commentForm.controls.content.enable();
        this.commentForm.reset();
        this.isSubmitting.set(false);

        if (!this.comments().some((c) => c.id === savedComment.id)) {
          this.comments.update((current) =>
            this.sortChronologically([...current, savedComment]),
          );
        }
      },
      error: (err: Error) => {
        this.commentForm.controls.content.enable();
        this.errorMessage.set(err.message);
        this.isSubmitting.set(false);
      },
    });
  }

  /** Ctrl/Cmd + Enter posts, matching every other conversation UI. */
  onComposerKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      this.onSubmitComment();
    }
  }

  private sortChronologically(data: TicketCommentDto[]): TicketCommentDto[] {
    return [...data].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  ngOnDestroy(): void {
    this.streamSubscription?.unsubscribe();
  }
}
