import { Component } from '@angular/core';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { ToastComponent } from '../../core/components/toast/toast.component';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
