import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PackService, PackCategory, Pack } from '../pack';

@Component({
  selector: 'app-pack',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pack.html',
  styleUrl: './pack.css',
})
export class PackComponent implements OnInit {
  // Data State
  categories: PackCategory[] = [];
  selectedCategory: PackCategory | null = null;
  packs: Pack[] = [];

  // UI State
  loading = false;
  showCategoryModal = false;
  showPackModal = false;
  showDeleteConfirm = false;

  // Form State
  newCategory = { name: '', description: '' };
  selectedFiles: File[] = [];
  
  // Delete State
  deleteType: 'category' | 'pack' = 'category';
  deleteId = '';

  // Feedback
  successMessage = '';
  errorMessage = '';

  constructor(private packService: PackService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.packService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
      },
      error: () => {
        this.showError('Failed to load categories');
        this.loading = false;
      }
    });
  }

  // --- NAVIGATION METHODS ---
  selectCategory(category: PackCategory): void {
    this.selectedCategory = { ...category };
    this.packs = category.packs ? [...category.packs] : [];
  }

  goBack(): void {
    this.selectedCategory = null;
    this.packs = [];
    this.loadCategories();
  }

  // --- MODAL METHODS (Fixed missing methods) ---
  openCategoryModal(): void {
    this.newCategory = { name: '', description: '' };
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
  }

  openPackModal(): void {
    this.selectedFiles = [];
    this.showPackModal = true;
  }

  closePackModal(): void {
    this.showPackModal = false;
  }

  confirmDelete(type: 'category' | 'pack', id: string): void {
    this.deleteType = type;
    this.deleteId = id;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteId = '';
  }

  // --- ACTION METHODS ---
  createCategory(): void {
    if (!this.newCategory.name.trim()) return;
    this.loading = true;
    this.packService.createCategory(this.newCategory).subscribe({
      next: (category) => {
        this.categories = [...this.categories, category];
        this.closeCategoryModal();
        this.showSuccess('Category created!');
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  createPack(): void {
    if (!this.selectedCategory || this.selectedFiles.length === 0) return;
    const formData = new FormData();
    formData.append('packCategory', this.selectedCategory._id);
    this.selectedFiles.forEach(f => formData.append('images', f));

    this.loading = true;
    this.packService.createPack(formData).subscribe({
      next: (newPack) => {
        this.packs = [newPack, ...this.packs];
        this.closePackModal();
        this.showSuccess('Pack uploaded!');
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  executeDelete(): void {
    this.loading = true;
    if (this.deleteType === 'category') {
      this.packService.deleteCategory(this.deleteId).subscribe({
        next: () => {
          this.categories = this.categories.filter(c => c._id !== this.deleteId);
          this.showDeleteConfirm = false;
          this.loading = false;
        },
        error: () => this.loading = false
      });
    } else {
      this.packService.deletePack(this.deleteId).subscribe({
        next: () => {
          this.packs = this.packs.filter(p => p._id !== this.deleteId);
          this.showDeleteConfirm = false;
          this.loading = false;
        },
        error: () => this.loading = false
      });
    }
  }

  // --- HELPERS ---
  onFilesSelected(event: any): void {
    const files = event.target.files;
    if (files) this.selectedFiles = Array.from(files);
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  showSuccess(m: string) { this.successMessage = m; setTimeout(() => this.successMessage = '', 3000); }
  showError(m: string) { this.errorMessage = m; setTimeout(() => this.errorMessage = '', 3000); }
  getImageUrl(path: string): string { return `http://192.168.1.81:3000/${path}`; }
  formatFileSize(b?: number): string { return b ? (b / 1024).toFixed(1) + ' KB' : '0 KB'; }
  formatDate(d: any): string { return new Date(d).toLocaleDateString(); }
}