import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({ selector: 'app-session-page', templateUrl: './session.page.html', styleUrl: './session.page.scss' })
export class SessionPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  isChecking = false;
  private leaving = false;

  ngOnInit(): void { this.check(false); }

  retry(): void { this.check(true); }

  backToLogin(): void {
    this.leaving = true;
    this.auth.session.clear();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private check(retry: boolean): void {
    if (this.isChecking) return;
    this.isChecking = true;
    this.auth.ensureAuthenticated(retry).pipe(
      finalize(() => this.isChecking = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((result) => {
      if (!this.leaving && result !== 'connection-error') {
        void this.router.navigateByUrl(result === 'authenticated' ? '/' : '/login', { replaceUrl: true });
      }
    });
  }
}
