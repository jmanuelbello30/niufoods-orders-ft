import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  isSubmitting = false;
  errorMessage: string | null = null;

  submit(): void {
    if (this.isSubmitting) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.errorMessage = null;
    this.isSubmitting = true;
    this.auth.login(this.form.getRawValue()).pipe(
      finalize(() => {
        this.form.controls.password.setValue('');
        this.isSubmitting = false;
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => void this.router.navigateByUrl('/', { replaceUrl: true }),
      error: (error: unknown) => {
        this.errorMessage = error instanceof HttpErrorResponse && error.status === 401
          ? 'Correo o contraseña incorrectos.'
          : error instanceof HttpErrorResponse && error.status === 429
            ? 'Demasiados intentos. Intenta nuevamente más tarde.'
            : 'No pudimos conectarnos. Intenta nuevamente.';
      },
    });
  }
}
