import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PackingListService {
  private baseUrl = 'http://192.168.1.81:3000/api';

  constructor(private http: HttpClient) {}

  // Parse PDF for packing list
  parsePdfForPacking(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('pdf', file);
    return this.http.post(`${this.baseUrl}/packing-lists/parse-pdf`, formData);
  }

  // Search products for packing
  searchProductsForPacking(query: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/packing-lists/search-products?q=${query}`);
  }

  // Create packing list
  createPackingList(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/packing-lists`, data);
  }

  // Get all packing lists
  getAllPackingLists(): Observable<any> {
    return this.http.get(`${this.baseUrl}/packing-lists`);
  }

  // Get single packing list
  getPackingListById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/packing-lists/${id}`);
  }

  // Generate PDF
  generatePackingListPdf(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/packing-lists/${id}/pdf`);
  }

  // Delete packing list
  deletePackingList(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/packing-lists/${id}`);
  }

  // Get download URL (same as ApiService)
  getDownloadUrl(relativePath: string): string {
    return `http://192.168.1.81:3000${relativePath}`;
  }
}