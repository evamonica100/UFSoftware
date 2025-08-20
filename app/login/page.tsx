'use client';
import { useState } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import Image from 'next/image';
import logo from '../../public/zekindo-logo.png';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    company: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('userEmail', formData.email);
        sessionStorage.setItem('userCompany', formData.company);
        sessionStorage.setItem('userPassword', formData.password);
        
        await loadUserData();
        window.location.href = '/';
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/data/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const result = await response.json();
      if (response.ok && result.data) {
        Object.keys(result.data).forEach(key => {
          if (key !== 'lastSaved') {
            localStorage.setItem(key, JSON.stringify(result.data[key]));
          }
        });
      }
    } catch (error) {
      console.log('No previous data found or failed to load');
    }
  };

  const handleForgotPassword = () => {
    alert("Forgot your password?\n\n" +
          "Please email our support team:\n" +
          "eva.monica@zekindo.co.id\n\n" +
          "Include your email and company name in your request.");
  };

  const handleHelpClick = () => {
    alert("Welcome to Zekindo UF Membrane Calculator!\n\n" +
          "To get started:\n" +
          "1. Enter your registered email/username\n" +
          "2. Enter your company name\n" +
          "3. Enter your password\n" +
          "4. Click Login to access the calculator\n\n" +
          "For support or new account registration:\n" +
          "Email: eva.monica@zekindo.co.id");
  };

  return (
    <div className="min-h-screen bg-blue-900 bg-opacity-80 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-sm sm:max-w-md">
        <div className="flex justify-center mb-4 sm:mb-6">
          <Image 
            src={logo} 
            alt="Zekindo Chemicals Logo" 
            width={180} 
            height={72}
            className="w-auto h-16 sm:h-20"
            style={{ height: 'auto' }} 
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-blue-800">
          Login to Ultrafiltration Membrane Calculator Software
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email/Username
            </label>
            <input
              type="text"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              disabled={isLoading}
              className="w-full px-3 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Enter your email"
              style={{ 
                fontSize: '16px', // Prevents zoom on iOS
                WebkitAppearance: 'none', // Removes iOS styling
                color: '#1f2937' // Ensures text is dark
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              required
              disabled={isLoading}
              className="w-full px-3 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Enter your company name"
              style={{ 
                fontSize: '16px',
                WebkitAppearance: 'none',
                color: '#1f2937'
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              disabled={isLoading}
              className="w-full px-3 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Enter your password"
              style={{ 
                fontSize: '16px',
                WebkitAppearance: 'none',
                color: '#1f2937'
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="mt-4 text-center space-y-2">
          <button 
            onClick={handleForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Forgot Password?
          </button>
          <br />
          <button 
            onClick={handleHelpClick}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Need Help?
          </button>
        </div>
        
        <div className="mt-6 text-center text-xs text-gray-500">
          Need a new account? Email: eva.monica@zekindo.co.id
        </div>
      </div>
    </div>
  );
}
