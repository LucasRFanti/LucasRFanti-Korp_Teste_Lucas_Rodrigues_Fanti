import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NotaFiscal, NotaFiscalService } from '../../core/services/nota-fiscal.service';
import { Produto, ProdutoService } from '../../core/services/produto.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-notas-fiscais',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './notas-fiscais.html',
  styleUrl: './notas-fiscais.css'
})
export class NotasFiscais implements OnInit {
  notas: NotaFiscal[] = [];
  produtos: Produto[] = [];
  showModal = false;
  loading = false;
  saving = false;
  imprimindo: string | null = null;
  removendo: string | null = null;
  notaParaDescartar: NotaFiscal | null = null;

  private toast = inject(ToastService);

  form;

  constructor(
    private notaService: NotaFiscalService,
    private produtoService: ProdutoService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.nonNullable.group({
      itens: this.fb.array([this.novoItemGroup()])
    });
  }

  get itensArray() { return this.form.get('itens') as FormArray; }
  get notasPendentes() { return this.notas.filter(n => !this.isFechada(n)); }
  get notasHistorico() {
    return this.notas
      .filter(n => this.isFechada(n))
      .sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0));
  }

  novoItemGroup() {
    return this.fb.group({
      produtoId:       ['', Validators.required],
      quantidade:      [1,  [Validators.required, Validators.min(1)]]
    });
  }

  adicionarItem()    { this.itensArray.push(this.novoItemGroup()); }
  removerItem(i: number) { if (this.itensArray.length > 1) this.itensArray.removeAt(i); }

  ngOnInit() {
    this.loadNotas();
    this.produtoService.getAll().subscribe(p => { this.produtos = p; this.cdr.markForCheck(); });
  }

  loadNotas() {
    this.loading = true;
    this.notaService.getAll().subscribe({
      next: d => {
        this.notas = d.map(n => this.normalizeNota(n));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.toast.error('Erro ao carregar notas fiscais.'); this.loading = false; this.cdr.markForCheck(); }
    });
  }

  openNew()    { this.form.reset(); this.itensArray.clear(); this.itensArray.push(this.novoItemGroup()); this.showModal = true; }
  closeModal() { this.showModal = false; }

  getProduto(id: string): Produto | undefined {
    return this.produtos.find(p => p.id === id);
  }

  isFechada(nota: NotaFiscal): boolean {
    return nota.status === 'Fechada' || nota.status === 1;
  }

  isAberta(nota: NotaFiscal): boolean {
    return nota.status === 'Aberta' || nota.status === 0;
  }

  statusLabel(nota: NotaFiscal): string {
    return this.isFechada(nota) ? 'OK' : 'Pendente';
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

  private normalizeNota(nota: NotaFiscal): NotaFiscal {
    if (nota.status === 0) return { ...nota, status: 'Aberta' };
    if (nota.status === 1) return { ...nota, status: 'Fechada' };
    return nota;
  }

  private listarDescricoes(nota: NotaFiscal): string[] {
    const base = (nota.itens ?? [])
      .map(i => (i.produtoDescricao ?? i.produtoCodigo ?? '').trim())
      .filter((texto): texto is string => texto.length > 0);

    return [...new Set(base)];
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    this.saving = true;

    const nota: NotaFiscal = {
      itens: raw.itens.map((i: any) => {
        const prod = this.getProduto(i.produtoId)!;
        return {
          produtoId:        prod.id!,
          produtoCodigo:    prod.codigo,
          produtoDescricao: prod.descricao,
          quantidade:       i.quantidade
        };
      })
    };

    this.notaService.create(nota).subscribe({
      next: () => {
        this.toast.success('Nota fiscal criada!');
        this.loadNotas(); this.closeModal(); this.saving = false; this.cdr.markForCheck();
      },
      error: () => { this.toast.error('Erro ao criar nota fiscal.'); this.saving = false; this.cdr.markForCheck(); }
    });
  }

  imprimir(nota: NotaFiscal) {
    if (this.isFechada(nota)) { this.toast.show('Nota já está fechada.', 'info'); return; }
    this.imprimindo = nota.id!;
    this.notaService.imprimir(nota.id!).subscribe({
      next: notaAtualizada => {
        const atualizada = this.normalizeNota(notaAtualizada);
        this.toast.success(`Nota Nº ${atualizada.numero} impressa e fechada!`);
        this.notas = this.notas.map(n =>
          n.id === nota.id
            ? { ...n, ...atualizada, status: 'Fechada' }
            : n
        );
        this.imprimindo = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        const mensagemPadrao = 'Erro ao imprimir. Serviço de Estoque pode estar indisponível.';
        const payload = err?.error;
        const mensagem = typeof payload?.mensagem === 'string'
          ? payload.mensagem
          : mensagemPadrao;

        if (err.status === 400 || err.status === 409) {
          this.toast.show(mensagem, 'info');
        } else if (err.status === 503) {
          const detalhes = Array.isArray(payload?.erros)
            ? payload.erros
                .slice(0, 3)
                .map((e: string) => `• ${e}`)
                .join('\n')
            : '';
          this.toast.error(detalhes ? `${mensagem}\n\n${detalhes}` : mensagem);
        } else {
          this.toast.error(mensagem);
        }

        this.imprimindo = null;
        this.cdr.markForCheck();
      }
    });
  }

  excluir(nota: NotaFiscal) {
    if (!nota.id || this.removendo) return;
    this.notaParaDescartar = nota;
  }

  cancelarDescarte() {
    if (this.removendo) return;
    this.notaParaDescartar = null;
  }

  confirmarDescarte() {
    const nota = this.notaParaDescartar;
    if (!nota?.id) return;

    this.removendo = nota.id;
    this.notaService.descartar(nota.id).subscribe({
      next: (res) => {
        this.notas = this.notas.filter(n => n.id !== nota.id);
        this.toast.success(res?.mensagem ?? `Nota #${nota.numero} descartada.`);
        this.notaParaDescartar = null;
        this.removendo = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.mensagem ?? 'Não foi possível descartar a nota fiscal.';
        this.toast.error(msg);
        this.removendo = null;
        this.cdr.markForCheck();
      }
    });
  }
}
