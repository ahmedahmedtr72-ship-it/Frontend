import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(c => c.LoginComponent)
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'pdf-editor',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pdf-editor-component/pdf-editor-component')
        .then(c => c.PdfEditorComponent)
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./products-and-ref/products-and-ref')
        .then(c => c.ProductsAndRef)
  },
  {
    path: 'generated-invoices',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./recent-generated-pdf/recent-generated-pdf')
        .then(c => c.RecentGeneratedPdfComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard/dashboard')
        .then(c => c.Dashboard)
  },
  {
    path: 'report',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./report-list/report-list')
        .then(c => c.ReportList)
  },
  {
    path: 'ingredients',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./take-dm-data/take-dm-data')
        .then(c => c.TakeDmData)
  },
    {
    path: 'bd',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./bd/bd')
        .then(c => c.Bd)
  },
  {
    path: 'packinglist',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./packing-list/packing-list')
        .then(c => c.PackingList)
  },
    {
    path: 'stock',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./stock/stock')
        .then(c => c.Stock)
  }
];
