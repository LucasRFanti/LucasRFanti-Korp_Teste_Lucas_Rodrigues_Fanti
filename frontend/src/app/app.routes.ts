import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Employees } from './features/employees/employees';
import { Produtos } from './features/produtos/produtos';
import { NotasFiscais } from './features/notas-fiscais/notas-fiscais';
import { NotasFiscaisHistorico } from './features/notas-fiscais-historico/notas-fiscais-historico';
import { AdminLayoutComponent } from './features/layout/admin-layout.component';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'notas-fiscais', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'employees', component: Employees },
      { path: 'produtos', component: Produtos },
      { path: 'notas-fiscais', component: NotasFiscais },
      { path: 'notas-fiscais-historico', component: NotasFiscaisHistorico },
      { path: '**', redirectTo: 'notas-fiscais' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
