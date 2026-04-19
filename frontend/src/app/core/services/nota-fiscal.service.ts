import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ItemNota {
  id?: string;
  produtoId: string;
  produtoCodigo: string;
  produtoDescricao: string;
  quantidade: number;
}

export interface NotaFiscal {
  id?: string;
  numero?: number;
  status?: 'Aberta' | 'Fechada' | 0 | 1;
  criadoEm?: string;
  itens: ItemNota[];
}

@Injectable({ providedIn: 'root' })
export class NotaFiscalService {
  private url = '/api/notasfiscais';
  constructor(private http: HttpClient) { }

  private gerarIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  getAll(): Observable<NotaFiscal[]> { return this.http.get<NotaFiscal[]>(this.url); }
  getById(id: string): Observable<NotaFiscal> { return this.http.get<NotaFiscal>(`${this.url}/${id}`); }
  create(dto: NotaFiscal): Observable<NotaFiscal> {
    const headers = new HttpHeaders({ 'Idempotency-Key': this.gerarIdempotencyKey() });
    return this.http.post<NotaFiscal>(this.url, dto, { headers });
  }
  imprimir(id: string): Observable<NotaFiscal> {
    const headers = new HttpHeaders({ 'Idempotency-Key': this.gerarIdempotencyKey() });
    return this.http.post<NotaFiscal>(`${this.url}/${id}/imprimir`, {}, { headers });
  }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  descartar(id: string): Observable<{ mensagem: string }> {
    return this.http.post<{ mensagem: string }>(`${this.url}/${id}/descartar`, {});
  }
  limparHistorico(): Observable<{ mensagem: string; removidas: number }> {
    return this.http.delete<{ mensagem: string; removidas: number }>(`${this.url}/historico`);
  }
}
