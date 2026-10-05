import { Directive, HostListener, inject, ElementRef } from '@angular/core';

/**
 * Makes an in-page "Skip to main content" link work.
 *
 * index.html declares `<base href="/">`, so the browser resolves a bare
 * `href="#mainContent"` against the site root and navigates to `/#mainContent`
 * (the landing page) instead of moving focus. This directive intercepts the
 * click, focuses the target and scrolls it into view, without touching the
 * router or the URL.
 *
 * Usage: `<a href="#mainContent" class="sc-skip-link" scSkipLink>`.
 */
@Directive({
  selector: 'a[scSkipLink]',
  standalone: true,
})
export class SkipLinkDirective {
  private readonly host = inject<ElementRef<HTMLAnchorElement>>(ElementRef);

  @HostListener('click', ['$event'])
  protected onClick(event: Event): void {
    const href = this.host.nativeElement.getAttribute('href') ?? '';
    if (!href.startsWith('#') || href.length < 2) {
      return;
    }
    const target = document.getElementById(href.slice(1));
    if (!target) {
      return;
    }
    event.preventDefault();
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  }
}
