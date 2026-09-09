import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomerDto,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '../../features/management/models/customer.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/customers`;

  getCustomers(): Observable<CustomerDto[]> {
    return this.http.get<CustomerDto[]>(this.baseUrl);
  }

  getCustomerById(id: string): Observable<CustomerDto> {
    return this.http.get<CustomerDto>(`${this.baseUrl}/${id}`);
  }

  createCustomer(request: CreateCustomerRequest): Observable<CustomerDto> {
    return this.http.post<CustomerDto>(this.baseUrl, request);
  }

  updateCustomer(id: string, request: UpdateCustomerRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, request);
  }

  deleteCustomer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
