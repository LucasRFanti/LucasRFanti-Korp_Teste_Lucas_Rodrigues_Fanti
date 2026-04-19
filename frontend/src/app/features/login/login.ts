import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  form;
  erro = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', Validators.required]
    });
  }

  onLogin() {
    if (this.form.invalid) return;

    const { email, senha } = this.form.getRawValue();
    this.auth.login(email, senha).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        this.router.navigate(['/admin/dashboard']);
      },
      error: () => (this.erro = 'Credenciais inválidas')
    });
  }
}
