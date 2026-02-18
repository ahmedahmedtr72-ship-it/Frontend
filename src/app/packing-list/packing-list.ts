import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { PackingListService } from '../packing-list';

interface PackingListItem {
  _id: string;
  sendungNum: string;
  uploadedPdfFilename?: string;
  products: any[];
  quantities: number[];
  totalBrutto: number;
  totalNetto: number;
  createdAt: string;
}

interface MatchedProduct {
  productId: string;
  name: string;
  volumeMl: number;
  volumeUnit: string;
  unitBruttoWeightKg: number;
  unitNettoWeightKg: number;
  gtin?: string;
  hsCode?: string;
  quantity: number;
  selected?: boolean;
}

@Component({
  selector: 'app-packing-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './packing-list.html',
  styleUrl: './packing-list.css'
})
export class PackingList implements OnInit {
  // State
  packingLists: PackingListItem[] = [];
  
  // Form - Step 1: Sendung Number
  sendungNum: string = '';
  
  // Form - Step 2: Choice (PDF or Manual)
  selectionMode: 'pdf' | 'manual' | null = null;
  
  // Form - PDF Mode
  selectedPdfFile: File | null = null;
  uploadedPdfFilename: string = '';
  parsedProducts: MatchedProduct[] = [];
  notFoundProducts: any[] = [];
  
  // Form - Manual Mode
  productSearchQuery: string = '';
  productSearchResults: MatchedProduct[] = [];
  showProductSearch: boolean = false;
  manuallySelectedProducts: MatchedProduct[] = [];
  
  // Loading & Messages
  isLoading: boolean = false;
  isParsingPdf: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // Modal
  showCreateModal: boolean = false;
  currentStep: number = 1;

  constructor(
    private apiService: PackingListService,
    private cd: ChangeDetectorRef  // ✅ Add ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadPackingLists();
  }

  // ============================================
  // LOAD DATA
  // ============================================
  loadPackingLists() {
    this.isLoading = true;
    this.apiService.getAllPackingLists().subscribe({
      next: (response) => {
        if (response.success) {
          this.packingLists = response.data;
        }
        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        this.errorMessage = 'Error loading packing lists';
        this.isLoading = false;
        console.error(error);
        this.cd.detectChanges();
      }
    });
  }

  // ============================================
  // MODAL WORKFLOW
  // ============================================
  openCreateModal() {
    this.showCreateModal = true;
    this.currentStep = 1;
    this.resetForm();
    this.cd.detectChanges();
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.resetForm();
    this.cd.detectChanges();
  }

  resetForm() {
    this.sendungNum = '';
    this.selectionMode = null;
    this.selectedPdfFile = null;
    this.uploadedPdfFilename = '';
    this.parsedProducts = [];
    this.notFoundProducts = [];
    this.manuallySelectedProducts = [];
    this.productSearchQuery = '';
    this.productSearchResults = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.currentStep = 1;
  }

  // ============================================
  // STEP 1: Enter Sendung Number
  // ============================================
  proceedToChoice() {
    if (!this.sendungNum || this.sendungNum.trim().length < 3) {
      this.errorMessage = 'Please enter a valid Sendung number';
      this.cd.detectChanges();
      return;
    }
    this.currentStep = 2;
    this.errorMessage = '';
    this.cd.detectChanges();
  }

  // ============================================
  // STEP 2: Choose Selection Mode
  // ============================================
  selectMode(mode: 'pdf' | 'manual') {
    this.selectionMode = mode;
    this.currentStep = mode === 'pdf' ? 3 : 4;
    this.cd.detectChanges();
  }

