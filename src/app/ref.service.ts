import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reference } from './modals/Ref';
 import { Product } from './modals/Product';

// import { Reference, Product, ReferenceProduct } from '../components/products-and-ref';

@Injectable({ providedIn: 'root' })
export class ReferenceService {
  private API = 'http://192.168.1.81:3000/api/ref';

  constructor(private http: HttpClient) {}

  // ---------- REFERENCES ----------
  getReferences(): Observable<{ success: boolean; references: Reference[] }> {
    return this.http.get<{ success: boolean; references: Reference[] }>(this.API);
  }

  createReference(referenceNo: string) {
    return this.http.post<{ success: boolean; reference: Reference }>(this.API, {
      referenceNo,
    });
  }

  getReferenceById(id: string) {
    return this.http.get<{ success: boolean; reference: Reference }>(
      `${this.API}/${id}`
    );
  }

  finalizeReference(id: string) {
    return this.http.post(`${this.API}/${id}/finalize`, {});
  }
 

  removeProduct(referenceId: string, productId: string) {
    return this.http.delete(
      `${this.API}/${referenceId}/products/${productId}`
    );
  }
}
