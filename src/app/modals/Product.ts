export interface Product {
  pos: number;
  articleNo: string;
  name: string;
  hsCode: string;
  quantity: number;
  totalPrice: number;
  nettoWeight: number;
  bruttoWeight: number;
 
  gtin?: string; // ← AJOUTEZ CECI
 
  volumeMl?: number;
  unitBruttoKg?: number;
  unitNettoKg?: number;
  source?: string;
  sourcePDF?: string;
  status?: 'found' | 'missing' | 'completed';
}