  // ============================================
  // STEP 3: Upload PDF (if PDF mode selected)
  // ============================================
  onPdfFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.errorMessage = 'Please select a PDF file';
      this.cd.detectChanges();
      return;
    }

    this.selectedPdfFile = file;
    this.uploadedPdfFilename = file.name;
    this.errorMessage = '';
    this.cd.detectChanges();
  }

  uploadAndParsePdf() {
    if (!this.selectedPdfFile) {
      this.errorMessage = 'Please select a PDF file';
      this.cd.detectChanges();
      return;
    }

    this.isParsingPdf = true;
    this.errorMessage = '';
    this.cd.detectChanges();

    console.log('📄 Starting PDF upload and parsing...');

    this.apiService.parsePdfForPacking(this.selectedPdfFile).subscribe({
      next: (response) => {
        console.log('✅ PDF Parse Response:', response);
        
        if (response.success) {
          // ✅ Map and pre-select all found products
          this.parsedProducts = response.data.matched.map((p: any) => ({
            productId: p.productId,
            name: p.name,
            volumeMl: p.volumeMl,
            volumeUnit: p.volumeUnit || 'ml',
            unitBruttoWeightKg: p.unitBruttoWeightKg,
            unitNettoWeightKg: p.unitNettoWeightKg,
            gtin: p.gtin,
            hsCode: p.hsCode,
            quantity: p.quantity,
            selected: true  // ✅ Pre-select all
          }));
          
          this.notFoundProducts = response.data.notFound || [];
          
          console.log(`📦 Loaded ${this.parsedProducts.length} matched products`);
          console.log(`⚠️  ${this.notFoundProducts.length} not found`);
          
          this.successMessage = `✅ ${response.message}`;
          this.currentStep = 5;  // ✅ Move to review step
          this.isParsingPdf = false;
          
          // ✅ Force change detection
          this.cd.detectChanges();
          
          setTimeout(() => {
            this.successMessage = '';
            this.cd.detectChanges();
          }, 3000);
        } else {
          this.errorMessage = 'Failed to parse PDF';
          this.isParsingPdf = false;
          this.cd.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ PDF Parse Error:', error);
        this.errorMessage = error.error?.error || 'Error parsing PDF';
        this.isParsingPdf = false;
        this.cd.detectChanges();
      }
    });
  }

  // ============================================
  // STEP 4: Manual Product Selection
  // ============================================
  onProductSearch() {
    if (this.productSearchQuery.length < 2) {
      this.productSearchResults = [];
      this.showProductSearch = false;
      this.cd.detectChanges();
      return;
    }

    this.apiService.searchProductsForPacking(this.productSearchQuery).subscribe({
      next: (response) => {
        if (response.success) {
          this.productSearchResults = response.data;
          this.showProductSearch = true;
          this.cd.detectChanges();
        }
      },
      error: (error) => {
        console.error('Search error:', error);
      }
    });
  }

  selectProductManually(product: any) {
    const exists = this.manuallySelectedProducts.find(p => p.productId === product._id);
    if (exists) {
      this.errorMessage = 'Product already added';
      setTimeout(() => {
        this.errorMessage = '';
        this.cd.detectChanges();
      }, 2000);
      return;
    }

    this.manuallySelectedProducts.push({
      productId: product._id,
      name: product.name,
      volumeMl: product.volumeMl,
      volumeUnit: product.volumeUnit,
      unitBruttoWeightKg: product.unitBruttoWeightKg,
      unitNettoWeightKg: product.unitNettoWeightKg,
      gtin: product.gtin,
      hsCode: product.hsCode,
      quantity: 1,
      selected: true
    });

    this.productSearchQuery = '';
    this.productSearchResults = [];
    this.showProductSearch = false;
    this.cd.detectChanges();
  }

  removeManualProduct(index: number) {
    this.manuallySelectedProducts.splice(index, 1);
    this.cd.detectChanges();
  }

  proceedToReviewManual() {
    if (this.manuallySelectedProducts.length === 0) {
      this.errorMessage = 'Please select at least one product';
      this.cd.detectChanges();
      return;
    }
    this.currentStep = 5;
    this.cd.detectChanges();
  }

  // ============================================
  // STEP 5: Review & Finalize (both modes)
  // ============================================
  toggleProductSelection(product: MatchedProduct) {
    product.selected = !product.selected;
    this.cd.detectChanges();
  }

  selectAll() {
    if (this.selectionMode === 'pdf') {
      this.parsedProducts.forEach(p => p.selected = true);
    } else {
      this.manuallySelectedProducts.forEach(p => p.selected = true);
    }
    this.cd.detectChanges();
  }

  deselectAll() {
    if (this.selectionMode === 'pdf') {
      this.parsedProducts.forEach(p => p.selected = false);
    } else {
      this.manuallySelectedProducts.forEach(p => p.selected = false);
    }
    this.cd.detectChanges();
  }

  get currentProducts(): MatchedProduct[] {
    return this.selectionMode === 'pdf' ? this.parsedProducts : this.manuallySelectedProducts;
  }

  // ============================================
  // FINAL: Create Packing List
  // ============================================
  createPackingList() {
    const selectedProducts = this.currentProducts.filter(p => p.selected);

    if (selectedProducts.length === 0) {
      this.errorMessage = 'Please select at least one product';
      this.cd.detectChanges();
      return;
    }

    const productIds = selectedProducts.map(p => p.productId);
    const quantities = selectedProducts.map(p => p.quantity);

    this.isLoading = true;
    this.cd.detectChanges();

    this.apiService.createPackingList({
      sendungNum: this.sendungNum,
      productIds,
      quantities,
      uploadedPdfFilename: this.selectionMode === 'pdf' ? this.uploadedPdfFilename : null
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Packing list created successfully!';
          this.closeCreateModal();
          this.loadPackingLists();
          setTimeout(() => {
            this.successMessage = '';
            this.cd.detectChanges();
          }, 3000);
        }
        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Error creating packing list';
        this.isLoading = false;
        console.error(error);
        this.cd.detectChanges();
      }
    });
  }

  // ============================================
  // GENERATE PDF
  // ============================================
  generatePdf(packingList: PackingListItem) {
    this.apiService.generatePackingListPdf(packingList._id).subscribe({
      next: (response) => {
        if (response.success) {
          const url = this.apiService.getDownloadUrl(response.url);
          window.open(url, '_blank');
          this.successMessage = 'PDF generated!';
          setTimeout(() => {
            this.successMessage = '';
            this.cd.detectChanges();
          }, 3000);
        }
      },
      error: (error) => {
        this.errorMessage = 'Error generating PDF';
        console.error(error);
        this.cd.detectChanges();
      }
    });
  }

  // ============================================
  // DELETE
  // ============================================
  deletePackingList(id: string) {
    if (!confirm('Delete this packing list?')) return;

    this.apiService.deletePackingList(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Packing list deleted!';
          this.loadPackingLists();
          setTimeout(() => {
            this.successMessage = '';
            this.cd.detectChanges();
          }, 3000);
        }
      },
      error: (error) => {
        this.errorMessage = 'Error deleting packing list';
        console.error(error);
        this.cd.detectChanges();
      }
    });
  }

  // ============================================
  // HELPERS
  // ============================================
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getTotalBrutto(): number {
    return this.currentProducts
      .filter(p => p.selected)
      .reduce((sum, p) => sum + (p.unitBruttoWeightKg * p.quantity), 0);
  }

  getTotalNetto(): number {
    return this.currentProducts
      .filter(p => p.selected)
      .reduce((sum, p) => sum + (p.unitNettoWeightKg * p.quantity), 0);
  }

  get selectedProductsCount(): number {
    return this.currentProducts.filter(p => p.selected).length;
  }
}