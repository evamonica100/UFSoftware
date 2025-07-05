// app/login/page.tsx - Enhanced version of login page
'use client';
import { useState, useEffect } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import Image from 'next/image';
import logo from '../../public/zekindo-logo.png';
import { login, register, isAuthenticated } from '../lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
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

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await login(formData);
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        await register(formData);
        setSuccess('Account created successfully! Redirecting...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleHelpClick = () => {
    const helpText = isLogin 
      ? "Welcome to Zekindo RO Membrane Calculator!\n\n" +
        "To get started:\n" +
        "1. Enter your email/username\n" +
        "2. Enter your company name\n" +
        "3. Enter your password\n" +
        "4. Click Login to access the calculator\n\n" +
        "Don't have an account? Click 'Create Account' below.\n\n" +
        "For support, contact: eva.monica@zekindo.co.id"
      : "Creating a New Account:\n\n" +
        "1. Enter your email address\n" +
        "2. Enter your company name\n" +
        "3. Create a password (min 6 characters)\n" +
        "4. Click 'Create Account'\n\n" +
        "Your calculations will be saved and you can access them anytime!\n\n" +
        "For support, contact: eva.monica@zekindo.co.id";
    
    alert(helpText);
  };

  return (
    <div className="min-h-screen bg-blue-900 bg-opacity-80 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src={logo} alt="Zekindo Chemicals Logo" width={200} height={80} style={{ height: 'auto' }} />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: '#007DB8' }}>
          {isLogin ? 'Login to RO Membrane Calculator' : 'Create Your Account'}
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
              minLength={6}
              placeholder={isLogin ? "Enter your password" : "Create a password (min 6 characters)"}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
          </Button>
        </form>
        
        <div className="mt-4 text-center space-y-2">
          <Button 
            variant="ghost" 
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="text-sm"
          >
            {isLogin ? "Don't have an account? Create one here" : "Already have an account? Login here"}
          </Button>
          
          <Button variant="ghost" onClick={handleHelpClick} className="text-sm">
            Need Help?
          </Button>
        </div>
      </div>
    </div>
  );
}
