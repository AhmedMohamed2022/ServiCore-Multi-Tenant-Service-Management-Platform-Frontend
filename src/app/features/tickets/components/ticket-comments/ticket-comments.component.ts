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
import {
  dayKey,
  dayLabel,
  linkify,
  TextSegment,
} from '../../utils/ticket-time';

import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  AlertComponent,
  EmptyStateComponent,
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

/** One row of the rendered thread: a day divider or a message. */
export type ThreadItem =
  | { readonly kind: 'day'; readonly key: string; readonly label: string }
  | {
      readonly kind: 'message';
      readonly key: string;
      readonly message: ResolvedComment;
      readonly segments: TextSegment[];
      /** False when it continues the previous message from the same author. */
      readonly showHeader: boolean;
    };

/** Messages from one author this close together read as a single run. */
const GROUP_WINDOW_MS = 5 * 60_000;
/** Within this distance of the bottom counts as "reading the latest". */
const BOTTOM_TOLERANCE_PX = 48;

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

  private readonly thread = viewChild<ElementRef<HTMLElement>>('thread');

  /** Scroll bookkeeping, so the thread only follows when the reader wants it. */
  protected readonly atBottom = signal<boolean>(true);
  protected readonly hasUnseen = signal<boolean>(false);
  private initialScrollDone = false;
  private forceScroll = false;
  protected readonly skeletonMessages = [0, 1, 2];

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
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(2000),
      ],
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

  /**
   * The thread as the view draws it: day dividers between days, and runs of
   * messages from one author collapsed under a single header. Purely a
   * reshaping of resolvedComments(); no message is added, dropped or edited.
   */
  readonly threadItems = computed<ThreadItem[]>(() => {
    const items: ThreadItem[] = [];
    let previous: ResolvedComment | null = null;
    let previousDay = '';

    for (const message of this.resolvedComments()) {
      const day = dayKey(message.createdAt);
      const newDay = day !== previousDay;

      if (newDay) {
        items.push({
          kind: 'day',
          key: `day-${day}`,
          label: dayLabel(message.createdAt),
        });
      }

      const continues =
        !newDay &&
        previous !== null &&
        previous.avatarKey === message.avatarKey &&
        previous.isMine === message.isMine &&
        new Date(message.createdAt).getTime() -
          new Date(previous.createdAt).getTime() <
          GROUP_WINDOW_MS;

      items.push({
        kind: 'message',
        key: message.id,
        message,
        segments: linkify(message.content),
        showHeader: !continues,
      });

      previous = message;
      previousDay = day;
    }

    return items;
  });

  /** Own messages use the same avatar seed as the top bar. */
  protected readonly myEmail = computed(
    () => this.authService.currentUser()?.email ?? 'You',
  );

  readonly messageCount = computed(() => this.comments().length);

  constructor() {
    this.commentForm.controls.content.valueChanges.subscribe((value) =>
      this.remainingChars.set(2000 - (value?.length ?? 0)),
    );

    // Follow the thread to the newest message, but only inside the thread's
    // own scroll box (never the page), and only when the reader is already at
    // the bottom, just posted, or is seeing the thread for the first time.
    // Otherwise a "new messages" pill is offered instead of yanking the view.
    effect(() => {
      const count = this.resolvedComments().length;
      setTimeout(() => this.afterThreadChanged(count), 0);
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

  private afterThreadChanged(count: number): void {
    const el = this.thread()?.nativeElement;
    if (!el || count === 0) return;

    if (!this.initialScrollDone || this.forceScroll || this.atBottom()) {
      this.scrollToLatest(el, this.initialScrollDone);
      this.hasUnseen.set(false);
    } else {
      this.hasUnseen.set(true);
    }

    this.initialScrollDone = true;
    this.forceScroll = false;
  }

  private scrollToLatest(el: HTMLElement, animate: boolean): void {
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: animate && !reduce ? 'smooth' : 'auto',
    });
  }

  onThreadScroll(): void {
    const el = this.thread()?.nativeElement;
    if (!el) return;

    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_TOLERANCE_PX;
    this.atBottom.set(nearBottom);
    if (nearBottom) this.hasUnseen.set(false);
  }

  jumpToLatest(): void {
    const el = this.thread()?.nativeElement;
    if (!el) return;
    this.scrollToLatest(el, true);
    this.hasUnseen.set(false);
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

        // Your own message always brings you to the bottom.
        this.forceScroll = true;
        setTimeout(() => this.afterThreadChanged(this.comments().length), 0);

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
