import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Produto, ProdutoService } from '../../core/services/produto.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './produtos.html',
  styleUrl: './produtos.css'
})
export class Produtos implements OnInit {
  produtos: Produto[] = [];
  showModal = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  produtoParaExcluir: Produto | null = null;
  loading = false;
  saving = false;

  private toast = inject(ToastService);
  form;

  constructor(
    private produtoService: ProdutoService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.nonNullable.group({
      codigo: ['', [Validators.required, Validators.minLength(1)]],
      descricao: ['', [Validators.required, Validators.minLength(2)]],
      saldo: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit() { this.loadProdutos(); }

  ctrl(n: string): AbstractControl { return this.form.get(n)!; }
  isInvalid(n: string): boolean { const c = this.ctrl(n); return c.invalid && (c.dirty || c.touched); }
  errorMsg(n: string): string {
    const c = this.ctrl(n);
    if (c.hasError('required')) return 'Campo obrigatório.';
    if (c.hasError('minlength')) return `Mínimo ${c.getError('minlength').requiredLength} caracteres.`;
    if (c.hasError('min')) return 'Valor deve ser ≥ 0.';
    return '';
  }

  loadProdutos() {
    this.loading = true;
    this.produtoService.getAll().subscribe({
      next: d => { this.produtos = d; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.toast.error('Erro ao carregar produtos.'); this.loading = false; this.cdr.markForCheck(); }
    });
  }

  openNew() { this.editingId = null; this.form.reset({ saldo: 0 }); this.showModal = true; }
  openEdit(p: Produto) { this.editingId = p.id!; this.form.setValue({ codigo: p.codigo, descricao: p.descricao, saldo: p.saldo }); this.showModal = true; }
  closeModal() { this.showModal = false; this.form.markAsUntouched(); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const data = this.form.getRawValue();
    this.saving = true;

    const req = this.editingId
      ? this.produtoService.update({ ...data, id: this.editingId })
      : this.produtoService.create(data);

    req.subscribe({
      next: () => {
        this.toast.success(this.editingId ? 'Produto atualizado!' : 'Produto criado!');
        this.loadProdutos(); this.closeModal(); this.saving = false; this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err?.error?.mensagem ?? 'Erro ao salvar produto.';
        this.toast.error(msg); this.saving = false; this.cdr.markForCheck();
      }
    });
  }

  openDeleteConfirm(produto: Produto) {
    if (this.deletingId) return;
    this.produtoParaExcluir = produto;
  }

  closeDeleteConfirm() {
    if (this.deletingId) return;
    this.produtoParaExcluir = null;
  }

  confirmDelete() {
    const produto = this.produtoParaExcluir;
    if (!produto?.id) return;

    this.deletingId = produto.id;
    this.produtoService.delete(produto.id).subscribe({
      next: () => {
        this.produtos = this.produtos.filter(p => p.id !== produto.id);
        this.toast.success('Produto excluído.');
        this.produtoParaExcluir = null;
        this.deletingId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erro ao excluir produto.');
        this.deletingId = null;
        this.cdr.markForCheck();
      }
    });
  }
}
