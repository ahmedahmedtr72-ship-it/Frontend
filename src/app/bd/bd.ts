import { ChangeDetectorRef, Component, OnDestroy, NgZone } from '@angular/core';
import { ApiService } from '../api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

 interface ProductAdded {
  _id?: string;
  name: string;
  frenchName: string;        // ✅ NEW
  volumeMl: number;
  volumeUnit?: string;
  hsCode: string;
  hsDescription?: string;
  unitBruttoWeightKg: number;
  unitNettoWeightKg: number;
  gtin?: string;
  countryOfOrigin?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Statistics {
  totalProducts: number;
  countryCounts: Array<{ _id: string; count: number }>;
  averageWeights: {
    avgBrutto: number;
    avgNetto: number;
  };
}

interface HsCode {
  code: string;
  description: string;
}

interface DMProduct {
  title: string;
  gtin: string;
  countryOfOrigin?: {
    abbr: string;
  };
}

@Component({
  selector: 'app-bd',
  imports: [CommonModule, FormsModule],
  templateUrl: './bd.html',
  styleUrl: './bd.css',
})
export class Bd implements OnDestroy {
  // ============================================
  // STATE
  // ============================================
  products: ProductAdded[] = [];
  selectedProducts: Set<string> = new Set();
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalItems: number = 0;
  totalPages: number = 0;

  // Search & Sort
  searchQuery: string = '';
  sortBy: string = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Loading & Messages
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Modal state
  showModal: boolean = false;
  modalMode: 'create' | 'edit' = 'create';
  currentProduct: ProductAdded = this.getEmptyProduct();

  // Statistics
  statistics: Statistics | null = null;
  showStatistics: boolean = false;

  // Delete confirmation
  showDeleteModal: boolean = false;
  productToDelete: ProductAdded | null = null;

  // Autocomplete
  productNameSuggestions: DMProduct[] = [];
  showSuggestions: boolean = false;
  isSearchingProducts: boolean = false;

  // HS Code management
  hsCodeList: HsCode[] = [];
  showAddHsCode: boolean = false;
  newHsCode: { code: string; description: string } = { code: '', description: '' };

  // Validation states
  gtinError: string = '';
  productExistsWarning: string = '';
  isCheckingGtin: boolean = false;
  isCheckingProduct: boolean = false;
  
  // Debounce subjects
  private gtinCheckSubject = new Subject<string>();
  private productCheckSubject = new Subject<{ name: string; volume: number; unit: string }>();
  private destroy$ = new Subject<void>();
  private isDestroyed = false; // ✅ Track component destruction ourselves

  constructor(
    private apiService: ApiService,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadStatistics();
    this.loadHsCodes();
    this.setupValidationDebounce();
  }

  ngOnDestroy() {
    this.isDestroyed = true; // ✅ Mark as destroyed
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ Setup debounced validation
  setupValidationDebounce() {
    // GTIN validation - check after 500ms of no typing
    this.gtinCheckSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(gtin => {
      this.checkGtinExists(gtin);
    });

    // Product existence check - check after 800ms
    this.productCheckSubject.pipe(
      debounceTime(800),
      distinctUntilChanged((prev, curr) => 
        prev.name === curr.name && prev.volume === curr.volume && prev.unit === curr.unit
      ),
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.checkProductExists(data.name, data.volume, data.unit);
    });
  }

  // ✅ FIXED: Safe change detection wrapper
  private safeDetectChanges() {
    if (this.isDestroyed) {
      return; // Don't run if component is destroyed
    }
    
    this.ngZone.run(() => {
      try {
        this.cd.detectChanges();
      } catch (error) {
        // Silently catch if already destroyed
        console.debug('Change detection skipped:', error);
      }
    });
  }

  // ============================================
  // DATA LOADING
  // ============================================
  loadProducts() {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getProductsAdded({
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.searchQuery,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.products = response.data;
          this.totalItems = response.pagination.total;
          this.totalPages = response.pagination.totalPages;
        }
        this.isLoading = false;
        this.safeDetectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Error loading products';
        this.isLoading = false;
        console.error('Load products error:', error);
        this.safeDetectChanges();
      }
    });
  }

  loadStatistics() {
    this.apiService.getProductStatistics().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.statistics = response.data;
          this.safeDetectChanges();
        }
      },
      error: (error) => {
        console.error('Load statistics error:', error);
      }
    });
  }

  loadHsCodes() {
    this.apiService.getHsCodes().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.hsCodeList = response.data;
          this.safeDetectChanges();
        }
      },
      error: (error) => {
        console.error('Load HS codes error:', error);
      }
    });
  }

  // ============================================
  // VALIDATION METHODS
  // ============================================
  onGtinInput(value: string) {
    this.gtinError = '';
    
    if (!value || value.trim().length === 0) {
      return;
    }

    // Trigger debounced check
    this.gtinCheckSubject.next(value.trim());
  }

  checkGtinExists(gtin: string) {
    if (!gtin || gtin.length === 0) {
      this.gtinError = '';
      return;
    }

    // Skip check if editing and GTIN hasn't changed
    if (this.modalMode === 'edit' && this.currentProduct._id) {
      const originalProduct = this.products.find(p => p._id === this.currentProduct._id);
      if (originalProduct?.gtin === gtin) {
        this.gtinError = '';
        return;
      }
    }

    this.isCheckingGtin = true;

    this.apiService.checkGtinExists(gtin).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.exists) {
            this.gtinError = `⚠️ GTIN already exists: "${response.product.name}"`;
          } else {
            this.gtinError = '';
          }
          this.isCheckingGtin = false;
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('GTIN check error:', error);
          this.isCheckingGtin = false;
        });
      }
    });
  }

  onProductDetailsChange() {
    this.productExistsWarning = '';

    const name = this.currentProduct.name?.trim();
    const volume = this.currentProduct.volumeMl;
    const unit = this.currentProduct.volumeUnit || 'ml';

    if (!name || name.length < 3) {
      return;
    }

    if (!volume || volume <= 0) {
      return;
    }

    // Trigger debounced check
    this.productCheckSubject.next({ name, volume, unit });
  }

  checkProductExists(name: string, volumeMl: number, volumeUnit: string) {
    // Skip check if editing
    if (this.modalMode === 'edit' && this.currentProduct._id) {
      this.productExistsWarning = '';
      return;
    }

    this.isCheckingProduct = true;

    this.apiService.checkProductExists(name, volumeMl, volumeUnit).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.exists) {
            this.productExistsWarning = `⚠️ Product already exists: "${response.product.name}" (${response.product.volumeMl}${response.product.volumeUnit})`;
          } else {
            this.productExistsWarning = '';
          }
          this.isCheckingProduct = false;
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Product check error:', error);
          this.isCheckingProduct = false;
        });
      }
    });
  }

  // ============================================
  // AUTOCOMPLETE FUNCTIONALITY
  // ============================================
  onProductNameInput(value: string) {
    // Trigger product existence check
    this.onProductDetailsChange();

    if (value.length < 2) {
      this.productNameSuggestions = [];
      this.showSuggestions = false;
      return;
    }

    this.isSearchingProducts = true;

    this.apiService.autocompleteProductName(value).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.success) {
            this.productNameSuggestions = response.data;
            this.showSuggestions = this.productNameSuggestions.length > 0;
          }
          this.isSearchingProducts = false;
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Autocomplete error:', error);
          this.isSearchingProducts = false;
          this.showSuggestions = false;
        });
      }
    });
  }

  selectProductFromSuggestion(product: DMProduct) {
    this.currentProduct.name = product.title;
    
    if (product.gtin) {
      this.currentProduct.gtin = product.gtin.toString();
      // Trigger GTIN validation
      this.onGtinInput(this.currentProduct.gtin);
    }
    
    if (product.countryOfOrigin?.abbr) {
      this.currentProduct.countryOfOrigin = product.countryOfOrigin.abbr;
    }

    this.showSuggestions = false;
    this.productNameSuggestions = [];

    // Auto-suggest packaging type
    const detectedType = this.detectPackagingType(product.title);
    
    this.successMessage = `✅ Product auto-filled! Suggested packaging: ${detectedType}`;
    setTimeout(() => {
      this.successMessage = '';
      this.safeDetectChanges();
    }, 3000);
    
    // Trigger product existence check
    this.onProductDetailsChange();
  }

  closeSuggestions() {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  // ============================================
  // HS CODE MANAGEMENT
  // ============================================
  onHsCodeChange(code: string) {
    const hsCode = this.hsCodeList.find(hs => hs.code === code);
    if (hsCode) {
      this.currentProduct.hsDescription = hsCode.description;
    }
  }

  toggleAddHsCode() {
    this.showAddHsCode = !this.showAddHsCode;
    if (!this.showAddHsCode) {
      this.newHsCode = { code: '', description: '' };
    }
  }

  addNewHsCode() {
    if (!this.newHsCode.code.trim() || !this.newHsCode.description.trim()) {
      this.errorMessage = 'Please enter both HS code and description';
      setTimeout(() => {
        this.errorMessage = '';
        this.safeDetectChanges();
      }, 3000);
      return;
    }

    const exists = this.hsCodeList.find(hs => hs.code === this.newHsCode.code);
    if (exists) {
      this.errorMessage = 'This HS code already exists';
      setTimeout(() => {
        this.errorMessage = '';
        this.safeDetectChanges();
      }, 3000);
      return;
    }

    this.hsCodeList.push({
      code: this.newHsCode.code,
      description: this.newHsCode.description
    });

    this.currentProduct.hsCode = this.newHsCode.code;
    this.currentProduct.hsDescription = this.newHsCode.description;

    this.successMessage = '✅ HS Code added! (Available for this product)';
    this.showAddHsCode = false;
    this.newHsCode = { code: '', description: '' };
    setTimeout(() => {
      this.successMessage = '';
      this.safeDetectChanges();
    }, 3000);
  }

  getGroupedHsCodes() {
    const groups: { [key: string]: HsCode[] } = {
      'Hair Care': [],
      'Facial Care': [],
      'Body Care': [],
      'Bath & Shower': [],
      'Deodorants & Hygiene': [],
      'Oral Care': [],
      'Makeup': [],
      'Sun Care': [],
      'Shaving & Hair Removal': [],
      'Perfumes & Fragrances': [],
      'Baby Care': [],
      'Cotton & Accessories': [],
      'Wet Wipes & Cleansing': [],
      'Hand Sanitizers': [],
      'Specialty Products': [],
      'Essential Oils & Aromatherapy': [],
      'Other': []
    };

    this.hsCodeList.forEach(hsCode => {
      const code = hsCode.code.replace(/\./g, '');
      
      if (code.startsWith('3305')) {
        groups['Hair Care'].push(hsCode);
      } else if (code.startsWith('330499') || code.startsWith('330491')) {
        if (hsCode.description.toLowerCase().includes('sun')) {
          groups['Sun Care'].push(hsCode);
        } else if (hsCode.description.toLowerCase().includes('baby')) {
          groups['Baby Care'].push(hsCode);
        } else {
          groups['Facial Care'].push(hsCode);
        }
      } else if (code.startsWith('3401')) {
        groups['Bath & Shower'].push(hsCode);
      } else if (code.startsWith('330720') || code.startsWith('330741') || code.startsWith('330749') || code.startsWith('330790') && hsCode.description.toLowerCase().includes('hygiene')) {
        groups['Deodorants & Hygiene'].push(hsCode);
      } else if (code.startsWith('3306')) {
        groups['Oral Care'].push(hsCode);
      } else if (code.startsWith('330410') || code.startsWith('330420') || code.startsWith('330430')) {
        groups['Makeup'].push(hsCode);
      } else if (code.startsWith('330710') || code.startsWith('330790') && (hsCode.description.toLowerCase().includes('shav') || hsCode.description.toLowerCase().includes('depilat'))) {
        groups['Shaving & Hair Removal'].push(hsCode);
      } else if (code.startsWith('3303')) {
        groups['Perfumes & Fragrances'].push(hsCode);
      } else if (code.startsWith('5601')) {
        groups['Cotton & Accessories'].push(hsCode);
      } else if (hsCode.description.toLowerCase().includes('wipe')) {
        groups['Wet Wipes & Cleansing'].push(hsCode);
      } else if (code.startsWith('3808') || hsCode.description.toLowerCase().includes('sanitiz')) {
        groups['Hand Sanitizers'].push(hsCode);
      } else if (code.startsWith('3301')) {
        groups['Essential Oils & Aromatherapy'].push(hsCode);
      } else {
        groups['Other'].push(hsCode);
      }
    });

    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }

  // ============================================
  // SEARCH & FILTER
  // ============================================
  onSearch() {
    this.currentPage = 1;
    this.loadProducts();
  }

  onSortChange(field: string) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.loadProducts();
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadProducts();
  }

  // ============================================
  // PAGINATION
  // ============================================
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  previousPage() {
    this.goToPage(this.currentPage - 1);
  }

  changeItemsPerPage(newLimit: number) {
    this.itemsPerPage = newLimit;
    this.currentPage = 1;
    this.loadProducts();
  }

  // ============================================
  // SELECTION
  // ============================================
  toggleSelection(productId: string) {
    if (this.selectedProducts.has(productId)) {
      this.selectedProducts.delete(productId);
    } else {
      this.selectedProducts.add(productId);
    }
  }

  toggleSelectAll() {
    if (this.selectedProducts.size === this.products.length) {
      this.selectedProducts.clear();
    } else {
      this.products.forEach(p => {
        if (p._id) this.selectedProducts.add(p._id);
      });
    }
  }

  isSelected(productId: string): boolean {
    return this.selectedProducts.has(productId);
  }

  get allSelected(): boolean {
    return this.products.length > 0 && 
           this.selectedProducts.size === this.products.length;
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  openCreateModal() {
    this.modalMode = 'create';
    this.currentProduct = this.getEmptyProduct();
    this.showModal = true;
    this.showSuggestions = false;
    this.showAddHsCode = false;
    this.gtinError = '';
    this.productExistsWarning = '';
  }

  openEditModal(product: ProductAdded) {
    this.modalMode = 'edit';
    this.currentProduct = { ...product };
    this.showModal = true;
    this.showSuggestions = false;
    this.showAddHsCode = false;
    this.gtinError = '';
    this.productExistsWarning = '';
  }

  closeModal() {
    this.showModal = false;
    this.currentProduct = this.getEmptyProduct();
    this.errorMessage = '';
    this.showSuggestions = false;
    this.productNameSuggestions = [];
    this.showAddHsCode = false;
    this.newHsCode = { code: '', description: '' };
    this.gtinError = '';
    this.productExistsWarning = '';
  }

  saveProduct() {
    if (this.gtinError) {
      this.errorMessage = 'Please fix GTIN error before saving';
      setTimeout(() => {
        this.errorMessage = '';
        this.safeDetectChanges();
      }, 3000);
      return;
    }

    if (this.productExistsWarning && this.modalMode === 'create') {
      this.errorMessage = 'Product already exists in database';
      setTimeout(() => {
        this.errorMessage = '';
        this.safeDetectChanges();
      }, 3000);
      return;
    }

    if (!this.validateProduct()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    if (this.modalMode === 'create') {
      this.createProduct();
    } else {
      this.updateProduct();
    }
  }

  createProduct() {
    this.apiService.createProductAdded(this.currentProduct).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Product created successfully!';
          this.closeModal();
          this.loadProducts();
          this.loadStatistics();
          setTimeout(() => {
            this.successMessage = '';
            this.safeDetectChanges();
          }, 3000);
        }
        this.isLoading = false;
        this.safeDetectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Error creating product';
        this.isLoading = false;
        console.error('Create product error:', error);
        this.safeDetectChanges();
      }
    });
  }

  updateProduct() {
    if (!this.currentProduct._id) return;

    this.apiService.updateProductAdded(this.currentProduct._id, this.currentProduct).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Product updated successfully!';
          this.closeModal();
          this.loadProducts();
          setTimeout(() => {
            this.successMessage = '';
            this.safeDetectChanges();
          }, 3000);
        }
        this.isLoading = false;
        this.safeDetectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Error updating product';
        this.isLoading = false;
        console.error('Update product error:', error);
        this.safeDetectChanges();
      }
    });
  }

  openDeleteModal(product: ProductAdded) {
    this.productToDelete = product;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  confirmDelete() {
    if (!this.productToDelete?._id) return;

    this.isLoading = true;

    this.apiService.deleteProductAdded(this.productToDelete._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Product deleted successfully!';
          this.closeDeleteModal();
          this.loadProducts();
          this.loadStatistics();
          setTimeout(() => {
            this.successMessage = '';
            this.safeDetectChanges();
          }, 3000);
        }
        this.isLoading = false;
        this.safeDetectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Error deleting product';
        this.isLoading = false;
        console.error('Delete product error:', error);
        this.safeDetectChanges();
      }
    });
  }

  bulkDelete() {
    if (this.selectedProducts.size === 0) {
      this.errorMessage = 'No products selected';
      return;
    }

    if (!confirm(`Delete ${this.selectedProducts.size} selected product(s)?`)) {
      return;
    }

    this.isLoading = true;

    const ids = Array.from(this.selectedProducts);

    this.apiService.bulkDeleteProductsAdded(ids).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `${response.deletedCount} product(s) deleted!`;
          this.selectedProducts.clear();
          this.loadProducts();
          this.loadStatistics();
          setTimeout(() => {
            this.successMessage = '';
            this.safeDetectChanges();
          }, 3000);
        }
        this.isLoading = false;
        this.safeDetectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Error deleting products';
        this.isLoading = false;
        console.error('Bulk delete error:', error);
        this.safeDetectChanges();
      }
    });
  }

  // ============================================
  // VALIDATION
  // ============================================
 validateProduct(): boolean {
  if (!this.currentProduct.name?.trim()) {
    this.errorMessage = 'Product name is required';
    return false;
  }

  if (!this.currentProduct.frenchName?.trim()) {   // ✅ NEW
    this.errorMessage = 'French name is required';
    return false;
  }

  if (this.currentProduct.volumeUnit === 'St') {
    if (this.currentProduct.volumeMl === undefined || this.currentProduct.volumeMl === null) {
      this.currentProduct.volumeMl = 1;
    }
  } else {
    if (!this.currentProduct.volumeMl || this.currentProduct.volumeMl <= 0) {
      this.errorMessage = 'Valid volume/quantity is required';
      return false;
    }
  }

  if (!this.currentProduct.hsCode?.trim()) {
    this.errorMessage = 'HS Code is required';
    return false;
  }

  if (!this.currentProduct.unitBruttoWeightKg || this.currentProduct.unitBruttoWeightKg <= 0) {
    this.errorMessage = 'Valid brutto weight is required';
    return false;
  }

  if (!this.currentProduct.unitNettoWeightKg || this.currentProduct.unitNettoWeightKg <= 0) {
    this.errorMessage = 'Valid netto weight is required';
    return false;
  }

  return true;
}
  // ============================================
  // HELPERS
  // ============================================
 getEmptyProduct(): ProductAdded {
  return {
    name: '',
    frenchName: '',          // ✅ NEW
    volumeMl: 0,
    volumeUnit: 'ml',
    hsCode: '',
    hsDescription: '',
    unitBruttoWeightKg: 0,
    unitNettoWeightKg: 0,
    gtin: '',
    countryOfOrigin: 'DE'
  };
}

  toggleStatistics() {
    this.showStatistics = !this.showStatistics;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getCountryFlag(code: string | undefined): string {
    const flags: { [key: string]: string } = {
      'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
      'PL': '🇵🇱', 'CN': '🇨🇳', 'VN': '🇻🇳', 'NL': '🇳🇱',
      'BE': '🇧🇪', 'AT': '🇦🇹', 'CH': '🇨🇭', 'CZ': '🇨🇿',
      'HU': '🇭🇺', 'RO': '🇷🇴', 'BG': '🇧🇬'
    };
    return flags[code || 'DE'] || '🌍';
  }

  private packagingRatios: { [key: string]: { ratio: number, name: string } } = {
    'cream_jar': { ratio: 1.10, name: 'Cream (Jar)' },
    'bottle': { ratio: 1.15, name: 'Bottle' },
    'tube': { ratio: 1.08, name: 'Tube' },
    'pump': { ratio: 1.12, name: 'Pump Bottle' },
  };

  calculateNettoFromBrutto(packagingType: 'cream_jar' | 'bottle' | 'tube' | 'pump') {
    if (!this.currentProduct.unitBruttoWeightKg || this.currentProduct.unitBruttoWeightKg <= 0) {
      this.errorMessage = 'Please enter brutto weight (kg) first';
      setTimeout(() => {
        this.errorMessage = '';
        this.safeDetectChanges();
      }, 3000);
      return;
    }

    const packagingInfo = this.packagingRatios[packagingType];
    const calculatedNetto = this.currentProduct.unitBruttoWeightKg / packagingInfo.ratio;

    this.currentProduct.unitNettoWeightKg = Math.round(calculatedNetto * 1000) / 1000;

    const packagingPercent = ((packagingInfo.ratio - 1) * 100).toFixed(0);
    this.successMessage = `✅ Netto: ${this.currentProduct.unitNettoWeightKg} kg (${packagingInfo.name}, ~${packagingPercent}% packaging)`;
    setTimeout(() => {
      this.successMessage = '';
      this.safeDetectChanges();
    }, 3000);
  }

  detectPackagingType(productName: string): string {
    const name = productName.toLowerCase();
    
    if (name.includes('cream') || name.includes('creme') || name.includes('balm') || 
        name.includes('butter') || name.includes('mask') || name.includes('peeling')) {
      return 'cream_jar';
    }
    
    if (name.includes('tube') || name.includes('handcreme') || name.includes('hand cream') ||
        name.includes('gesichtscreme') || name.includes('face cream')) {
      return 'tube';
    }
    
    if (name.includes('pump') || name.includes('lotion') || name.includes('milk') ||
        name.includes('serum') || name.includes('dispenser')) {
      return 'pump';
    }
    
    if (name.includes('shampoo') || name.includes('shower') || name.includes('dusch') || 
        name.includes('gel') || name.includes('toner') || name.includes('water') ||
        name.includes('öl') || name.includes('oil')) {
      return 'bottle';
    }
    
    return 'bottle';
  }
}