// lib/auth.ts - Enhanced authentication with pre-populated users and disabled registration
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
    this.initializeAuthorizedUsers(); // Add authorized users if needed
  }

  private loadUsers(): void {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('ro_calc_users');
        if (stored) {
          this.users = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.users = [];
    }
  }

  private saveUsers(): void {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('ro_calc_users', JSON.stringify(this.users));
      }
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  private loadCurrentUser(): void {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('ro_calc_current_user');
        if (stored) {
          this.currentUser = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      this.currentUser = null;
    }
  }

  private saveCurrentUser(): void {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        if (this.currentUser) {
          localStorage.setItem('ro_calc_current_user', JSON.stringify(this.currentUser));
          localStorage.setItem('isAuthenticated', 'true');
        } else {
          localStorage.removeItem('ro_calc_current_user');
          localStorage.removeItem('isAuthenticated');
        }
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

  // Initialize authorized users on first run
  private initializeAuthorizedUsers(): void {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    // Check if users already exist
    if (this.users.length === 0) {
      console.log('Initializing authorized users...');
      
      // Define your authorized users here
      const authorizedUsers = [
        {
          email: 'eva.monica@zekindo.co.id',
          company: 'Zekindo',
          password: 'admin123',
          name: 'Eva Monica'
        },
        {
          email: 'admin@zekindo.co.id',
          company: 'Zekindo',
          password: 'zekindo2024',
          name: 'Admin'
        },
        {
          email: 'demo@company.com',
          company: 'Demo Company',
          password: 'demo123',
          name: 'Demo User'
        }
        // Add more authorized users here as needed
      ];

      // Create each authorized user
      authorizedUsers.forEach(userData => {
        try {
          const user: User = {
            id: this.generateId(),
            email: userData.email,
            company: userData.company,
            name: userData.name,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };

          // Store password hash separately
          const userAuth = {
            userId: user.id,
            passwordHash: this.hashPassword(userData.password)
          };

          this.users.push(user);

          // Save auth info
          const authData = JSON.parse(localStorage.getItem('ro_calc_auth') || '[]');
          authData.push(userAuth);
          localStorage.setItem('ro_calc_auth', JSON.stringify(authData));

          console.log(`Added authorized user: ${userData.email}`);
        } catch (error) {
          console.error(`Error adding user ${userData.email}:`, error);
        }
      });

      // Save all users
      this.saveUsers();
      console.log(`Initialized ${this.users.length} authorized users`);
    }
  }

  // DISABLED: Registration is now blocked for security
  register(credentials: UserCredentials): Promise<User> {
    return new Promise((resolve, reject) => {
      reject(new Error('Registration is disabled. Please contact your administrator at eva.monica@zekindo.co.id for access.'));
    });
  }

  login(credentials: UserCredentials): Promise<User> {
    return new Promise((resolve, reject) => {
      // Check if we're in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        reject(new Error('Login not available during server-side rendering'));
        return;
      }

      // Find user
      const user = this.users.find(u => 
        u.email.toLowerCase() === credentials.email.toLowerCase() &&
        u.company.toLowerCase() === credentials.company.toLowerCase()
      );

      if (!user) {
        reject(new Error('Invalid credentials. Please contact eva.monica@zekindo.co.id if you need access.'));
        return;
      }

      // Check password
      const authData = JSON.parse(localStorage.getItem('ro_calc_auth') || '[]');
      const userAuth = authData.find((a: any) => a.userId === user.id);

      if (!userAuth || userAuth.passwordHash !== this.hashPassword(credentials.password)) {
        reject(new Error('Invalid credentials. Please check your password.'));
        return;
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      this.saveUsers();

      this.currentUser = user;
      this.saveCurrentUser();

      console.log(`User logged in: ${user.email}`);
      resolve(user);
    });
  }

  logout(): void {
    console.log(`User logged out: ${this.currentUser?.email}`);
    this.currentUser = null;
    this.saveCurrentUser();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    // Return false during server-side rendering
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
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

  // Admin functions (for eva.monica@zekindo.co.id)
  isAdmin(): boolean {
    return this.currentUser?.email === 'eva.monica@zekindo.co.id';
  }

  getAllUsers(): User[] {
    if (!this.isAdmin()) {
      throw new Error('Admin access required');
    }
    return this.users;
  }

  // Manual user addition (admin only)
  addUser(credentials: UserCredentials & { name?: string }): Promise<User> {
    return new Promise((resolve, reject) => {
      if (!this.isAdmin()) {
        reject(new Error('Admin access required'));
        return;
      }

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
        name: credentials.name || credentials.email.split('@')[0],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // Store password hash
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

      resolve(user);
    });
  }

  // Reset all data (admin only - use with caution!)
  resetAllData(): void {
    if (!this.isAdmin()) {
      throw new Error('Admin access required');
    }
    
    localStorage.removeItem('ro_calc_users');
    localStorage.removeItem('ro_calc_auth');
    localStorage.removeItem('ro_calc_current_user');
    localStorage.removeItem('isAuthenticated');
    
    this.users = [];
    this.currentUser = null;
    
    // Reinitialize authorized users
    this.initializeAuthorizedUsers();
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
