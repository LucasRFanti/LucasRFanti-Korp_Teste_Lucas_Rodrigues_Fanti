import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private next = 0;

  private readonly minDurationMs = 5000;

  show(message: string, type: ToastType = 'info', durationMs?: number) {
    const id = ++this.next;
    this.toasts.update(t => [...t, { id, message, type }]);
    const effectiveDurationMs = Math.max(durationMs ?? this.minDurationMs, this.minDurationMs);
    setTimeout(() => this.remove(id), effectiveDurationMs);
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string)   { this.show(msg, 'error'); }

  remove(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
