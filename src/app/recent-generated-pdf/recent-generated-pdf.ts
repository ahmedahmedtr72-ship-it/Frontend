import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface PdfFile {
  _id?: string;
  filename: string;
  url: string;
  path?: string;
  size?: number;
  productsCount?: number;
  total?: number;
  createdAt?: string;
  mtime?: number;
  mtimeISO?: string;
}

interface ApiResponse {
  success: boolean;
  files: PdfFile[];
  error?: string;
}

@Component({
  selector: 'app-recent-generated-pdf',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-generated-pdf.html',
  styleUrl: './recent-generated-pdf.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentGeneratedPdfComponent implements OnInit {
  pdfFiles: PdfFile[] = [];
  loading: boolean = true;
  error: string | null = null;
  private apiUrl = 'http://192.168.1.81:3000/api/outputs';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Start loading immediately
    this.loadPdfFiles();
  }

  loadPdfFiles(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.http.get<ApiResponse>(this.apiUrl).pipe(
      catchError((err) => {
        console.error('Error loading PDFs:', err);
        this.error = 'Error connecting to server: ' + err.message;
        return of({ success: false, files: [], error: err.message });
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.pdfFiles = response.files;
          console.log('PDF files loaded:', this.pdfFiles.length);
        } else {
          this.error = response.error || 'Failed to load PDF files';
        }
        this.cdr.markForCheck();
      }
    });
  }

  openPdf(file: PdfFile): void {
    const url = this.getFullUrl(file.url);
    window.open(url, '_blank');
  }

  downloadPdf(file: PdfFile, event: Event): void {
    event.stopPropagation();
    const url = this.getFullUrl(file.url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFullUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    return `http://192.168.1.81:3000${url}`;
  }

  getFileDate(file: PdfFile): Date | null {
    if (file.createdAt) {
      return new Date(file.createdAt);
    } else if (file.mtimeISO) {
      return new Date(file.mtimeISO);
    } else if (file.mtime) {
      return new Date(file.mtime);
    }
    return null;
  }

  formatDate(file: PdfFile): string {
    const date = this.getFileDate(file);
    if (!date) return 'N/A';
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  refresh(): void {
    this.loadPdfFiles();
  }

  // Track by function for better performance with *ngFor
  trackByFileId(index: number, file: PdfFile): string {
    return file._id || file.filename || index.toString();
  }
}