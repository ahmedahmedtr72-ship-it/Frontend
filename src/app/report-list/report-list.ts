import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { environment } from '../../environments/environment';

interface ProductAdded {
  _id: string; name: string; frenchName?: string; volumeMl: number; volumeUnit?: string;
  hsCode?: string; hsDescription?: string; unitBruttoWeightKg?: number; unitNettoWeightKg?: number;
  gtin?: string; countryOfOrigin?: string; createdAt?: string;
}

interface GeneratedReport {
  productId: string; productName: string; fileName: string; fileUrl: string;
  generatedAt: Date; sampleDate: string; reportType: 'standard' | 'ph';
}

interface PhModalState {
  open: boolean;
  mode: 'single' | 'batch';
  product?: ProductAdded;
  phMin: string;
  phMax: string;
  densityMin: string;
  densityMax: string;
  isGenerating: boolean;
}

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-list.html',
  styleUrl: './report-list.css',
})
export class ReportList implements OnInit, OnDestroy {
  private API = environment.apiBaseUrl;
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  products: ProductAdded[] = [];
  filteredProducts: ProductAdded[] = [];
  selectedIds: Set<string> = new Set();
  generatedReports: GeneratedReport[] = [];

  isLoading = false;
  isBatchGenerating = false;
  searchQuery = '';
  errorMessage = '';
  successMessage = '';
  activeTab: 'products' | 'reports' = 'products';
  generatingIds: Set<string> = new Set();
  phGeneratingIds: Set<string> = new Set();

  sampleDate: string = new Date().toISOString().split('T')[0];
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 0;

