import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotaFiscal, NotaFiscalService } from '../../core/services/nota-fiscal.service';
import { ToastService } from '../../core/services/toast.service';

type PeriodoFiltro = 'hoje' | '7dias' | '30dias' | 'todos';

@Component({
  selector: 'app-notas-fiscais-historico',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notas-fiscais-historico.html',
  styleUrl: './notas-fiscais-historico.css'
})
export class NotasFiscaisHistorico implements OnInit {
  loading = false;
  limpandoHistorico = false;
  confirmandoLimpeza = false;
  notasHistorico: NotaFiscal[] = [];
  periodo: PeriodoFiltro = 'hoje';
  buscaTexto = '';
  termoBusca = '';
  private buscaDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private notaService: NotaFiscalService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarHistorico();
  }

  selecionarPeriodo(periodo: PeriodoFiltro): void {
    this.periodo = periodo;
  }

  atualizarBusca(valor: string): void {
    this.buscaTexto = valor ?? '';

    if (this.buscaDebounceTimer) {
      clearTimeout(this.buscaDebounceTimer);
    }

    this.buscaDebounceTimer = setTimeout(() => {
      this.termoBusca = this.buscaTexto;
      this.cdr.markForCheck();
    }, 300);
  }

  abrirConfirmacaoLimpeza(): void {
    if (this.limpandoHistorico) return;
    this.confirmandoLimpeza = true;
    this.cdr.markForCheck();
  }

  cancelarLimpeza(): void {
    if (this.limpandoHistorico) return;
    this.confirmandoLimpeza = false;
    this.cdr.markForCheck();
  }

  limparHistorico(): void {
    if (this.limpandoHistorico) return;

    this.limpandoHistorico = true;
    this.toast.show('Limpando histórico de notas...', 'info', 2000);

    this.notaService.limparHistorico().subscribe({
      next: (res) => {
        this.toast.success(res?.mensagem ?? 'Histórico limpo com sucesso.');
        this.confirmandoLimpeza = false;
        this.carregarHistorico();
        this.limpandoHistorico = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Não foi possível limpar o histórico de notas fiscais.');
        this.confirmandoLimpeza = false;
        this.limpandoHistorico = false;
        this.cdr.markForCheck();
      }
    });
  }

  get historicoFiltrado(): NotaFiscal[] {
    return this.notasHistorico.filter((nota) => {
      const data = this.toLocalDate(nota.criadoEm);
      return this.dentroDoPeriodo(data) && this.correspondeBusca(nota);
    });
  }

  totalQuantidadeItens(nota: NotaFiscal): number {
    return (nota.itens ?? []).reduce((acc, item) => acc + (item.quantidade ?? 0), 0);
  }

  descricaoResumo(nota: NotaFiscal): string {
    const descricoes = this.listarDescricoes(nota);
    if (!descricoes.length) return '—';
    return descricoes.length === 1 ? descricoes[0] : `${descricoes[0]}...`;
  }

  descricaoCompleta(nota: NotaFiscal): string {
    const descricoes = this.listarDescricoes(nota);
    return descricoes.length ? descricoes.join(' | ') : 'Sem descrição';
  }

  toLocalDate(valor?: string): Date | null {
    if (!valor) return null;

    const temTimezone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(valor);
    const normalizado = temTimezone ? valor : `${valor}Z`;
    const data = new Date(normalizado);

    return Number.isNaN(data.getTime()) ? null : data;
  }

  private carregarHistorico(): void {
    this.loading = true;

    this.notaService.getAll().subscribe({
      next: (notas) => {
        this.notasHistorico = notas
          .map((n) => this.normalizeNota(n))
          .filter((n) => this.isFechada(n))
          .sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0));

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Não foi possível carregar o histórico de notas fiscais.');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private isFechada(nota: NotaFiscal): boolean {
    return nota.status === 'Fechada' || nota.status === 1;
  }

  private normalizeNota(nota: NotaFiscal): NotaFiscal {
    if (nota.status === 0) return { ...nota, status: 'Aberta' };
    if (nota.status === 1) return { ...nota, status: 'Fechada' };
    return nota;
  }

  private dentroDoPeriodo(data: Date | null): boolean {
    if (!data) return this.periodo === 'todos';

    if (this.periodo === 'todos') return true;

    const agora = new Date();

    if (this.periodo === 'hoje') {
      return data.toDateString() === agora.toDateString();
    }

    const dias = this.periodo === '7dias' ? 7 : 30;
    const limite = new Date();
    limite.setDate(agora.getDate() - dias);

    return data >= limite;
  }

  private correspondeBusca(nota: NotaFiscal): boolean {
    const termo = this.termoBusca.trim().toLowerCase();
    if (!termo) return true;

    const numero = String(nota.numero ?? '').toLowerCase();
    const codigos = (nota.itens ?? []).map(i => (i.produtoCodigo ?? '').toLowerCase());
    const nomes = (nota.itens ?? []).map(i => (i.produtoDescricao ?? '').toLowerCase());

    return (
      numero.includes(termo) ||
      codigos.some(c => c.includes(termo)) ||
      nomes.some(n => n.includes(termo))
    );
  }

  private listarDescricoes(nota: NotaFiscal): string[] {
    const base = (nota.itens ?? [])
      .map(i => (i.produtoDescricao ?? i.produtoCodigo ?? '').trim())
      .filter((texto): texto is string => texto.length > 0);

    return [...new Set(base)];
  }
}
