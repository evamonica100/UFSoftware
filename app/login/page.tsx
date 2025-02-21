
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (formData.email && formData.company && formData.password) {
      // Set authentication state
      sessionStorage.setItem('isAuthenticated', 'true');
      window.location.href = '/';
    } else {
      alert('Please fill in all fields');
    }
  };

  const handleHelpClick = () => {
    alert("Welcome to Zekindo Scale Indices Calculator!\n\n" +
          "To get started:\n" +
          "1. Enter your email/username\n" +
          "2. Enter your company name\n" +
          "3. Enter your password\n" +
          "4. Click Login to access the calculator\n\n" +
          "For support, contact: corsec@zekindo.co.id");
  };

  return (
    <div className="min-h-screen bg-blue-900 bg-opacity-80 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src={logo} alt="Zekindo Chemicals Logo" width={200} height={80} style={{ height: 'auto' }} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: '#007DB8' }}>Login to RO Membrane Calculator</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email/Username</label>
            <Input
              type="text"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Company</label>
            <Input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={handleHelpClick}>
            Need Help?
          </Button>
        </div>
      </div>
    </div>
  );
}
