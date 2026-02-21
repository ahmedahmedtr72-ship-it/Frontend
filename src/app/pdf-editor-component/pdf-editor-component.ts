// pdf-editor.component.ts - COMPLETE SOLUTION
import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { Product } from '../modals/Product';

interface HsCode {
  code: string;
  description: string;
}

interface MissingProductForm {
  name: string;
  volumeMl: number;
  volumeUnit: string;
  hsCode: string;
  hsDescription: string;
  unitBruttoWeightKg: number;
  unitNettoWeightKg: number;
  gtin: string;
  countryOfOrigin: string;
  quantity: number;
  sourcePDF: string;
}

@Component({
  selector: 'app-pdf-editor',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './pdf-editor-component.html',
  styleUrls: ['./pdf-editor-component.css']
})
export class PdfEditorComponent {
  // ============================================
  // STATE
  // ============================================
  products: Product[] = [];
  originalProducts: Product[] = [];
  
  total: number = 0;
  totalNetto: number = 0;
  totalBrutto: number = 0;

  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  uploadProgress: number = 0;

  generatingDelivery: boolean = false;
  generatingInvoice: boolean = false;
  generatingIngredients: boolean = false;

  editingCell: { row: number; field: string } | null = null;
  hasChanges: boolean = false;

  selectedFiles: File[] = [];
  showMetadataForm: boolean = false;
  uploadedPDFsInfo: any[] = [];

  // ✅ ONE-BY-ONE MISSING PRODUCTS
  showMissingProductsModal: boolean = false;
  missingProductsQueue: any[] = [];        // All missing products
  completedMissingProducts: any[] = [];    // Products already added
  currentMissingIndex: number = 0;         // Current index
  currentMissingProduct: MissingProductForm | null = null;
  parsedDataPending: any = null;

  // HS Code management
  hsCodeList: HsCode[] = [];
  showAddHsCode: boolean = false;
  newHsCode: { code: string; description: string } = { code: '', description: '' };

  // Ingredient dates modal
  showIngredientDatesModal: boolean = false;
  ingredientDatesData: Array<{
    gtin: string;
    name: string;
    date: string;
  }> = [];

  metadata = {
    dispatchNumber: `SHIP-${Date.now()}`,
    dispatchDate: new Date().toISOString().split('T')[0],
    generationDate: new Date().toISOString().split('T')[0],
    numberOfCartons: 0,
   totalWeightWithPacking: 0,  // user enters the scale reading

    numberOfPallets: 1,
    showPallets: true,
    transportType: 'Truck',
    fromLocation: 'DE - 67547 Worms - Hafenstraße 44',
    toLocation: 'TN - 5000 Monastir - Rue Chahine 17 Cité Erina',
    deliveryTerms: 'EXW Worms',
    paymentTerms: 'transfer'
  };

  constructor(
    private apiService: ApiService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadHsCodes();
  }

  // ============================================
  // HS CODE LOADING
  // ============================================
  loadHsCodes() {
    this.apiService.getHsCodes().subscribe({
      next: (response) => {
        if (response.success) {
          this.hsCodeList = response.data;
        }
      },
      error: (error) => {
        console.error('Load HS codes error:', error);
      }
    });
  }

