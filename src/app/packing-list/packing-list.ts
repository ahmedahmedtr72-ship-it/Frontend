import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PackingListService } from '../packing-list';
 
// ── Interfaces ───────────────────────────────────────────────────────────────

interface StockProduct {
    productId: string;
    name: string;
    frenchName: string;
    volumeMl: number;
    volumeUnit: string;
    unitBruttoWeightKg: number;
    unitNettoWeightKg: number;
    gtin: string | null;
    hsCode: string | null;
    countryOfOrigin: string;
    totalStock: number;
    reservedStock: number;   // qty used in OTHER sendungen
    availableStock: number;  // totalStock - reservedStock (excluding current edit)
}

interface CartItem {
    productId: string;
    name: string;
    frenchName: string;
    volumeMl: number;
    volumeUnit: string;
    unitBruttoWeightKg: number;
    unitNettoWeightKg: number;
    gtin: string | null;
    quantity: number;
}

interface PackingListRecord {
    _id: string;
    sendungNum: string;
    uploadedPdfFilename?: string;
    products: any[];
    quantities: number[];
    totalBrutto: number;
    totalNetto: number;
    createdAt: string;
    selected?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-packing-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './packing-list.html',
    styleUrl: './packing-list.css'
})
export class PackingList implements OnInit {

    // ── State ──────────────────────────────────────────────────────────────
    packingLists: PackingListRecord[] = [];

    // All products with stock (loaded from backend)
    allStockProducts: StockProduct[] = [];
    // Filtered list shown in the modal (search subset of allStockProducts)
    filteredStockProducts: StockProduct[] = [];

    // Current sendung being built
    currentSendungNum: string  = '';
    currentItems: CartItem[]   = [];   // the "cart"
    productSearch: string      = '';
    isEditMode: boolean        = false;
    editingSendungId: string | null = null;

    // UI flags
    isLoading: boolean      = false;
    isLoadingStock: boolean = false;
    isSaving: boolean       = false;
    isGenerating: boolean   = false;
    showCreateModal: boolean = false;

    // Messages
    errorMessage: string   = '';
    successMessage: string = '';
    loadingMessage: string = 'Loading...';

    constructor(
        private svc: PackingListService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadPackingLists();
    }
 addAll(p: StockProduct) {
    const available = p.availableStock;
    if (available <= 0) return;
    const existing = this.currentItems.find(i => i.productId === p.productId);
    if (existing) {
      existing.quantity = available;
    } else {
      this.currentItems.push({
        productId: p.productId,
        name: p.name,
        frenchName: p.frenchName,
        volumeMl: p.volumeMl,
        volumeUnit: p.volumeUnit,
        unitBruttoWeightKg: p.unitBruttoWeightKg,
        unitNettoWeightKg: p.unitNettoWeightKg,
        gtin: p.gtin,
        quantity: available
      });
    }
    this.cd.detectChanges();
  }
    // ── Load packing lists ─────────────────────────────────────────────────

    loadPackingLists() {
        this.isLoading = true;
        this.loadingMessage = 'Loading packing lists...';
        this.svc.getAllPackingLists().subscribe({
            next: (r) => {
                this.packingLists = (r.data || []).map((pl: PackingListRecord) => ({ ...pl, selected: false }));
                this.isLoading = false;
                this.cd.detectChanges();
            },
            error: () => {
                this.errorMessage = 'Error loading packing lists';
                this.isLoading = false;
                this.cd.detectChanges();
            }
        });
    }

    // ── Load stock products (for modal) ────────────────────────────────────

    loadStockProducts(excludeSendung?: string) {
        this.isLoadingStock = true;
        const qs = excludeSendung ? `?excludeSendung=${encodeURIComponent(excludeSendung)}` : '';
        this.svc.getProductsWithStock(qs).subscribe({
            next: (r) => {
                this.allStockProducts      = r.data || [];
                this.filteredStockProducts = [...this.allStockProducts];
                this.isLoadingStock = false;
                this.cd.detectChanges();
            },
            error: () => {
                this.errorMessage = 'Error loading stock';
                this.isLoadingStock = false;
                this.cd.detectChanges();
            }
        });
    }

    // ── Modal ──────────────────────────────────────────────────────────────

    openCreateModal() {
        this.resetForm();
        this.showCreateModal = true;
        this.loadStockProducts();
        this.cd.detectChanges();
    }

    closeCreateModal() {
        this.showCreateModal = false;
        this.resetForm();
        this.cd.detectChanges();
    }

