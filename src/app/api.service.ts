// api.service.ts - UPDATED METHOD
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, finalize, Observable, tap, throwError, timeout } from 'rxjs';
import { ParseResponse } from './modals/ParseResponse';
import { GenerateResponse } from './modals/GenerateResponse ';
import { InvoiceData } from './modals/InvoiceData';
export interface ExcelMetadata {
  dispatchNumber?       : string;
  generationDate?       : string;
  dispatchDate?         : string;
  transportType?        : string;
  fromLocation?         : string;
  toLocation?           : string;
  deliveryTerms?        : string;
  paymentTerms?         : string;
  numberOfCartons?      : number;
  numberOfPallets?      : number;
  showPallets?          : boolean;
  packingMateriel?      : number;
  totalWeightWithPacking?: number;
}

export interface ExcelExportResponse {
  success  : boolean;
  file     : string;   // e.g. "/outputs/export-202508TN002.xlsx"
  fileName : string;   // e.g. "export-202508TN002.xlsx"
}
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://192.168.1.81:3000/api';

  constructor(private http: HttpClient) {}

  // ... (all previous methods remain the same)

  parsePDF(file: File): Observable<ParseResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ParseResponse>(`${this.baseUrl}/parse`, formData);
  }
  generatePdfNoCountry(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/pdf/generate-no-country`, payload);
}
generateFrenchPDF(body: any): Observable<any> {
  return this.http.post(`${this.baseUrl}/pdf/generate-french`, body);
}
  parseMultiplePDFs(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/parse-multiple`, formData);
  }

  generatePDF(data: any): Observable<any> { 
    return this.http.post<any>(`${this.baseUrl}/generate`, data);
  }

  // ============================================
  // ✅ UPDATED: INGREDIENT SHEETS WITH INDIVIDUAL DATES
  // ============================================
  
  /**
   * Generate ingredient ZIP with individual dates for each product
   * @param data.products - Array of {gtin, date} objects
   */
  generateIngredientZip(data: {
    products: Array<{
      gtin: string;
      date: string;
    }>;
  }): Observable<Blob> {
    console.log('📦 ApiService: Generating ingredient ZIP');
    console.log('Products with dates:', data.products);

    return this.http.post(
      `${this.baseUrl}/tk/generate-ingredient-zip`,
      data,
      { responseType: 'blob' }
    ).pipe(
      tap({
        next: (blob) => console.log('✅ ZIP received, size:', blob.size),
        error: (err) => console.error('❌ ZIP generation error:', err)
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Erreur lors de la génération du ZIP';
        
        if (error.status === 0) {
          errorMessage = 'Impossible de contacter le serveur';
        } else if (error.status === 400) {
          errorMessage = 'Données invalides';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur lors de la génération';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  getProds(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/products`);
  }

  saveProductWeights(products: any[]): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/add-missing-products`,
      { products }
    );
  }

  getLearnedWeight(name: string, volumeMl: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/product-weights/learned`,
      { params: { name, volumeMl: volumeMl.toString() } }
    );
  }

  getDownloadUrl(path: string): string {
    return `http://192.168.1.81:3000${path}`;
  }
  checkGtinExists(gtin: string): Observable<any> {
  return this.http.get(`${this.baseUrl}/addedProds/check-gtin`, {
    params: { gtin }
  });
}
checkProductExists(name: string, volumeMl: number, volumeUnit: string): Observable<any> {
  return this.http.get(`${this.baseUrl}/addedProds/check-product`, {
    params: { name, volumeMl: volumeMl.toString(), volumeUnit }
  });
}

  // ============================================
  // SINGLE DM PRODUCT PDF (kept for backward compatibility)
  // ============================================
  
  takeDmPdf(gtin: string, date: string): Observable<Blob> {
    console.log('ApiService: Starting single PDF request');
    console.log('URL:', `${this.baseUrl}/tk/dm/product/pdf`);
    console.log('Body:', { gtin, date });

    return this.http.post(
      `${this.baseUrl}/tk/dm/product/pdf`,
      { gtin, date },
      { responseType: 'blob' }
    ).pipe(
      tap({
        next: (blob) => console.log('ApiService TAP: Blob received', blob),
        error: (err) => console.log('ApiService TAP: Error', err),
        complete: () => console.log('ApiService TAP: Complete')
      }),
      catchError((error: HttpErrorResponse) => {
        console.log('ApiService CATCH: Error caught', error);
        
        let errorMessage = 'Erreur serveur';
        
        if (error.status === 0) {
          errorMessage = 'Impossible de contacter le serveur';
        } else if (error.status === 404) {
          errorMessage = 'Produit non trouvé';
        } else if (error.status === 400) {
          errorMessage = 'GTIN invalide';
        }
        
        console.log('ApiService: Throwing error:', errorMessage);
        return throwError(() => new Error(errorMessage));
      }),
      finalize(() => {
        console.log('ApiService FINALIZE: Request ended');
      })
    );
  }

  // ============================================
  // PRODUCT DATABASE CRUD (ProductAdded)
  // ============================================

  getProductsAdded(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http.get(`${this.baseUrl}/addedProds`, { params: httpParams });
  }

  getProductAddedById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/addedProds/${id}`);
  }

  searchProductsAdded(query: string): Observable<any> {
    const params = new HttpParams().set('q', query);
    return this.http.get(`${this.baseUrl}/addedProds/search`, { params });
  }

  getProductStatistics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/addedProds/statistics`);
  }

  createProductAdded(product: {
    name: string;
    volumeMl: number;
    hsCode: string;
    hsDescription?: string;
    unitBruttoWeightKg: number;
    unitNettoWeightKg: number;
    gtin?: string;
    countryOfOrigin?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/addedProds`, product);
  }

  updateProductAdded(id: string, product: Partial<{
    name: string;
    volumeMl: number;
    hsCode: string;
    hsDescription: string;
    unitBruttoWeightKg: number;
    unitNettoWeightKg: number;
    gtin: string;
    countryOfOrigin: string;
  }>): Observable<any> {
    return this.http.put(`${this.baseUrl}/addedProds/${id}`, product);
  }

  deleteProductAdded(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/addedProds/${id}`);
  }

  bulkDeleteProductsAdded(ids: string[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/addedProds/bulk-delete`, { ids });
  }

  getHsCodes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/addedProds/hs-codes`);
  }

  autocompleteProductName(query: string): Observable<any> {
    const params = new HttpParams().set('q', query);
    return this.http.get(`${this.baseUrl}/addedProds/autocomplete`, { params });
  }

  getProductByName(name: string): Observable<any> {
    const params = new HttpParams().set('name', name);
    return this.http.get(`${this.baseUrl}/addedProds/by-name`, { params });
  }

  smartCreateProduct(product: {
    name: string;
    volumeMl: number;
    hsCode: string;
    unitBruttoWeightKg: number;
    unitNettoWeightKg: number;
    hsDescription?: string;
    gtin?: string;
    countryOfOrigin?: string;
    autoFill?: boolean;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/addedProds/smart-create`, product);
  }


  exportToExcel(data: InvoiceData, metadata: ExcelMetadata = {}): Observable<ExcelExportResponse> {
    console.log('📊 ApiService: Exporting to Excel');
    return this.http.post<ExcelExportResponse>(
      `${this.baseUrl}/export-excel`,
      { data, metadata }
    ).pipe(
      tap({
        next: (res) => console.log('✅ Excel export ready:', res.file),
        error: (err) => console.error('❌ Excel export error:', err)
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Excel export failed';
        if (error.status === 0)   errorMessage = 'Cannot reach server';
        if (error.status === 400) errorMessage = 'Invalid data provided';
        if (error.status === 500) errorMessage = 'Server error during export';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Export and immediately trigger browser download.
   * Convenience wrapper around exportToExcel().
   */
  exportToExcelAndDownload(data: InvoiceData, metadata: ExcelMetadata = {}): void {
    this.exportToExcel(data, metadata).subscribe({
      next: (res) => {
        const url = this.getDownloadUrl(res.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName;
        a.click();
      },
      error: (err) => console.error('Download failed:', err.message)
    });
  }

  
}