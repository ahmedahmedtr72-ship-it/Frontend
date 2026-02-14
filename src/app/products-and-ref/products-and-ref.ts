import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';

export interface Product {
  id: number;
  articleNo: string;
  name: string;
  hsCode: string;
  quantity: number;
  totalPrice: number;
  nettoWeight: number;
  bruttoWeight: number;
  volumeMl?: number;
}

export interface ShipmentProduct {
  id: number;
  name: string;
  quantity: number;
  volumeMl: number;
  sendungsnr: string;
  // Calculated fields
  hsCode?: string;
  hsDescription?: string;
  unitBruttoWeightKg?: number;
  unitNettoWeightKg?: number;
  totalBruttoWeightKg?: number;
  totalNettoWeightKg?: number;
}

export interface Shipment {
  id: number;
  sendungsnr: string;
  weightKg: number;
  products: ShipmentProduct[];
  isCalculated: boolean;
}

@Component({
  selector: 'app-products-and-ref',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './products-and-ref.html',
  styleUrl: './products-and-ref.css',
})
export class ProductsAndRef implements OnInit {
  private readonly PACKAGING_RATIO = 0.93; // 93% product, 7% packaging

  // Master products list (for autocomplete/selection)
  masterProducts: Product[] = [];
  filteredProducts: Product[] = [];
  
  shipments: Shipment[] = [];
  selectedShipment: Shipment | null = null;

  // Shipment form
  newSendungsnr = '';
  newWeightKg = 0;

  // Product form for adding to shipment
  newProductName = '';
  newProductQuantity = 0;
  newProductVolumeMl = 0;
  productSearchTerm = '';
  showProductForm = false;

  constructor(private apiService: ApiService) {
    this.apiService.getProds().subscribe((data: any) => {
      this.masterProducts = data.Product;
      this.filteredProducts = [...this.masterProducts];
    });
  }

  ngOnInit(): void {}

  // ---------- Shipment Management ----------
  addShipment() {
    if (!this.newSendungsnr.trim() || this.newWeightKg <= 0) {
      alert('Sendungsnr and Weight are required!');
      return;
    }

    // Check if shipment already exists
    const exists = this.shipments.some(s => s.sendungsnr === this.newSendungsnr);
    if (exists) {
      alert('Shipment with this Sendungsnr already exists!');
      return;
    }

    this.shipments.push({
      id: Date.now(),
      sendungsnr: this.newSendungsnr,
      weightKg: this.newWeightKg,
      products: [],
      isCalculated: false,
    });

    this.newSendungsnr = '';
    this.newWeightKg = 0;
  }

  selectShipment(shipment: Shipment) {
    this.selectedShipment = shipment;
    this.productSearchTerm = '';
    this.filteredProducts = [...this.masterProducts];
    this.showProductForm = false;
  }

  deleteShipment(shipment: Shipment, event: Event) {
    event.stopPropagation();
    if (confirm(`Delete shipment ${shipment.sendungsnr}?`)) {
      this.shipments = this.shipments.filter(s => s.id !== shipment.id);
      if (this.selectedShipment?.id === shipment.id) {
        this.selectedShipment = null;
      }
    }
  }

  // ---------- Product Search ----------
  searchProducts() {
    const term = this.productSearchTerm.toLowerCase();
    this.filteredProducts = this.masterProducts.filter(
      (p) =>
        p.articleNo.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.hsCode.toLowerCase().includes(term)
    );
  }

  // ---------- Add Products to Shipment ----------
  
  // Option 1: Select from master product list
  selectProduct(product: Product) {
    if (!this.selectedShipment) {
      alert('Please select a shipment first!');
      return;
    }

    // Check if product already exists
    const exists = this.selectedShipment.products.some(
      (p) => p.name === product.name
    );
    if (exists) {
      alert('This product is already in this shipment!');
      return;
    }

    // Pre-fill the form with selected product data
    this.newProductName = product.name;
    this.newProductVolumeMl = product.volumeMl || 0;
    this.showProductForm = true;
  }

  // Option 2: Manual product entry
  toggleProductForm() {
    this.showProductForm = !this.showProductForm;
    if (!this.showProductForm) {
      this.resetProductForm();
    }
  }

  addProductToShipment() {
    if (!this.selectedShipment) {
      alert('Please select a shipment first!');
      return;
    }

    if (!this.newProductName.trim() || this.newProductQuantity <= 0 || this.newProductVolumeMl <= 0) {
      alert('Product name, quantity, and volume are required!');
      return;
    }

    // Check if product already exists
    const exists = this.selectedShipment.products.some(
      (p) => p.name === this.newProductName
    );
    if (exists) {
      alert('This product is already in this shipment!');
      return;
    }

    const newProduct: ShipmentProduct = {
      id: Date.now(),
      name: this.newProductName,
      quantity: this.newProductQuantity,
      volumeMl: this.newProductVolumeMl,
      sendungsnr: this.selectedShipment.sendungsnr,
    };

    this.selectedShipment.products.push(newProduct);
    this.selectedShipment.isCalculated = false; // Mark as needs recalculation

    this.resetProductForm();
    this.showProductForm = false;
  }

  removeProductFromShipment(product: ShipmentProduct) {
    if (!this.selectedShipment) return;

    this.selectedShipment.products = this.selectedShipment.products.filter(
      (p) => p.id !== product.id
    );
    this.selectedShipment.isCalculated = false;
  }

  resetProductForm() {
    this.newProductName = '';
    this.newProductQuantity = 0;
    this.newProductVolumeMl = 0;
  }

