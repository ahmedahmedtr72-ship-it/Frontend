import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductW } from '../product-w';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];
  searchQuery: string = '';
  loading: boolean = true;
  error: string = '';
  
  // Stats for dashboard cards
  totalProducts: number = 0;
  avgVolume: number = 0;
  avgWeight: number = 0;
  totalSamples: number = 0;

  // Edit Modal State
  showEditModal: boolean = false;
  editingProduct: any = null;
  editForm: any = {
    name: '',
    volumeMl: 0,
    avgUnitBruttoWeightKg: 0,
    avgUnitNettoWeightKg: 0,
    hsCode: '',
    samples: 1
  };

  // Delete Confirmation
  showDeleteModal: boolean = false;
  deletingProduct: any = null;

  constructor(
    private productService: ProductW,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.error = '';

    this.productService.getAllProducts().subscribe({
      next: (response: any) => {
        console.log('API Response:', response);
        
        // Handle different response structures from the API
        if (response && response.success) {
          this.products = response.data || [];
        } else if (Array.isArray(response)) {
          this.products = response;
        } else if (response && response.data) {
          this.products = response.data;
        } else {
          this.products = [];
        }

        this.filteredProducts = [...this.products];
        this.calculateStats();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load products. Please try again.';
        this.loading = false;
        console.error('Error loading products:', err);
        this.cdr.detectChanges();
      }
    });
  }

  calculateStats(): void {
    this.totalProducts = this.products.length;
    
    if (this.totalProducts > 0) {
      this.avgVolume = this.products.reduce((sum, p) => sum + (p.volumeMl || 0), 0) / this.totalProducts;
      this.avgWeight = this.products.reduce((sum, p) => {
        const weight = p.avgUnitNettoWeightKg ? parseFloat(p.avgUnitNettoWeightKg) : 0;
        return sum + weight;
      }, 0) / this.totalProducts;
      this.totalSamples = this.products.reduce((sum, p) => sum + (p.samples || 0), 0);
    }
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredProducts = [...this.products];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredProducts = this.products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      (product.hsCode && product.hsCode.toLowerCase().includes(query))
    );
  }

  // ============================================
  // EDIT FUNCTIONALITY
  // ============================================

  openEditModal(product: any): void {
    this.editingProduct = { ...product }; // Create a copy
    this.editForm = {
      name: product.name,
      volumeMl: product.volumeMl,
      avgUnitBruttoWeightKg: product.avgUnitBruttoWeightKg,
      avgUnitNettoWeightKg: product.avgUnitNettoWeightKg,
      hsCode: product.hsCode,
      samples: product.samples || 1
    };
    this.showEditModal = true;
    this.cdr.detectChanges();
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingProduct = null;
    this.editForm = {
      name: '',
      volumeMl: 0,
      avgUnitBruttoWeightKg: 0,
      avgUnitNettoWeightKg: 0,
      hsCode: '',
      samples: 1
    };
    
    // Restore body scroll
    document.body.style.overflow = '';
    this.cdr.detectChanges();
  }

  saveProduct(): void {
    if (!this.editingProduct || !this.editingProduct._id) {
      console.error('No product selected for editing');
      return;
    }

    // Validate form
    if (!this.editForm.name || !this.editForm.hsCode) {
      alert('Please fill in all required fields');
      return;
    }

    const savingLoading = true;
    this.cdr.detectChanges();

    this.productService.updateProduct(this.editingProduct._id, this.editForm).subscribe({
      next: (response: any) => {
        console.log('Update successful:', response);
        
        // Get the updated product data
        const updatedProduct = response.data || response;
        
        // Update the product in the local array
        const index = this.products.findIndex(p => p._id === this.editingProduct._id);
        if (index !== -1) {
          // Merge the updated data
          this.products[index] = {
            ...this.products[index],
            ...this.editForm,
            _id: this.editingProduct._id
          };
        }

        // Force update filtered products
        this.filteredProducts = [...this.products];
        if (this.searchQuery.trim()) {
          this.onSearch();
        }
        
        // Recalculate stats
        this.calculateStats();
        
        this.closeEditModal();
        this.showSuccessMessage('Product updated successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating product:', err);
        this.showErrorMessage('Failed to update product. Please try again.');
      }
    });
  }

  // ============================================
  // DELETE FUNCTIONALITY
  // ============================================

  openDeleteModal(product: any): void {
    this.deletingProduct = { ...product }; // Create a copy
    this.showDeleteModal = true;
    this.cdr.detectChanges();
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingProduct = null;
    
    // Restore body scroll
    document.body.style.overflow = '';
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.deletingProduct || !this.deletingProduct._id) {
      console.error('No product selected for deletion');
      return;
    }

    this.productService.deleteProduct(this.deletingProduct._id).subscribe({
      next: (response: any) => {
        console.log('Delete successful:', response);
        
        // Remove the product from the local array
        this.products = this.products.filter(p => p._id !== this.deletingProduct._id);
        
        // Force update filtered products
        this.filteredProducts = [...this.products];
        if (this.searchQuery.trim()) {
          this.onSearch();
        }
        
        // Recalculate stats
        this.calculateStats();
        
        this.closeDeleteModal();
        this.showSuccessMessage('Product deleted successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting product:', err);
        this.showErrorMessage('Failed to delete product. Please try again.');
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  formatWeight(weight: number): string {
    if (weight === null || weight === undefined) return '0.000';
    return parseFloat(weight.toString()).toFixed(3);
  }

  formatVolume(volume: number): string {
    if (volume === null || volume === undefined) return '0';
    return Math.round(volume).toLocaleString();
  }

  showSuccessMessage(message: string): void {
    // You can replace this with a toast notification library
    alert(message);
  }

  showErrorMessage(message: string): void {
    // You can replace this with a toast notification library
    alert(message);
  }

  // Prevent modal close when clicking inside modal content
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  // TrackBy function for better performance
  trackByProductId(index: number, product: any): any {
    return product._id || index;
  }
}