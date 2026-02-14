import { Product } from "./Product";

export interface Reference {
  id: string;
  referenceNo: string;
  createdAt: Date;
  products?: Product[];
}
