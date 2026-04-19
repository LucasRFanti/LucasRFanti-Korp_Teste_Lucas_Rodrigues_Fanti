import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Employee, EmployeeService } from '../../core/services/employee';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employees.html',
  styleUrl: './employees.css'
})
export class Employees implements OnInit {
  employees: Employee[] = [];
  showModal = false;
  editingId: string | null = null;
  loading = false;
  saving = false;

  private toast = inject(ToastService);
  form;

  constructor(
    private employeeService: EmployeeService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.nonNullable.group({
      name:   ['', [Validators.required, Validators.minLength(2)]],
      email:  ['', [Validators.required, Validators.email]],
      phone:  ['', [Validators.required, this.phoneValidator]],
      salary: [0,  [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit() { this.loadEmployees(); }

  ctrl(name: string): AbstractControl { return this.form.get(name)!; }

  isInvalid(name: string): boolean {
    const c = this.ctrl(name);
    return c.invalid && (c.dirty || c.touched);
  }

  errorMsg(name: string): string {
    const c = this.ctrl(name);
    if (c.hasError('required'))  return 'Campo obrigatório.';
    if (c.hasError('email'))     return 'E-mail inválido.';
    if (c.hasError('phoneInvalid')) return 'Telefone inválido. Use DDD + número (ex.: 17 99999-1111).';
    if (c.hasError('minlength')) return `Mínimo ${c.getError('minlength').requiredLength} caracteres.`;
    if (c.hasError('min'))       return 'Valor deve ser maior ou igual a 0.';
    return '';
  }

  onPhoneInput(valor: string) {
    const control = this.ctrl('phone');
    const formatado = this.normalizePhone(valor, true);
    control.setValue(formatado ?? valor, { emitEvent: false });
    control.updateValueAndValidity({ emitEvent: false });
  }

  onPhoneBlur() {
    const control = this.ctrl('phone');
    const atual = String(control.value ?? '');
    const formatado = this.normalizePhone(atual);
    if (formatado) {
      control.setValue(formatado);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  loadEmployees() {
    this.loading = true;
    this.employeeService.getAll().subscribe({
      next: (data) => { this.employees = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.toast.error('Erro ao carregar funcionários.'); this.loading = false; this.cdr.markForCheck(); }
    });
  }

  openNew() {
    this.editingId = null;
    this.form.reset({ salary: 0 });
    this.showModal = true;
  }

  openEdit(emp: Employee) {
    this.editingId = emp.id!;
    this.form.setValue({ name: emp.name, email: emp.email, phone: emp.phone, salary: emp.salary });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.form.markAsUntouched(); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    const phone = this.normalizePhone(raw.phone);

    if (!phone) {
      this.ctrl('phone').setErrors({ phoneInvalid: true });
      this.ctrl('phone').markAsTouched();
      return;
    }

    const data = { ...raw, phone };
    this.saving = true;

    const req = this.editingId
      ? this.employeeService.update({ ...data, id: this.editingId })
      : this.employeeService.create(data);

    const successMsg = this.editingId ? 'Funcionário atualizado!' : 'Funcionário criado!';

    req.subscribe({
      next: () => {
        this.toast.success(successMsg);
        this.loadEmployees(); this.closeModal();
        this.saving = false; this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erro ao salvar funcionário.');
        this.saving = false; this.cdr.markForCheck();
      }
    });
  }

  private phoneValidator = (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '').trim();
    if (!valor) return null;
    return this.normalizePhone(valor) ? null : { phoneInvalid: true };
  };

  private normalizePhone(input: string, allowPartial = false): string | null {
    const digitsOnly = (input ?? '').replace(/\D/g, '');
    if (!digitsOnly) return allowPartial ? '' : null;

    let local = digitsOnly;
    if (local.startsWith('55')) {
      local = local.slice(2);
    }

    if (allowPartial) {
      local = local.slice(0, 11);

      if (local.length <= 2) return local ? `(${local}` : '';

      const ddd = local.slice(0, 2);
      const numero = local.slice(2);

      if (numero.length <= 4) {
        return `(${ddd}) ${numero}`;
      }

      if (numero.length <= 8) {
        return `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
      }

      return `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5, 9)}`;
    }

    if (local.length !== 10 && local.length !== 11) {
      return null;
    }

    const ddd = local.slice(0, 2);
    const numero = local.slice(2);

    if (numero.length === 8) {
      return `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
    }

    return `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
  }

  delete(id: string) {
    if (!confirm('Deseja excluir este funcionário?')) return;
    this.employeeService.delete(id).subscribe({
      next: () => {
        this.employees = this.employees.filter(e => e.id !== id);
        this.toast.success('Funcionário excluído.');
        this.cdr.markForCheck();
      },
      error: () => { this.toast.error('Erro ao excluir funcionário.'); this.cdr.markForCheck(); }
    });
  }
}
