import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Produto {
  id?: string;
  codigo: string;
  descricao: string;
  saldo: number;
}

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private url = '/api/produtos';
  constructor(private http: HttpClient) {}

  getAll(): Observable<Produto[]>              { return this.http.get<Produto[]>(this.url); }
  getById(id: string): Observable<Produto>     { return this.http.get<Produto>(`${this.url}/${id}`); }
  create(dto: Produto): Observable<Produto>    { return this.http.post<Produto>(this.url, dto); }
  update(dto: Produto): Observable<Produto>    {
    const { id, ...body } = dto;
    return this.http.put<Produto>(`${this.url}/${id}`, body);
  }

  delete(id: string): Observable<void>
  { return this.http.delete<void>(`${this.url}/${id}`); }
}
