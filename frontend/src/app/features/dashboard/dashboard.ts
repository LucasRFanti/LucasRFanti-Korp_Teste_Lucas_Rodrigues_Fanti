import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EmployeeService } from '../../core/services/employee';
import { ProdutoService } from '../../core/services/produto.service';
import { NotaFiscal, NotaFiscalService } from '../../core/services/nota-fiscal.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  loading = true;

  totalFuncionarios = 0;
  totalProdutos = 0;
  estoqueTotal = 0;
  notasAbertas = 0;
  notasFechadas = 0;
  ultimasNotas: NotaFiscal[] = [];

  constructor(
    private employeeService: EmployeeService,
    private produtoService: ProdutoService,
    private notaFiscalService: NotaFiscalService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.carregarDashboard();
  }

  toLocalDate(valor?: string): Date | null {
    if (!valor) return null;

    const temTimezone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(valor);
    const normalizado = temTimezone ? valor : `${valor}Z`;
    const data = new Date(normalizado);

    return Number.isNaN(data.getTime()) ? null : data;
  }

  private carregarDashboard() {
    forkJoin({
      employees: this.employeeService.getAll(),
      produtos: this.produtoService.getAll(),
      notas: this.notaFiscalService.getAll()
    }).subscribe({
      next: ({ employees, produtos, notas }) => {
        queueMicrotask(() => {
          this.totalFuncionarios = employees.length;
          this.totalProdutos = produtos.length;
          this.estoqueTotal = produtos.reduce((acc, p) => acc + (p.saldo ?? 0), 0);
          this.notasAbertas = notas.filter(n => n.status === 'Aberta').length;
          this.notasFechadas = notas.filter(n => n.status === 'Fechada').length;
          this.ultimasNotas = [...notas]
            .sort((a, b) => new Date(b.criadoEm ?? 0).getTime() - new Date(a.criadoEm ?? 0).getTime())
            .slice(0, 5);
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.toast.error('Não foi possível carregar os dados do dashboard.');
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }
}
