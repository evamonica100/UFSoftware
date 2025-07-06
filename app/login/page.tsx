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
        // Store user session data
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('userEmail', formData.email);
        sessionStorage.setItem('userCompany', formData.company);
        sessionStorage.setItem('userPassword', formData.password);
        
        // Load user's saved data
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
          "Please contact our support team at:\n" +
          "eva.monica@zekindo.co.id\n\n" +
          "Include your email and company name in your request.");
  };

  const handleHelpClick = () => {
    alert("Welcome to Zekindo RO Membrane Calculator!\n\n" +
          "To get started:\n" +
          "1. Enter your registered email/username\n" +
          "2. Enter your company name\n" +
          "3. Enter your password\n" +
          "4. Click Login to access the calculator\n\n" +
          "Demo Credentials:\n" +
          "Email: demo@company.com\n" +
          "Company: Demo Company\n" +
          "Password: demo123\n\n" +
          "For support or new account registration:\n" +
          "Contact: eva.monica@zekindo.co.id");
  };

  return (
    <div className="min-h-screen bg-blue-900 bg-opacity-80 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src={logo} alt="Zekindo Chemicals Logo" width={200} height={80} style={{ height: 'auto' }} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: '#007DB8' }}>
          Login to RO Membrane Calculator
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email/Username</label>
            <Input
              type="text"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Company</label>
            <Input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              disabled={isLoading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        
        <div className="mt-4 text-center space-y-2">
          <Button variant="ghost" onClick={handleForgotPassword} className="text-sm">
            Forgot Password?
          </Button>
          <br />
          <Button variant="ghost" onClick={handleHelpClick} className="text-sm">
            Need Help?
          </Button>
        </div>
        
        <div className="mt-6 text-center text-xs text-gray-500">
          Need a new account? Contact: eva.monica@zekindo.co.id
        </div>
      </div>
    </div>
  );
}
