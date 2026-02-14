import { Component, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface DownloadedPdf {
  gtin: string;
  date: string;
  filename: string;
  downloadedAt: Date;
}

@Component({
  selector: 'app-take-dm-data',
  imports: [FormsModule, CommonModule],
  templateUrl: './take-dm-data.html',
  styleUrl: './take-dm-data.css',
})
export class TakeDmData {
  gtin: string = '';
  date: string = '';
  loading = false;
  previousPdfs: DownloadedPdf[] = [];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef  // ADD THIS
  ) {
    this.loadPreviousPdfs();
  }

  downloadPdf() {
    if (!this.gtin || !this.date) {
      alert('Veuillez saisir le GTIN et la date');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges(); // FORCE UPDATE UI

    this.api.takeDmPdf(this.gtin, this.date).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const filename = `dm_product_${this.gtin}_${this.date}.pdf`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.addToHistory(this.gtin, this.date, filename);
        this.gtin = '';
        this.date = '';
        
        this.loading = false;
        this.cdr.detectChanges(); // FORCE UPDATE UI
      },
      error: (err) => {
        alert(err.message || 'Erreur lors de la génération du PDF');
        this.loading = false;
        this.cdr.detectChanges(); // FORCE UPDATE UI
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges(); // FORCE UPDATE UI
      }
    });
  }

  addToHistory(gtin: string, date: string, filename: string) {
    this.previousPdfs.unshift({ gtin, date, filename, downloadedAt: new Date() });
    if (this.previousPdfs.length > 20) this.previousPdfs = this.previousPdfs.slice(0, 20);
    localStorage.setItem('previousPdfs', JSON.stringify(this.previousPdfs));
  }

  loadPreviousPdfs() {
    const saved = localStorage.getItem('previousPdfs');
    if (saved) {
      this.previousPdfs = JSON.parse(saved).map((pdf: any) => ({
        ...pdf,
        downloadedAt: new Date(pdf.downloadedAt)
      }));
    }
  }

  redownloadPdf(pdf: DownloadedPdf) {
    this.gtin = pdf.gtin;
    this.date = pdf.date;
    this.downloadPdf();
  }

  clearHistory() {
    if (confirm('Voulez-vous vraiment effacer l\'historique ?')) {
      this.previousPdfs = [];
      localStorage.removeItem('previousPdfs');
    }
  }
}