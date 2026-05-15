import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = 'admintahricompany';
  password = 'admintahricompany';
  errorMessage = '';
  isSubmitting = false;

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn) {
      this.router.navigate(['/dashboard']);
    }
  }

  submit(): void {
    this.errorMessage = '';
    this.isSubmitting = true;

    const success = this.auth.login(this.username, this.password);
    if (success) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.errorMessage = 'Nom d’utilisateur ou mot de passe incorrect.';
    this.isSubmitting = false;
  }
}
