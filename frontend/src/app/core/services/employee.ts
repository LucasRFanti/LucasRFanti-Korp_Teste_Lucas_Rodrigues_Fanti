import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Employee {
  id?: string;
  name: string;
  email: string;
  phone: string;
  salary: number;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private url = '/api/employess';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.url);
  }

  getById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/${id}`);
  }

  create(employee: Employee): Observable<Employee> {
    return this.http.post<Employee>(this.url, employee);
  }

  update(employee: Employee): Observable<Employee> {
    const { id, ...body } = employee;
    return this.http.put<Employee>(`${this.url}/${id}`, body);
}

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
}
}