  // Group HS codes by category
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
      } else if (code.startsWith('330720') || code.startsWith('330741')) {
        groups['Deodorants & Hygiene'].push(hsCode);
      } else if (code.startsWith('3306')) {
        groups['Oral Care'].push(hsCode);
      } else if (code.startsWith('3304')) {
        groups['Makeup'].push(hsCode);
      } else if (code.startsWith('3303')) {
        groups['Perfumes & Fragrances'].push(hsCode);
      } else if (code.startsWith('5601')) {
        groups['Cotton & Accessories'].push(hsCode);
      } else if (hsCode.description.toLowerCase().includes('wipe')) {
        groups['Wet Wipes & Cleansing'].push(hsCode);
      } else if (code.startsWith('3808')) {
        groups['Hand Sanitizers'].push(hsCode);
      } else if (code.startsWith('3301')) {
        groups['Essential Oils & Aromatherapy'].push(hsCode);
      } else {
        groups['Other'].push(hsCode);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }

  // ============================================
  // FILE UPLOAD
  // ============================================
  onMultipleFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    const pdfFiles = files.filter(f => f.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins un fichier PDF';
      return;
    }

    if (pdfFiles.length !== files.length) {
      this.errorMessage = `${files.length - pdfFiles.length} fichier(s) ignoré(s) (non-PDF)`;
    }

    this.selectedFiles = pdfFiles;
    this.showMetadataForm = true;
    this.successMessage = `${pdfFiles.length} fichier(s) PDF sélectionné(s)`;
    this.cd.detectChanges();
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
    if (this.selectedFiles.length === 0) {
      this.showMetadataForm = false;
      this.successMessage = '';
    }
  }

  uploadMultipleFiles() {
    if (this.selectedFiles.length === 0) {
      this.errorMessage = 'Aucun fichier sélectionné';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.uploadProgress = 0;

    const formData = new FormData();
    this.selectedFiles.forEach(file => formData.append('files', file));

    this.uploadProgress = 30;

    this.apiService.parseMultiplePDFs(formData).subscribe({
      next: (response) => {
        this.uploadProgress = 100;

        if (response.success && response.data) {
          if (response.needsReview && response.missingProducts?.length > 0) {
            // ✅ Start one-by-one product addition workflow
            this.missingProductsQueue = response.missingProducts;
            this.completedMissingProducts = [];
            this.parsedDataPending = response.data;
            this.uploadedPDFsInfo = response.uploadedPDFs || [];
            this.currentMissingIndex = 0;
            
            // Initialize first product form
            this.loadNextMissingProduct();
            
            this.showMissingProductsModal = true;
            this.isLoading = false;
            this.cd.detectChanges();
            return;
          }

          this.loadParsedData(response);
        }

        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Erreur lors du traitement des PDFs';
        console.error('Upload error:', error);
        this.cd.detectChanges();
      }
    });
  }

  // ============================================
  // ✅ ONE-BY-ONE MISSING PRODUCTS HANDLING
  // ============================================
  
  loadNextMissingProduct() {
    if (this.currentMissingIndex < this.missingProductsQueue.length) {
      const mp = this.missingProductsQueue[this.currentMissingIndex];
      
      this.currentMissingProduct = {
        name: mp.name,
        volumeMl: mp.volumeMl || 0,
        volumeUnit: 'ml',
        hsCode: '',
        hsDescription: '',
        unitBruttoWeightKg: 0,
        unitNettoWeightKg: 0,
        gtin: mp.gtin || '',
        countryOfOrigin: mp.countryOfOrigin || 'DE',
        quantity: mp.quantity || 1,
        sourcePDF: mp.sourcePDF || ''
      };
      
      this.cd.detectChanges();
    } else {
      // All products added - save to database
      this.saveAllMissingProducts();
    }
  }

  saveCurrentAndNext() {
    if (!this.validateCurrentProduct()) {
      return;
    }

    // Add to completed list
    this.completedMissingProducts.push({ ...this.currentMissingProduct });
    
    this.successMessage = `✅ Produit ${this.currentMissingIndex + 1}/${this.missingProductsQueue.length} enregistré`;
    setTimeout(() => this.successMessage = '', 2000);

    // Move to next product
    this.currentMissingIndex++;
    this.loadNextMissingProduct();
  }

  skipCurrentProduct() {
    this.successMessage = `⏭️ Produit ignoré`;
    setTimeout(() => this.successMessage = '', 2000);
    
    this.currentMissingIndex++;
    this.loadNextMissingProduct();
  }

  validateCurrentProduct(): boolean {
    if (!this.currentMissingProduct) return false;

    if (!this.currentMissingProduct.name?.trim()) {
      this.errorMessage = 'Le nom du produit est obligatoire';
      return false;
    }

    if (this.currentMissingProduct.volumeUnit === 'St') {
      if (this.currentMissingProduct.volumeMl === undefined || this.currentMissingProduct.volumeMl === null) {
        this.currentMissingProduct.volumeMl = 1;
      }
    } else {
      if (!this.currentMissingProduct.volumeMl || this.currentMissingProduct.volumeMl <= 0) {
        this.errorMessage = 'Le volume/quantité est obligatoire';
        return false;
      }
    }

    if (!this.currentMissingProduct.hsCode?.trim()) {
      this.errorMessage = 'Le code HS est obligatoire';
      return false;
    }

    if (!this.currentMissingProduct.unitBruttoWeightKg || this.currentMissingProduct.unitBruttoWeightKg <= 0) {
      this.errorMessage = 'Le poids brut est obligatoire';
      return false;
    }

    if (!this.currentMissingProduct.unitNettoWeightKg || this.currentMissingProduct.unitNettoWeightKg <= 0) {
      this.errorMessage = 'Le poids net est obligatoire';
      return false;
    }

    this.errorMessage = '';
    return true;
  }

  saveAllMissingProducts() {
    if (this.completedMissingProducts.length === 0) {
      this.errorMessage = 'Aucun produit à enregistrer';
      return;
    }

    this.isLoading = true;

    this.apiService.saveProductWeights(this.completedMissingProducts).subscribe({
      next: (saveResponse) => {
        if (saveResponse.success) {
          this.successMessage = `✅ ${saveResponse.savedCount} produit(s) ajouté(s) à la base de données`;
          
          // Recalculate weights for all products
          this.recalculateProductWeights();
          
          // Load parsed data and close modal
          this.loadParsedData({
            data: this.parsedDataPending,
            uploadedPDFs: this.uploadedPDFsInfo
          });
          
          this.showMissingProductsModal = false;
          this.missingProductsQueue = [];
          this.completedMissingProducts = [];
          this.currentMissingProduct = null;
          this.parsedDataPending = null;
        } else {
          this.errorMessage = 'Erreur lors de l\'enregistrement des produits';
        }
        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Erreur lors de l\'enregistrement des produits';
        console.error('Save error:', error);
        this.cd.detectChanges();
      }
    });
  }

  recalculateProductWeights() {
    if (!this.parsedDataPending || !this.parsedDataPending.products) return;

    this.parsedDataPending.products.forEach((product: any) => {
      const completedProduct = this.completedMissingProducts.find(mp => 
        mp.name === product.name && mp.volumeMl === product.volumeMl
      );

      if (completedProduct && product.quantity) {
        product.hsCode = completedProduct.hsCode;
        product.hsDescription = completedProduct.hsDescription;
        product.unitBruttoWeightKg = completedProduct.unitBruttoWeightKg;
        product.unitNettoWeightKg = completedProduct.unitNettoWeightKg;
        product.bruttoWeight = +(completedProduct.unitBruttoWeightKg * product.quantity).toFixed(3);
        product.nettoWeight = +(completedProduct.unitNettoWeightKg * product.quantity).toFixed(3);
        product.countryOfOrigin = { abbr: completedProduct.countryOfOrigin };
        product.status = 'completed';
      }
    });

    this.parsedDataPending.totalNetto = this.parsedDataPending.products.reduce(
      (sum: number, p: any) => sum + (p.nettoWeight || 0), 
      0
    );
    this.parsedDataPending.totalBrutto = this.parsedDataPending.products.reduce(
      (sum: number, p: any) => sum + (p.bruttoWeight || 0), 
      0
    );
  }

  cancelMissingProducts() {
    this.showMissingProductsModal = false;
    this.missingProductsQueue = [];
    this.completedMissingProducts = [];
    this.currentMissingProduct = null;
    this.parsedDataPending = null;
    this.isLoading = false;
    this.errorMessage = 'Traitement annulé';
  }

  // ============================================
  // NETTO WEIGHT CALCULATION
  // ============================================
  
  private packagingRatios: { [key: string]: { ratio: number, name: string } } = {
    'cream_jar': { ratio: 1.10, name: 'Cream (Jar)' },
    'bottle': { ratio: 1.15, name: 'Bottle' },
    'tube': { ratio: 1.08, name: 'Tube' },
    'pump': { ratio: 1.12, name: 'Pump Bottle' },
  };

  calculateNettoFromBrutto(packagingType: 'cream_jar' | 'bottle' | 'tube' | 'pump') {
    if (!this.currentMissingProduct) return;
    
    if (!this.currentMissingProduct.unitBruttoWeightKg || this.currentMissingProduct.unitBruttoWeightKg <= 0) {
      this.errorMessage = 'Veuillez entrer le poids brut d\'abord';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    const packagingInfo = this.packagingRatios[packagingType];
    const calculatedNetto = this.currentMissingProduct.unitBruttoWeightKg / packagingInfo.ratio;

    this.currentMissingProduct.unitNettoWeightKg = Math.round(calculatedNetto * 1000) / 1000;

    const packagingPercent = ((packagingInfo.ratio - 1) * 100).toFixed(0);
    this.successMessage = `✅ Netto: ${this.currentMissingProduct.unitNettoWeightKg} kg (${packagingInfo.name}, ~${packagingPercent}% emballage)`;
    setTimeout(() => this.successMessage = '', 3000);
    
    this.cd.detectChanges();
  }

  // ============================================
  // HS CODE MANAGEMENT
  // ============================================
  
  onHsCodeChange(code: string) {
    if (!this.currentMissingProduct) return;
    
    const hsCode = this.hsCodeList.find(hs => hs.code === code);
    if (hsCode) {
      this.currentMissingProduct.hsDescription = hsCode.description;
      this.cd.detectChanges();
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
      this.errorMessage = 'Veuillez entrer le code HS et la description';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    const exists = this.hsCodeList.find(hs => hs.code === this.newHsCode.code);
    if (exists) {
      this.errorMessage = 'Ce code HS existe déjà';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.hsCodeList.push({
      code: this.newHsCode.code,
      description: this.newHsCode.description
    });

    if (this.currentMissingProduct) {
      this.currentMissingProduct.hsCode = this.newHsCode.code;
      this.currentMissingProduct.hsDescription = this.newHsCode.description;
    }

    this.successMessage = '✅ Code HS ajouté!';
    this.showAddHsCode = false;
    this.newHsCode = { code: '', description: '' };
    setTimeout(() => this.successMessage = '', 3000);
    this.cd.detectChanges();
  }

  loadParsedData(response: any) {
    this.products = [...response.data.products];
    this.originalProducts = JSON.parse(JSON.stringify(response.data.products));
    this.total = response.data.total;
    this.totalNetto = response.data.totalNetto;
    this.totalBrutto = response.data.totalBrutto;
    this.uploadedPDFsInfo = response.uploadedPDFs;
    
    this.successMessage = `${this.products.length} produits extraits de ${response.uploadedPDFs?.length || 1} PDF(s)`;
    this.cd.detectChanges();
  }

  // ============================================
  // EDITING
  // ============================================
  startEdit(rowIndex: number, field: string) {
    this.editingCell = { row: rowIndex, field };
  }

  stopEdit() {
    this.editingCell = null;
    this.checkForChanges();
    this.recalculateTotals();
  }

  isEditing(rowIndex: number, field: string): boolean {
    return this.editingCell?.row === rowIndex && this.editingCell?.field === field;
  }

  onCellChange() {
    this.hasChanges = true;
  }

  recalculateTotals() {
    this.total = this.products.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    this.totalNetto = this.products.reduce((sum, p) => sum + (p.nettoWeight || 0), 0);
    this.totalBrutto = this.products.reduce((sum, p) => sum + (p.bruttoWeight || 0), 0);
  }

  checkForChanges() {
    this.hasChanges = JSON.stringify(this.products) !== JSON.stringify(this.originalProducts);
  }

  // ============================================
  // PDF GENERATION
  // ============================================
 
  // ============================================
  // INGREDIENT SHEETS
  // ============================================
  generateIngredientSheets() {
    const productsWithGtin = this.products.filter(p => p.gtin);

    if (productsWithGtin.length === 0) {
      this.errorMessage = 'Aucun GTIN trouvé dans les produits.';
      return;
    }

    const defaultDate = new Date().toISOString().split('T')[0];
    this.ingredientDatesData = productsWithGtin
      .filter(p => p.gtin)
      .map(p => ({
        gtin: p.gtin!,
        name: p.name,
        date: defaultDate
      }));

    this.showIngredientDatesModal = true;
    this.cd.detectChanges();
  }

  applyDateToAll() {
    const firstDate = this.ingredientDatesData[0]?.date;
    if (!firstDate) return;

    this.ingredientDatesData.forEach(item => {
      item.date = firstDate;
    });
    this.cd.detectChanges();
  }

  cancelIngredientGeneration() {
    this.showIngredientDatesModal = false;
    this.ingredientDatesData = [];
  }

  confirmIngredientGeneration() {
    const invalidItems = this.ingredientDatesData.filter(item => !item.date);
    
    if (invalidItems.length > 0) {
      this.errorMessage = 'Veuillez renseigner une date pour tous les produits';
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const invalidDates = this.ingredientDatesData.filter(item => !dateRegex.test(item.date));
    
    if (invalidDates.length > 0) {
      this.errorMessage = 'Format de date invalide. Utilisez YYYY-MM-DD';
      return;
    }

    this.showIngredientDatesModal = false;
    this.generatingIngredients = true;
    this.errorMessage = '';

    this.apiService.generateIngredientZip({
      products: this.ingredientDatesData.map(item => ({
        gtin: item.gtin,
        date: item.date
      }))
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ingredient-sheets-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.successMessage = `ZIP généré avec ${this.ingredientDatesData.length} fiche(s) d'ingrédient !`;
        this.generatingIngredients = false;
        this.ingredientDatesData = [];
        this.cd.detectChanges();
      },
      error: (error) => {
        this.generatingIngredients = false;
        this.errorMessage = 'Erreur lors de la génération du ZIP';
        console.error('ZIP generation error:', error);
        this.cd.detectChanges();
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  openInNewTab(url: string, title: string = 'PDF') {
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      newWindow.focus();
    } else {
      this.errorMessage = 'Veuillez autoriser les popups pour ouvrir les PDFs.';
      this.downloadFile(url, title.toLowerCase().replace(/\s+/g, '-'));
    }
  }

  downloadFile(url: string, prefix: string = 'document') {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prefix}_${new Date().getTime()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  previewDeliveryNote(original: boolean = false) {
    this.generateAndOpenPDF('delivery', original, true);
  }

  previewInvoice(original: boolean = false) {
    this.generateAndOpenPDF('invoice', original, true);
  }

  previewBoth(original: boolean = false) {
    this.generateAndOpenPDF('both', original, true);
  }

  downloadDeliveryNote(original: boolean = false) {
    this.generateAndOpenPDF('delivery', original, false);
  }

  downloadInvoice(original: boolean = false) {
    this.generateAndOpenPDF('invoice', original, false);
  }

  downloadBoth(original: boolean = false) {
    this.generateAndOpenPDF('both', original, false);
  }

  resetToOriginal() {
    this.products = JSON.parse(JSON.stringify(this.originalProducts));
    this.recalculateTotals();
    this.hasChanges = false;
    this.successMessage = 'Données restaurées à l\'original';
  }

  resetUpload() {
    this.products = [];
    this.originalProducts = [];
    this.total = 0;
    this.totalNetto = 0;
    this.totalBrutto = 0;
    this.errorMessage = '';
    this.successMessage = '';
    this.uploadProgress = 0;
    this.hasChanges = false;
    this.selectedFiles = [];
    this.showMetadataForm = false;
    this.uploadedPDFsInfo = [];
    this.missingProductsQueue = [];
    this.completedMissingProducts = [];
    this.currentMissingProduct = null;
    this.parsedDataPending = null;
    this.showMissingProductsModal = false;
    this.showIngredientDatesModal = false;
    this.ingredientDatesData = [];
  }

  get totalMissingProducts(): number {
    return this.missingProductsQueue.length;
  }

  get remainingProducts(): number {
    return this.totalMissingProducts - this.currentMissingIndex;
  }
  generatingFrenchDelivery: boolean = false;
generatingFrenchInvoice: boolean = false;

// ✅ Main French PDF generator
generateAndOpenPDF(type: 'delivery' | 'invoice' | 'both', useOriginal: boolean = false, openInNewTab: boolean = true) {
  if (type === 'delivery' || type === 'both') this.generatingDelivery = true;
  if (type === 'invoice'  || type === 'both') this.generatingInvoice  = true;

  this.errorMessage = '';

  // ✅ Only ONE pre-opened window per user gesture
  const preOpenedWindow = openInNewTab ? window.open('', '_blank') : null;

  const dataToSend = {
    data: {
      products: useOriginal ? this.originalProducts : this.products,
      total: this.total,
      totalNetto: this.totalNetto,
      totalBrutto: this.totalBrutto
    },
    type,
    metadata: this.metadata
  };

  this.apiService.generatePDF(dataToSend).subscribe({
    next: (response) => {
      if (response.success) {
        const urls: { url: string; filename: string }[] = [];

        if (response.deliveryNote)
          urls.push({ url: this.apiService.getDownloadUrl(response.deliveryNote), filename: 'delivery-note' });
        if (response.invoice)
          urls.push({ url: this.apiService.getDownloadUrl(response.invoice), filename: 'invoice' });

        if (openInNewTab) {
          // First → pre-opened window
          if (urls[0] && preOpenedWindow) {
            preOpenedWindow.location.href = urls[0].url;
          }
          // Second → anchor trick (avoids popup blocker)
          if (urls[1]) {
            setTimeout(() => {
              const a = document.createElement('a');
              a.href = urls[1].url;
              a.target = '_blank';
              a.rel = 'noopener';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }, 300);
          }
        } else {
          urls.forEach(({ url, filename }) => this.downloadFile(url, filename));
        }

        const docType = type === 'both' ? 'Delivery Note et Invoice' :
                        type === 'delivery' ? 'Delivery Note' : 'Invoice';
        this.successMessage = `${docType} généré(s) avec succès!`;
      } else {
        this.errorMessage = 'Erreur lors de la génération du PDF';
        preOpenedWindow?.close();
      }

      this.generatingDelivery = false;
      this.generatingInvoice  = false;
      this.cd.detectChanges();
    },
    error: (error) => {
      this.generatingDelivery = false;
      this.generatingInvoice  = false;
      this.errorMessage = error.error?.error || 'Erreur lors de la génération du PDF';
      preOpenedWindow?.close();
      console.error('Generation error:', error);
      this.cd.detectChanges();
    }
  });
}

// ============================================
// FRENCH PDF
// ============================================
generateFrenchPDF(type: 'delivery' | 'invoice' | 'both', useOriginal: boolean = true) {
  if (type === 'delivery' || type === 'both') this.generatingFrenchDelivery = true;
  if (type === 'invoice'  || type === 'both') this.generatingFrenchInvoice  = true;

  this.errorMessage = '';
  this.successMessage = '🇫🇷 Traduction en cours...';

  // ✅ Pre-open windows BEFORE async call
  let deliveryWindow: Window | null = null;
  let invoiceWindow: Window | null = null;

  if (type === 'delivery' || type === 'both') {
    deliveryWindow = window.open('', '_blank');
  }
  if (type === 'invoice' || type === 'both') {
    invoiceWindow = window.open('', '_blank');
  }

  const dataToSend = {
    data: {
      products: useOriginal ? this.originalProducts : this.products,
      total: this.total,
      totalNetto: this.totalNetto,
      totalBrutto: this.totalBrutto
    },
    type,
    metadata: this.metadata
  };

  this.apiService.generateFrenchPDF(dataToSend).subscribe({
    next: (response) => {
      if (response.success) {
        if (response.deliveryNote && deliveryWindow) {
          deliveryWindow.location.href = this.apiService.getDownloadUrl(response.deliveryNote);
        }
        if (response.invoice && invoiceWindow) {
          invoiceWindow.location.href = this.apiService.getDownloadUrl(response.invoice);
        }

        const label = type === 'both' ? 'Facture + Bon de livraison' :
                      type === 'invoice' ? 'Facture' : 'Bon de livraison';
        this.successMessage = `🇫🇷 ${label} en français généré(s)!`;
      } else {
        this.errorMessage = 'Erreur lors de la génération FR';
        deliveryWindow?.close();
        invoiceWindow?.close();
      }

      this.generatingFrenchDelivery = false;
      this.generatingFrenchInvoice  = false;
      this.cd.detectChanges();
    },
    error: (error) => {
      this.generatingFrenchDelivery = false;
      this.generatingFrenchInvoice  = false;
      this.errorMessage = error.error?.error || 'Erreur génération FR';
      this.successMessage = '';
      deliveryWindow?.close();
      invoiceWindow?.close();
      console.error('French PDF error:', error);
      this.cd.detectChanges();
    }
  });
}

// ============================================
// NO COUNTRY PDF
// ============================================
generateNoCountryPDF(type: 'delivery' | 'invoice' | 'both', useOriginal: boolean = true) {
  if (type === 'delivery' || type === 'both') this.generatingNcDelivery = true;
  if (type === 'invoice'  || type === 'both') this.generatingNcInvoice  = true;

  this.errorMessage   = '';
  this.successMessage = '⏳ Generating (no country)...';

  // ✅ Pre-open windows BEFORE async call
  let deliveryWindow: Window | null = null;
  let invoiceWindow: Window | null = null;

  if (type === 'delivery' || type === 'both') {
    deliveryWindow = window.open('', '_blank');
  }
  if (type === 'invoice' || type === 'both') {
    invoiceWindow = window.open('', '_blank');
  }

  const dataToSend = {
    data: {
      products: useOriginal ? this.originalProducts : this.products,
      total: this.total,
      totalNetto: this.totalNetto,
      totalBrutto: this.totalBrutto
    },
    type,
    metadata: this.metadata
  };

  this.apiService.generatePdfNoCountry(dataToSend).subscribe({
    next: (response) => {
      if (response.success) {
        if (response.deliveryNote && deliveryWindow) {
          deliveryWindow.location.href = this.apiService.getDownloadUrl(response.deliveryNote);
        }
        if (response.invoice && invoiceWindow) {
          invoiceWindow.location.href = this.apiService.getDownloadUrl(response.invoice);
        }

        const label = type === 'both' ? 'Delivery + Invoice' :
                      type === 'delivery' ? 'Delivery Note' : 'Invoice';
        this.successMessage = `✅ ${label} (no country) generated!`;
      } else {
        this.errorMessage = response.error || 'Generation failed';
        deliveryWindow?.close();
        invoiceWindow?.close();
      }

      this.generatingNcDelivery = false;
      this.generatingNcInvoice  = false;
      this.cd.detectChanges();
    },
    error: (err) => {
      this.generatingNcDelivery = false;
      this.generatingNcInvoice  = false;
      this.errorMessage   = err.error?.error || 'Error generating no-country PDF';
      this.successMessage = '';
      deliveryWindow?.close();
      invoiceWindow?.close();
      this.cd.detectChanges();
    }
  });
}

previewFrenchInvoice()  { this.generateFrenchPDF('invoice',  true); }
previewFrenchDelivery() { this.generateFrenchPDF('delivery', true); }
previewFrenchBoth()     { this.generateFrenchPDF('both',     true); }

generatingNcDelivery: boolean = false;
generatingNcInvoice:  boolean = false;

 

previewNcDelivery() { this.generateNoCountryPDF('delivery', true); }
previewNcInvoice()  { this.generateNoCountryPDF('invoice',  true); }
previewNcBoth()     { this.generateNoCountryPDF('both',     true); }

generatingExcel: boolean = false;

exportToExcel(useOriginal: boolean = true) {
  this.generatingExcel = true;
  this.errorMessage = '';

  const dataToSend = {
    data: {
      products: useOriginal ? this.originalProducts : this.products,
      total: this.total,
      totalNetto: this.totalNetto,
      totalBrutto: this.totalBrutto
    },
    metadata: this.metadata
  };

  this.apiService.exportToExcel(dataToSend.data, dataToSend.metadata).subscribe({
    next: (res) => {
      const url = this.apiService.getDownloadUrl(res.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      this.successMessage = `✅ Excel exporté: ${res.fileName}`;
      this.generatingExcel = false;
      this.cd.detectChanges();
    },
    error: (err) => {
      this.generatingExcel = false;
      this.errorMessage = err.message || 'Erreur lors de l\'export Excel';
      this.cd.detectChanges();
    }
  });
}
}