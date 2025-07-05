// components/AuthNavigation.tsx - Navigation with authentication status
'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { getCurrentUser, logout, isAuthenticated } from '../lib/auth';
import Image from 'next/image';
import logo from '../../public/zekindo-logo.png';

export default function AuthNavigation() {
  const [user, setUser] = useState(getCurrentUser());
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Image 
              src={logo} 
              alt="Zekindo Chemicals Logo" 
              width={120} 
              height={48} 
              style={{ height: 'auto' }} 
            />
            <div>
              <h1 className="text-xl font-semibold" style={{ color: '#007DB8' }}>
                RO Membrane Calculator
              </h1>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <a 
              href="/" 
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Calculator
            </a>
            
            {isAuthenticated() && (
              <>
                <a 
                  href="/dashboard" 
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Dashboard
                </a>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600"
                >
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium">{user.email}</div>
                    <div className="text-xs text-gray-500">{user.company}</div>
                  </div>
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{user.email}</div>
                      <div className="text-gray-500">{user.company}</div>
                    </div>
                    
                    <a
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Dashboard
                    </a>
                    
                    <a
                      href="/"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Calculator
                    </a>
                    
                    <div className="border-t">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/login'}
                >
                  Login
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t bg-gray-50 px-4 py-2">
        <div className="flex space-x-4">
          <a 
            href="/" 
            className="text-gray-700 hover:text-blue-600 font-medium text-sm"
          >
            Calculator
          </a>
          
          {isAuthenticated() && (
            <a 
              href="/dashboard" 
              className="text-gray-700 hover:text-blue-600 font-medium text-sm"
            >
              Dashboard
            </a>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
}

// Authentication Guard Component
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = isAuthenticated();
      setAuthenticated(isAuth);
      setLoading(false);
      
      if (!isAuth) {
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}

// Auto-save hook for calculations
export function useAutoSave(
  data: any, 
  interval: number = 30000 // 30 seconds
) {
  useEffect(() => {
    if (!isAuthenticated() || !data) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        // Import quickSave function
        const { quickSave } = await import('../../lib/projectManager');
        await quickSave({
          name: `Auto-save ${new Date().toLocaleString()}`,
          description: 'Automatically saved calculation',
          customFields: { autoSave: true, data }
        });
        console.log('Auto-saved calculation');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, interval);

    return () => clearInterval(autoSaveInterval);
  }, [data, interval]);
}
