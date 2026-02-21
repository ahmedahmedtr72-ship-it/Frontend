import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  active?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-bar.html',
  styleUrls: ['./side-bar.css']
})
export class SidebarComponent {
  isCollapsed = false;

  navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Tableau de bord', icon: 'dashboard', route: '/dashboard', active: true },
        { label: ' BD', icon: 'bd', route: '/bd' }, 
        { label: 'Édition PDF', icon: 'documents', route: '/pdf-editor' },
        { label: 'Produits & Ref', icon: 'projects', route: '/products' },
        { label: 'factures générées', icon: 'projects', route: '/generated-invoices' },
        { label: 'Nos packs', icon: 'pack', route: '/pack' },
        { label: ' ingrédients', icon: 'pack', route: '/ingredients' },
        { label: 'Liste de colisage', icon: 'list', route: '/packinglist' },
        { label: 'Stock', icon: 'stock', route: '/stock' },

      ]
    }
  ];

  user = {
    name: 'Tahri Company ',
    role: 'Administrator',
    initials: 'Mr'
  };

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  getIconSvg(iconName: string): string {
    const icons: { [key: string]: string } = {
      dashboard: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="6" height="6" rx="1"/>
        <rect x="11" y="3" width="6" height="6" rx="1"/>
        <rect x="3" y="11" width="6" height="6" rx="1"/>
        <rect x="11" y="11" width="6" height="6" rx="1"/>
      </svg>`,
      home: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 7L10 3L17 7V15C17 15.5304 16.7893 16.0391 16.4142 16.4142C16.0391 16.7893 15.5304 17 15 17H5C4.46957 17 3.96086 16.7893 3.58579 16.4142C3.21071 16.0391 3 15.5304 3 15V7Z"/>
        <path d="M7 17V9H13V17"/>
      </svg>`,
      activity: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 17C13.866 17 17 13.866 17 10C17 6.13401 13.866 3 10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17Z"/>
        <path d="M10 7V10L12 12"/>
      </svg>`,
      projects: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 7L10 3L3 7L10 11L17 7Z"/>
        <path d="M3 12L10 16L17 12"/>
        <path d="M3 7L10 11L17 7"/>
      </svg>`,
      documents: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 5H17V15C17 15.5304 16.7893 16.0391 16.4142 16.4142C16.0391 16.7893 15.5304 17 15 17H5C4.46957 17 3.96086 16.7893 3.58579 16.4142C3.21071 16.0391 3 15.5304 3 15V5Z"/>
        <path d="M3 5V3H17V5"/>
        <path d="M7 9H13"/>
        <path d="M7 13H13"/>
      </svg>`,
      team: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="10" cy="7" r="4"/>
        <path d="M3 17C3 14.2386 5.68629 12 9 12H11C14.3137 12 17 14.2386 17 17"/>
      </svg>`,
      settings: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="10" cy="10" r="3"/>
        <path d="M16.5 10C16.5 10.3 16.4 10.6 16.3 10.9L17.9 12.1C18 12.2 18.1 12.3 18 12.5L16.5 15C16.4 15.2 16.2 15.2 16 15.1L14.1 14.4C13.7 14.7 13.2 15 12.7 15.2L12.4 17.2C12.4 17.4 12.2 17.5 12 17.5H9C8.8 17.5 8.6 17.4 8.6 17.2L8.3 15.2C7.8 15 7.3 14.7 6.9 14.4L5 15.1C4.8 15.2 4.6 15.2 4.5 15L3 12.5C2.9 12.3 3 12.2 3.1 12.1L4.7 10.9C4.6 10.6 4.5 10.3 4.5 10C4.5 9.7 4.6 9.4 4.7 9.1L3.1 7.9C3 7.8 2.9 7.7 3 7.5L4.5 5C4.6 4.8 4.8 4.8 5 4.9L6.9 5.6C7.3 5.3 7.8 5 8.3 4.8L8.6 2.8C8.6 2.6 8.8 2.5 9 2.5H12C12.2 2.5 12.4 2.6 12.4 2.8L12.7 4.8C13.2 5 13.7 5.3 14.1 5.6L16 4.9C16.2 4.8 16.4 4.8 16.5 5L18 7.5C18.1 7.7 18 7.8 17.9 7.9L16.3 9.1C16.4 9.4 16.5 9.7 16.5 10Z"/>
      </svg>`,
      help: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="10" cy="10" r="7"/>
        <path d="M10 6V10L13 13"/>
      </svg>`
    };
    return icons[iconName] || '';
  }
}