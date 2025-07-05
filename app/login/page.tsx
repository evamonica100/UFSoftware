// app/login/page.tsx - Updated login page with registration disabled
'use client';
import { useState, useEffect } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import Image from 'next/image';
import logo from '../../public/zekindo-logo.png';
import { login, isAuthenticated } from '../../lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    company: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated()) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Basic validation
    if (!formData.email || !formData.company || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      await login(formData);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleHelpClick = () => {
    const helpText = "Welcome to Zekindo RO Membrane Calculator!\n\n" +
      "To get started:\n" +
      "1. Enter your email/username\n" +
      "2. Enter your company name\n" +
      "3. Enter your password\n" +
      "4. Click Login to access the calculator\n\n" +
      "If you don't have access credentials, please contact:\n" +
      "eva.monica@zekindo.co.id\n\n" +
      "Default demo credentials:\n" +
      "Email: demo@company.com\n" +
      "Company: Demo Company\n" +
      "Password: demo123";
    
    alert(helpText);
  };

  const handleForgotPassword = () => {
    const message = "For password reset or account access issues, please contact:\n\n" +
      "Eva Monica\n" +
      "Email: eva.monica@zekindo.co.id\n\n" +
      "Please include:\n" +
      "- Your email address\n" +
      "- Your company name\n" +
      "- Brief description of the issue";
    
    alert(message);
  };

  return (
    <div className="min-h-screen bg-blue-900 bg-opacity-80 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src={logo} alt="Zekindo Chemicals Logo" width={200} height={80} style={{ height: 'auto' }} />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: '#007DB8' }}>
          RO Membrane Calculator
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email/Username</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              disabled={loading}
              placeholder="Enter your email address"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Company</label>
            <Input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              required
              disabled={loading}
              placeholder="Enter your company name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              disabled={loading}
              placeholder="Enter your password"
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </Button>
        </form>
        
        <div className="mt-6 text-center space-y-3">
          <Button 
            variant="ghost" 
            onClick={handleForgotPassword}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Forgot Password?
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleHelpClick} 
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Need Help?
          </Button>
        </div>
        
        {/* Access Request Notice */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 text-center">
            <strong>Need Access?</strong><br/>
            Contact eva.monica@zekindo.co.id to request login credentials
          </p>
        </div>
      </div>
    </div>
  );
}