    resetForm() {
        this.currentSendungNum    = '';
        this.currentItems         = [];
        this.productSearch        = '';
        this.filteredStockProducts = [];
        this.allStockProducts     = [];
        this.isEditMode           = false;
        this.editingSendungId     = null;
        this.errorMessage         = '';
    }

    // ── Search / filter ────────────────────────────────────────────────────

    filterProducts() {
        const q = this.productSearch.toLowerCase().trim();
        if (!q) {
            this.filteredStockProducts = [...this.allStockProducts];
        } else {
            this.filteredStockProducts = this.allStockProducts.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.gtin && p.gtin.toLowerCase().includes(q))
            );
        }
        this.cd.detectChanges();
    }

    clearSearch() {
        this.productSearch         = '';
        this.filteredStockProducts = [...this.allStockProducts];
        this.cd.detectChanges();
    }

    // ── Cart helpers ───────────────────────────────────────────────────────

    /** Returns the quantity currently in cart for a given productId (0 if absent) */
    getItemQty(productId: string): number {
        return this.currentItems.find(i => i.productId === productId)?.quantity ?? 0;
    }

    increment(p: StockProduct) {
        const currentQty = this.getItemQty(p.productId);
        if (currentQty >= p.availableStock) return;  // can't exceed available

        const existing = this.currentItems.find(i => i.productId === p.productId);
        if (existing) {
            existing.quantity++;
        } else {
            this.currentItems.push({
                productId:          p.productId,
                name:               p.name,
                frenchName:         p.frenchName,
                volumeMl:           p.volumeMl,
                volumeUnit:         p.volumeUnit,
                unitBruttoWeightKg: p.unitBruttoWeightKg,
                unitNettoWeightKg:  p.unitNettoWeightKg,
                gtin:               p.gtin,
                quantity:           1
            });
        }
        this.cd.detectChanges();
    }

    decrement(p: StockProduct) {
        const existing = this.currentItems.find(i => i.productId === p.productId);
        if (!existing) return;

        if (existing.quantity > 1) {
            existing.quantity--;
        } else {
            // Remove entirely when reaching 0
            this.currentItems = this.currentItems.filter(i => i.productId !== p.productId);
        }
        this.cd.detectChanges();
    }

    removeItem(productId: string) {
        this.currentItems = this.currentItems.filter(i => i.productId !== productId);
        this.cd.detectChanges();
    }

    // ── Weight totals for the current cart ────────────────────────────────

    get currentBrutto(): number {
        return this.currentItems.reduce((s, i) => s + i.unitBruttoWeightKg * i.quantity, 0);
    }

    get currentNetto(): number {
        return this.currentItems.reduce((s, i) => s + i.unitNettoWeightKg * i.quantity, 0);
    }

    // ── Save sendung ───────────────────────────────────────────────────────

    saveSendung() {
        if (!this.currentSendungNum.trim()) {
            this.errorMessage = 'Please enter a sendung number';
            this.cd.detectChanges();
            return;
        }
        if (this.currentItems.length === 0) {
            this.errorMessage = 'Please add at least one product';
            this.cd.detectChanges();
            return;
        }

        const payload = {
            sendungNum: this.currentSendungNum.trim(),
            productIds: this.currentItems.map(i => i.productId),
            quantities: this.currentItems.map(i => i.quantity),
        };

        this.isSaving     = true;
        this.errorMessage = '';

        const req$ = this.isEditMode && this.editingSendungId
            ? this.svc.updatePackingList(this.editingSendungId, payload)
            : this.svc.createPackingList(payload);

        req$.subscribe({
            next: (r) => {
                if (r.success) {
                    this.successMessage = `Sendung "${payload.sendungNum}" ${this.isEditMode ? 'updated' : 'saved'}`;
                    this.closeCreateModal();
                    this.loadPackingLists();
                    setTimeout(() => { this.successMessage = ''; this.cd.detectChanges(); }, 3500);
                } else {
                    this.errorMessage = r.error || 'Save failed';
                }
                this.isSaving = false;
                this.cd.detectChanges();
            },
            error: (e) => {
                this.errorMessage = e.error?.error || 'Error saving sendung';
                this.isSaving     = false;
                this.cd.detectChanges();
            }
        });
    }

    // ── Edit sendung ───────────────────────────────────────────────────────

    editSendung(pl: PackingListRecord) {
        this.isEditMode       = true;
        this.editingSendungId = pl._id;
        this.currentSendungNum = pl.sendungNum;
        this.currentItems     = [];

        // Load stock excluding THIS sendung's reservations
        this.isLoadingStock = true;
        this.showCreateModal = true;
        const qs = `?excludeSendung=${encodeURIComponent(pl.sendungNum)}`;

        this.svc.getProductsWithStock(qs).subscribe({
            next: (r) => {
                this.allStockProducts      = r.data || [];
                this.filteredStockProducts = [...this.allStockProducts];

                // Pre-fill cart from existing packing list
                pl.products.forEach((product: any, idx: number) => {
                    const qty       = pl.quantities[idx] || 1;
                    const productId = product._id || product.toString();

                    // Find stock info (to get weight data)
                    const stockProd = this.allStockProducts.find(s => s.productId === productId);

                    this.currentItems.push({
                        productId,
                        name:               product.name               || stockProd?.name        || '',
                        frenchName:         product.frenchName         || stockProd?.frenchName   || '',
                        volumeMl:           product.volumeMl           ?? stockProd?.volumeMl     ?? 0,
                        volumeUnit:         product.volumeUnit         || stockProd?.volumeUnit   || 'ml',
                        unitBruttoWeightKg: product.unitBruttoWeightKg ?? stockProd?.unitBruttoWeightKg ?? 0,
                        unitNettoWeightKg:  product.unitNettoWeightKg  ?? stockProd?.unitNettoWeightKg  ?? 0,
                        gtin:               product.gtin               || stockProd?.gtin         || null,
                        quantity: qty
                    });
                });

                this.isLoadingStock = false;
                this.cd.detectChanges();
            },
            error: () => {
                this.errorMessage   = 'Error loading stock for edit';
                this.isLoadingStock = false;
                this.cd.detectChanges();
            }
        });

        this.cd.detectChanges();
    }

    // ── Table selection ────────────────────────────────────────────────────

    get selectedLists(): PackingListRecord[] {
        return this.packingLists.filter(pl => pl.selected);
    }

    get allSelected(): boolean {
        return this.packingLists.length > 0 && this.packingLists.every(pl => pl.selected);
    }

    toggleSelectAll(event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        this.packingLists.forEach(pl => pl.selected = checked);
        this.cd.detectChanges();
    }

    // ── Combined PDF ───────────────────────────────────────────────────────

    generateCombinedPdf() {
        if (this.selectedLists.length === 0) {
            this.errorMessage = 'Select at least one packing list';
            this.cd.detectChanges();
            return;
        }

        this.isGenerating   = true;
        this.loadingMessage = `Generating combined PDF for ${this.selectedLists.length} sendungen and deducting stock...`;
        this.errorMessage   = '';

        this.svc.generateCombinedPdf({ sendungIds: this.selectedLists.map(pl => pl._id) }).subscribe({
            next: (r) => {
                if (r.success) {
                    window.open(this.svc.getDownloadUrl(r.url), '_blank');
                    this.successMessage = `PDF generated. Stock deducted for ${this.selectedLists.length} sendung(en).`;
                    this.packingLists.forEach(pl => pl.selected = false);
                    this.loadPackingLists();
                    setTimeout(() => { this.successMessage = ''; this.cd.detectChanges(); }, 5000);
                } else {
                    this.errorMessage = r.error || 'PDF generation failed';
                }
                this.isGenerating = false;
                this.cd.detectChanges();
            },
            error: (e) => {
                this.errorMessage = e.error?.error || 'Error generating PDF';
                this.isGenerating = false;
                this.cd.detectChanges();
            }
        });
    }

    // ── Single PDF ─────────────────────────────────────────────────────────

    generateSinglePdf(pl: PackingListRecord) {
        this.svc.generatePackingListPdf(pl._id).subscribe({
            next: (r) => {
                if (r.success) window.open(this.svc.getDownloadUrl(r.url), '_blank');
            },
            error: () => {
                this.errorMessage = 'Error generating PDF';
                this.cd.detectChanges();
            }
        });
    }

    // ── Delete ─────────────────────────────────────────────────────────────

    deletePackingList(id: string) {
        if (!confirm('Delete this packing list? Stock will NOT be restored.')) return;
        this.svc.deletePackingList(id).subscribe({
            next: (r) => {
                if (r.success) {
                    this.successMessage = 'Deleted';
                    this.loadPackingLists();
                    setTimeout(() => { this.successMessage = ''; this.cd.detectChanges(); }, 3000);
                }
            },
            error: () => {
                this.errorMessage = 'Error deleting';
                this.cd.detectChanges();
            }
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    formatDate(d: string): string {
        return new Date(d).toLocaleDateString('fr-FR');
    }

    get grandTotalBrutto(): number {
        return this.packingLists.reduce((s, pl) => s + (pl.totalBrutto || 0), 0);
    }

    get grandTotalNetto(): number {
        return this.packingLists.reduce((s, pl) => s + (pl.totalNetto || 0), 0);
    }
}