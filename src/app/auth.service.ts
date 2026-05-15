import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storedKey = 'app-authenticated-user';
  private readonly validUsername = 'admintahricompany';
  private readonly validPassword = 'admintahricompany';

  isAuthenticated = signal(false);

  constructor(private router: Router) {
    const stored = localStorage.getItem(this.storedKey);
    this.isAuthenticated.set(stored === this.validUsername);
  }

  login(username: string, password: string): boolean {
    const normalizedUsername = username?.trim().toLowerCase();
    const normalizedPassword = password?.trim();

    if (
      normalizedUsername === this.validUsername &&
      normalizedPassword === this.validPassword
    ) {
      localStorage.setItem(this.storedKey, this.validUsername);
      this.isAuthenticated.set(true);
      return true;
    }

    this.logout();
    return false;
  }

  logout(): void {
    localStorage.removeItem(this.storedKey);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  get isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}
