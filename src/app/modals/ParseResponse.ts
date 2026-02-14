import { InvoiceData } from "./InvoiceData";

export interface ParseResponse {
  success: boolean;
  data?: InvoiceData;
  error?: string;
}
