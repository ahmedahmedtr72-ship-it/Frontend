import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface PackImage {
  filename: string;
  path: string;
  size?: number;
}

export interface Pack {
  _id: string;
  images: PackImage[];
  packCategory: PackCategory | string;
  createdAt: Date;
}

export interface PackCategory {
  _id: string;
  name: string;
  description?: string;
  packs: Pack[];
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PackService {
  private apiUrl = `${environment.apiBaseUrl}/packs`;

  constructor(private http: HttpClient) {}

  // Category endpoints
  getCategories(): Observable<PackCategory[]> {
    return this.http.get<PackCategory[]>(`${this.apiUrl}/categories`);
  }

  getCategoryById(id: string): Observable<PackCategory> {
    return this.http.get<PackCategory>(`${this.apiUrl}/categories/${id}`);
  }

  createCategory(data: { name: string; description?: string }): Observable<PackCategory> {
    return this.http.post<PackCategory>(`${this.apiUrl}/categories`, data);
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categories/${id}`);
  }

  // Pack endpoints
  getPacks(): Observable<Pack[]> {
    return this.http.get<Pack[]>(`${this.apiUrl}/packs`);
  }

  getPackById(id: string): Observable<Pack> {
    return this.http.get<Pack>(`${this.apiUrl}/packs/${id}`);
  }

  createPack(formData: FormData): Observable<Pack> {
    return this.http.post<Pack>(`${this.apiUrl}/packs`, formData);
  }

  deletePack(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/packs/${id}`);
  }
}
