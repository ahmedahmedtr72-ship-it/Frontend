import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Product } from './modals/Product';
import { Observable } from 'rxjs';
import { productG } from './modals/productsGenerated';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductW {
    private apiUrl = `${environment.apiBaseUrl}/weights/products`;
  constructor(private http: HttpClient) {}

 
   // GET METHODS
  // ============================================

  getAllProducts(page: number = 1, limit: number = 1000): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    return this.http.get(`${this.apiUrl}`, { params });
  }

  getProductById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl   }/${id}`);
  }

  searchProducts(query: string, field: string = 'both'): Observable<any> {
    const params = new HttpParams()
      .set('q', query)
      .set('field', field);
    
    return this.http.get(`${this.apiUrl}/search`, { params });
  }

  getProductsByVolumeRange(minVolume: number, maxVolume: number): Observable<any> {
    const params = new HttpParams()
      .set('minVolume', minVolume.toString())
      .set('maxVolume', maxVolume.toString());
    
    return this.http.get(`${this.apiUrl}/volume-range`, { params });
  }

  getProductsByWeightRange(minWeight: number, maxWeight: number, weightType: string = 'netto'): Observable<any> {
    const params = new HttpParams()
      .set('minWeight', minWeight.toString())
      .set('maxWeight', maxWeight.toString())
      .set('weightType', weightType);
    
    return this.http.get(`${this.apiUrl}/weight-range`, { params });
  }

  getProductsByHSCode(hsCode: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/by-hs-code/${hsCode}`);
  }

  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }

  getDistinctValues(field: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/distinct/${field}`);
  }

  // ============================================
  // CREATE METHODS
  // ============================================

  createProduct(productData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, productData);
  }

  createBulkProducts(products: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk`, { products });
  }

  // ============================================
  // UPDATE METHODS
  // ============================================

  updateProduct(id: string, productData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, productData);
  }

  updateProductSamples(id: string, samples: number, increment: boolean = false): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/samples`, { samples, increment });
  }

  // ============================================
  // DELETE METHODS
  // ============================================

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  deleteBulkProducts(ids: string[]): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bulk`, { body: { ids } });
  }
}