  phModal: PhModalState = {
    open: false, mode: 'single',
    phMin: '', phMax: '',
    densityMin: '', densityMax: '',
    isGenerating: false,
  };

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadProducts();
    this.searchSubject.pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.filterProducts(q));
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadProducts() {
    this.isLoading = true;
    this.errorMessage = '';
    this.http.get<any>(`${this.API}/addedProds?limit=500`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) { this.products = res.data; this.filteredProducts = [...this.products]; this.updatePagination(); }
        this.isLoading = false; this.cd.markForCheck();
      },
      error: () => { this.errorMessage = 'Connection failed — check server status'; this.isLoading = false; this.cd.markForCheck(); }
    });
  }

  onSearch(query: string) { this.searchQuery = query; this.searchSubject.next(query); }

  filterProducts(query: string) {
    const q = query.toLowerCase().trim();
    this.filteredProducts = !q ? [...this.products] : this.products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.gtin && p.gtin.includes(q)) ||
      (p.hsCode && p.hsCode.includes(q)) || (p.countryOfOrigin && p.countryOfOrigin.toLowerCase().includes(q))
    );
    this.currentPage = 1; this.updatePagination(); this.cd.markForCheck();
  }

  updatePagination() { this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage); }

  get pagedProducts(): ProductAdded[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProducts.slice(start, start + this.itemsPerPage);
  }

  get visiblePages(): number[] {
    const range: number[] = [], delta = 2;
    for (let i = Math.max(1, this.currentPage - delta); i <= Math.min(this.totalPages, this.currentPage + delta); i++) range.push(i);
    return range;
  }

  toggleSelect(id: string) { this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id); }
  toggleSelectAll() {
    if (this.selectedIds.size === this.filteredProducts.length) this.selectedIds.clear();
    else this.filteredProducts.forEach(p => this.selectedIds.add(p._id));
  }
  isSelected(id: string) { return this.selectedIds.has(id); }
  get allSelected(): boolean { return this.filteredProducts.length > 0 && this.selectedIds.size === this.filteredProducts.length; }
  get someSelected(): boolean { return this.selectedIds.size > 0 && !this.allSelected; }

  // ── Validation ────────────────────────────────────────────
  get phModalValid(): boolean {
    const phMin = parseFloat(this.phModal.phMin);
    const phMax = parseFloat(this.phModal.phMax);
    const dMin  = parseFloat(this.phModal.densityMin);
    const dMax  = parseFloat(this.phModal.densityMax);
    return (
      !isNaN(phMin) && !isNaN(phMax) && phMin >= 0 && phMax <= 14 && phMin < phMax &&
      !isNaN(dMin)  && !isNaN(dMax)  && dMin > 0 && dMin < dMax
    );
  }

  get phRangeInvalid(): boolean {
    const mn = parseFloat(this.phModal.phMin), mx = parseFloat(this.phModal.phMax);
    return this.phModal.phMin !== '' && this.phModal.phMax !== '' && !isNaN(mn) && !isNaN(mx) && mn >= mx;
  }

  get densityRangeInvalid(): boolean {
    const mn = parseFloat(this.phModal.densityMin), mx = parseFloat(this.phModal.densityMax);
    return this.phModal.densityMin !== '' && this.phModal.densityMax !== '' && !isNaN(mn) && !isNaN(mx) && mn >= mx;
  }

  // ── Standard single ───────────────────────────────────────
  generateSingle(product: ProductAdded) {
    if (this.generatingIds.has(product._id)) return;
    this.generatingIds.add(product._id); this.errorMessage = ''; this.cd.markForCheck();
    this.http.get<any>(`${this.API}/reports/generate/${product._id}?sampleDate=${this.sampleDate}`)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          if (res.success) {
            const report: GeneratedReport = { productId: product._id, productName: product.name, fileName: res.fileName, fileUrl: `${environment.apiBaseUrl.replace(/\/api$/, '')}${res.file}`, generatedAt: new Date(), sampleDate: this.sampleDate, reportType: 'standard' };
            this.generatedReports.unshift(report); this.triggerDownload(report.fileUrl, report.fileName); this.showSuccess(`PDF downloaded: ${product.name}`);
          }
          this.generatingIds.delete(product._id); this.cd.markForCheck();
        },
        error: (err) => { this.errorMessage = err.error?.error || 'Report generation failed'; this.generatingIds.delete(product._id); this.cd.markForCheck(); }
      });
  }

  // ── Standard batch ────────────────────────────────────────
  generateBatch() {
    if (this.selectedIds.size === 0) { this.errorMessage = 'Select at least one product first'; return; }
    this.isBatchGenerating = true; this.errorMessage = '';
    this.http.post<any>(`${this.API}/reports/generate-batch`, { productIds: Array.from(this.selectedIds), sampleDate: this.sampleDate })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          if (res.success) {
            res.reports.forEach((r: any, i: number) => {
              const prod = this.products.find(p => p.name === r.name);
              const report: GeneratedReport = { productId: prod?._id || '', productName: r.name, fileName: r.fileName, fileUrl: `${environment.apiBaseUrl.replace(/\/api$/, '')}${r.file}`, generatedAt: new Date(), sampleDate: this.sampleDate, reportType: 'standard' };
              this.generatedReports.unshift(report);
              setTimeout(() => this.triggerDownload(report.fileUrl, report.fileName), i * 600);
            });
            this.selectedIds.clear(); this.showSuccess(`${res.count} PDF(s) generated & downloaded`); this.activeTab = 'reports';
          }
          this.isBatchGenerating = false; this.cd.markForCheck();
        },
        error: (err) => { this.errorMessage = err.error?.error || 'Batch generation failed'; this.isBatchGenerating = false; this.cd.markForCheck(); }
      });
  }

  // ── pH Modal ──────────────────────────────────────────────
  openPhModalSingle(product: ProductAdded, event: Event) {
    event.stopPropagation();
    this.phModal = { open: true, mode: 'single', product, phMin: '', phMax: '', densityMin: '', densityMax: '', isGenerating: false };
    this.cd.markForCheck();
  }

  openPhModalBatch() {
    if (this.selectedIds.size === 0) { this.errorMessage = 'Select at least one product first'; return; }
    this.phModal = { open: true, mode: 'batch', phMin: '', phMax: '', densityMin: '', densityMax: '', isGenerating: false };
    this.cd.markForCheck();
  }

  closePhModal() { if (this.phModal.isGenerating) return; this.phModal.open = false; this.cd.markForCheck(); }

  confirmPhModal() {
    if (!this.phModalValid || this.phModal.isGenerating) return;
    this.phModal.isGenerating = true; this.cd.markForCheck();
    if (this.phModal.mode === 'single' && this.phModal.product) this.executePhSingle(this.phModal.product);
    else this.executePhBatch();
  }

  private executePhSingle(product: ProductAdded) {
    this.phGeneratingIds.add(product._id);
    this.http.post<any>(`${this.API}/reports/generate-ph/${product._id}`, {
      sampleDate: this.sampleDate,
      phMin: this.phModal.phMin, phMax: this.phModal.phMax,
      densityMin: this.phModal.densityMin, densityMax: this.phModal.densityMax,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          const report: GeneratedReport = { productId: product._id, productName: product.name, fileName: res.fileName, fileUrl: `${environment.apiBaseUrl.replace(/\/api$/, '')}${res.file}`, generatedAt: new Date(), sampleDate: this.sampleDate, reportType: 'ph' };
          this.generatedReports.unshift(report); this.triggerDownload(report.fileUrl, report.fileName); this.showSuccess(`pH Report downloaded: ${product.name}`);
        }
        this.phGeneratingIds.delete(product._id); this.phModal.open = false; this.phModal.isGenerating = false; this.cd.markForCheck();
      },
      error: (err) => { this.errorMessage = err.error?.error || 'pH Report generation failed'; this.phGeneratingIds.delete(product._id); this.phModal.isGenerating = false; this.cd.markForCheck(); }
    });
  }

  private executePhBatch() {
    this.http.post<any>(`${this.API}/reports/generate-ph-batch`, {
      productIds: Array.from(this.selectedIds), sampleDate: this.sampleDate,
      phMin: this.phModal.phMin, phMax: this.phModal.phMax,
      densityMin: this.phModal.densityMin, densityMax: this.phModal.densityMax,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          res.reports.forEach((r: any, i: number) => {
            const prod = this.products.find(p => p.name === r.name);
            const report: GeneratedReport = { productId: prod?._id || '', productName: r.name, fileName: r.fileName, fileUrl: `${environment.apiBaseUrl.replace(/\/api$/, '')}${r.file}`, generatedAt: new Date(), sampleDate: this.sampleDate, reportType: 'ph' };
            this.generatedReports.unshift(report);
            setTimeout(() => this.triggerDownload(report.fileUrl, report.fileName), i * 600);
          });
          this.selectedIds.clear(); this.showSuccess(`${res.count} pH Report(s) generated & downloaded`); this.activeTab = 'reports';
        }
        this.phModal.open = false; this.phModal.isGenerating = false; this.cd.markForCheck();
      },
      error: (err) => { this.errorMessage = err.error?.error || 'pH Batch generation failed'; this.phModal.isGenerating = false; this.cd.markForCheck(); }
    });
  }

  triggerDownload(url: string, fileName: string) {
    const link = document.createElement('a');
    link.href = url; link.download = fileName; link.target = '_blank';
    document.body.appendChild(link); link.click();
    setTimeout(() => document.body.removeChild(link), 200);
  }

  downloadReport(report: GeneratedReport) { this.triggerDownload(report.fileUrl, report.fileName); }
  removeReport(i: number) { this.generatedReports.splice(i, 1); }
  clearAllReports() { this.generatedReports = []; }

  showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => { this.successMessage = ''; this.cd.markForCheck(); }, 4000);
  }

  formatTime(d: Date): string { return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  formatSampleDate(iso: string): string { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; }

  getCategoryLabel(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('antitranspirant') || n.includes('deospray') || n.includes(' deo')) return 'DEODORANT';
    if (n.includes('shampoo')) return 'SHAMPOO';
    if (n.includes('duschgel') || n.includes('dusch')) return 'DUSCHGEL';
    if (n.includes('body lotion') || n.includes('bodylotion')) return 'LOTION';
    if (n.includes('creme') || n.includes('cream')) return 'CREME';
    if (n.includes('lippenstift') || n.includes('lipstick')) return 'LIP';
    if (n.includes('mascara')) return 'MASCARA';
    if (n.includes('parfum') || n.includes('perfume')) return 'PARFUM';
    if (n.includes('gel')) return 'GEL';
    if (n.includes('spray')) return 'SPRAY';
    return 'Cosmetique';
  }

  trackById(_: number, p: ProductAdded) { return p._id; }
  trackByUrl(_: number, r: GeneratedReport) { return r.fileUrl; }
}