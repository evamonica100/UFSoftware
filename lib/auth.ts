// lib/auth.ts - Enhanced authentication with localStorage
export interface User {
  id: string;
  email: string;
  company: string;
  name: string;
  createdAt: string;
  lastLogin: string;
}

export interface UserCredentials {
  email: string;
  company: string;
  password: string;
}

class AuthManager {
  private users: User[] = [];
  private currentUser: User | null = null;

  constructor() {
    this.loadUsers();
    this.loadCurrentUser();
  }

  private loadUsers(): void {
    try {
      const stored = localStorage.getItem('ro_calc_users');
      if (stored) {
        this.users = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.users = [];
    }
  }

  private saveUsers(): void {
    try {
      localStorage.setItem('ro_calc_users', JSON.stringify(this.users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  private loadCurrentUser(): void {
    try {
      const stored = localStorage.getItem('ro_calc_current_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      this.currentUser = null;
    }
  }

  private saveCurrentUser(): void {
    try {
      if (this.currentUser) {
        localStorage.setItem('ro_calc_current_user', JSON.stringify(this.currentUser));
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        localStorage.removeItem('ro_calc_current_user');
        localStorage.removeItem('isAuthenticated');
      }
    } catch (error) {
      console.error('Error saving current user:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private hashPassword(password: string): string {
    // Simple hash for demo - in production use bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  register(credentials: UserCredentials): Promise<User> {
    return new Promise((resolve, reject) => {
      // Check if user already exists
      const existingUser = this.users.find(u => 
        u.email.toLowerCase() === credentials.email.toLowerCase() &&
        u.company.toLowerCase() === credentials.company.toLowerCase()
      );

      if (existingUser) {
        reject(new Error('User already exists with this email and company'));
        return;
      }

      // Create new user
      const user: User = {
        id: this.generateId(),
        email: credentials.email,
        company: credentials.company,
        name: credentials.email.split('@')[0], // Use email prefix as name
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // Store password hash separately (in real app, this would be in secure backend)
      const userAuth = {
        userId: user.id,
        passwordHash: this.hashPassword(credentials.password)
      };

      this.users.push(user);
      this.saveUsers();

      // Save auth info
      const authData = JSON.parse(localStorage.getItem('ro_calc_auth') || '[]');
      authData.push(userAuth);
      localStorage.setItem('ro_calc_auth', JSON.stringify(authData));

      this.currentUser = user;
      this.saveCurrentUser();

      resolve(user);
    });
  }

  login(credentials: UserCredentials): Promise<User> {
    return new Promise((resolve, reject) => {
      // Find user
      const user = this.users.find(u => 
        u.email.toLowerCase() === credentials.email.toLowerCase() &&
        u.company.toLowerCase() === credentials.company.toLowerCase()
      );

      if (!user) {
        reject(new Error('Invalid credentials'));
        return;
      }

      // Check password
      const authData = JSON.parse(localStorage.getItem('ro_calc_auth') || '[]');
      const userAuth = authData.find((a: any) => a.userId === user.id);

      if (!userAuth || userAuth.passwordHash !== this.hashPassword(credentials.password)) {
        reject(new Error('Invalid credentials'));
        return;
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      this.saveUsers();

      this.currentUser = user;
      this.saveCurrentUser();

      resolve(user);
    });
  }

  logout(): void {
    this.currentUser = null;
    this.saveCurrentUser();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  updateUser(updates: Partial<User>): Promise<User> {
    return new Promise((resolve, reject) => {
      if (!this.currentUser) {
        reject(new Error('No user logged in'));
        return;
      }

      const userIndex = this.users.findIndex(u => u.id === this.currentUser!.id);
      if (userIndex === -1) {
        reject(new Error('User not found'));
        return;
      }

      this.users[userIndex] = { ...this.users[userIndex], ...updates };
      this.currentUser = this.users[userIndex];
      
      this.saveUsers();
      this.saveCurrentUser();

      resolve(this.currentUser);
    });
  }
}

export const authManager = new AuthManager();

// Helper functions for components
export const login = (credentials: UserCredentials) => authManager.login(credentials);
export const register = (credentials: UserCredentials) => authManager.register(credentials);
export const logout = () => authManager.logout();
export const getCurrentUser = () => authManager.getCurrentUser();
export const isAuthenticated = () => authManager.isAuthenticated();
export const updateUser = (updates: Partial<User>) => authManager.updateUser(updates);