 async calculateWeights() {
  if (!this.selectedShipment) return;

  const totalBruttoKg = this.selectedShipment.weightKg;
  const totalNettoKg = totalBruttoKg * this.PACKAGING_RATIO;

  const unknown: ShipmentProduct[] = [];

  for (const p of this.selectedShipment.products) {
    const learned = await this.apiService
      .getLearnedWeight(p.name, p.volumeMl)
      .toPromise();

    if (learned?.found) {
      const confidence = Math.min(learned.samples / 10, 1);

      p.unitBruttoWeightKg =
        learned.unitBruttoWeightKg * confidence;

      p.unitNettoWeightKg =
        learned.unitNettoWeightKg * confidence;

      p.totalBruttoWeightKg =
        p.unitBruttoWeightKg * p.quantity;

      p.totalNettoWeightKg =
        p.unitNettoWeightKg * p.quantity;
    } else {
      unknown.push(p);
    }

    const hs = this.determineHSCode(p.name);
    p.hsCode = hs.code;
    p.hsDescription = hs.description;
  }

  // fallback volume logic
  if (unknown.length > 0) {
    const totalVolume = unknown.reduce(
      (s, p) => s + p.volumeMl * p.quantity, 0
    );

    for (const p of unknown) {
      const ratio =
        (p.volumeMl * p.quantity) / totalVolume;

      const brutto = totalBruttoKg * ratio;
      const netto = totalNettoKg * ratio;

      p.unitBruttoWeightKg = brutto / p.quantity;
      p.unitNettoWeightKg = netto / p.quantity;
      p.totalBruttoWeightKg = brutto;
      p.totalNettoWeightKg = netto;
    }
  }

  this.selectedShipment.isCalculated = true;
}


  // ---------- HS Code Determination ----------
  private determineHSCode(productName: string): { code: string; description: string } {
    const nameLower = productName.toLowerCase();

    if (
      nameLower.includes('augencreme') ||
      nameLower.includes('eye') ||
      nameLower.includes('eyelid') ||
      nameLower.includes('mascara') ||
      nameLower.includes('eye shadow')
    ) {
      return {
        code: '33049950',
        description: 'Eye make-up preparations',
      };
    }

    if (
      nameLower.includes('lsf') ||
      nameLower.includes('spf') ||
      nameLower.includes('uv-protection') ||
      nameLower.includes('sunscreen')
    ) {
      return {
        code: '33049950',
        description: 'Sunscreen or suntan preparations',
      };
    }

    if (
      nameLower.includes('nachtcreme') ||
      nameLower.includes('night cream') ||
      nameLower.includes('pink night')
    ) {
      return {
        code: '33049950',
        description: 'Skin care preparations - Night cream',
      };
    }

    if (
      nameLower.includes('gesichtscreme') ||
      nameLower.includes('face cream') ||
      nameLower.includes('hydration cream') ||
      nameLower.includes('day cream')
    ) {
      return {
        code: '33049950',
        description: 'Skin care preparations - Face cream',
      };
    }

    if (nameLower.includes('serum')) {
      return {
        code: '33049950',
        description: 'Skin care preparations - Serum',
      };
    }

    if (
      nameLower.includes('toner') ||
      nameLower.includes('astringent') ||
      nameLower.includes('refining') ||
      nameLower.includes('calming')
    ) {
      return {
        code: '33049950',
        description: 'Skin care preparations - Toner/Astringent',
      };
    }

    if (nameLower.includes('fluid')) {
      return {
        code: '33049950',
        description: 'Skin care preparations - Fluid',
      };
    }

    return {
      code: '33049950',
      description: 'Other skin care preparations',
    };
  }

  // ---------- Save to Backend ----------
  saveShipment() {
    if (!this.selectedShipment) {
      alert('No shipment selected!');
      return;
    }

    if (this.selectedShipment.products.length === 0) {
      alert('No products in this shipment!');
      return;
    }

    if (!this.selectedShipment.isCalculated) {
      alert('Please calculate weights first!');
      return;
    }

    // Prepare payload - array of products matching MongoDB schema
    const productsToSave = this.selectedShipment.products.map(p => ({
      name: p.name,
      quantity: p.quantity,
      volumeMl: p.volumeMl,
      sendungsnr: p.sendungsnr,
      hsCode: p.hsCode || '',
      hsDescription: p.hsDescription || '',
      unitBruttoWeightKg: p.unitBruttoWeightKg || 0,
      unitNettoWeightKg: p.unitNettoWeightKg || 0,
      totalBruttoWeightKg: p.totalBruttoWeightKg || 0,
      totalNettoWeightKg: p.totalNettoWeightKg || 0,
    }));

    console.log('Sending payload:', productsToSave);

    // Send array to backend
    this.apiService.saveProductWeights(productsToSave).subscribe({
      next: (response) => {

        alert(`Successfully saved ${productsToSave.length} products for shipment ${this.selectedShipment!.sendungsnr}!`);
        console.log('Save response:', response);
      },
      error: (error) => {
        alert('Error saving products!');
        console.error('Save error:', error);
      }
    });
  }

  // ---------- Utility Methods ----------
  getTotalProducts(shipment: Shipment): number {
    return shipment.products.reduce((sum, p) => sum + p.quantity, 0);
  }

  getTotalVolume(shipment: Shipment): number {
    return shipment.products.reduce((sum, p) => sum + (p.volumeMl * p.quantity), 0);
  }
}