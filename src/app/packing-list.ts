import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PackingListService {
  private baseUrl = 'http://192.168.1.81:3000/api';

  constructor(private http: HttpClient) {}

     getProductsWithStock(queryString: string = ''): Observable<any> {
        return this.http.get(`${this.baseUrl}/packing-list/stock-products${queryString}`);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────
    getAllPackingLists(): Observable<any> {
        return this.http.get(`${this.baseUrl}/packing-list`);
    }

    getPackingListById(id: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/packing-list/${id}`);
    }

    createPackingList(payload: {
        sendungNum: string;
        productIds: string[];
        quantities: number[];
        uploadedPdfFilename?: string | null;
    }): Observable<any> {
        return this.http.post(`${this.baseUrl}/packing-list`, payload);
    }

    updatePackingList(id: string, payload: {
        sendungNum: string;
        productIds: string[];
        quantities: number[];
    }): Observable<any> {
        return this.http.put(`${this.baseUrl}/packing-list/${id}`, payload);
    }

    deletePackingList(id: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/packing-list/${id}`);
    }

    // ── PDF Generation ────────────────────────────────────────────────────

    /** Single packing list PDF (does NOT deduct stock) */
    generatePackingListPdf(id: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/packing-list/${id}/pdf`, {});
    }

    /** Combined PDF for multiple sendungen (DEDUCTS STOCK) */
    generateCombinedPdf(payload: { sendungIds: string[] }): Observable<any> {
        return this.http.post(`${this.baseUrl}/packing-list/combined-pdf`, payload);
    }

    // ── Parse PDF ─────────────────────────────────────────────────────────
    parsePdfForPacking(file: File): Observable<any> {
        const form = new FormData();
        form.append('pdf', file);
        return this.http.post(`${this.baseUrl}/packing-list/parse-pdf`, form);
    }

    searchProductsForPacking(q: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/packing-list/search-products?q=${encodeURIComponent(q)}`);
    }

    // ── URL Helper ────────────────────────────────────────────────────────
    getDownloadUrl(relativePath: string): string {
        return `${this.baseUrl.replace('/api', '')}${relativePath}`;
    }
}