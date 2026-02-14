import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'pdf-editor',
    loadComponent: () =>
      import('./pdf-editor-component/pdf-editor-component')
        .then(c => c.PdfEditorComponent)
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./products-and-ref/products-and-ref')
        .then(c => c.ProductsAndRef)
  },
  {
    path: 'generated-invoices',
    loadComponent: () =>
      import('./recent-generated-pdf/recent-generated-pdf')
        .then(c => c.RecentGeneratedPdfComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard')
        .then(c => c.Dashboard)
  },
  {
    path: 'pack',
    loadComponent: () =>
      import('./pack/pack')
        .then(c => c.PackComponent)
  },
  {
    path: 'ingredients',
    loadComponent: () =>
      import('./take-dm-data/take-dm-data')
        .then(c => c.TakeDmData)
  },
    {
    path: 'bd',
    loadComponent: () =>
      import('./bd/bd')
        .then(c => c.Bd)
  }
];
