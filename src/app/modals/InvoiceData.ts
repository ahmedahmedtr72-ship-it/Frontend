import { Product } from "./Product";

export interface InvoiceData {
  products: Product[];
  total: number;
  totalNetto: number;
  totalBrutto: number;
}