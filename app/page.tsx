'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import logo from '../public/zekindo-logo.png';
import OperatingData from './components/OperatingData'; // Your existing UF Design component
import PerformanceNormalization from './components/PerformanceNormalization'; // New UF Monitoring component
import DataManager from './components/DataManager';

export default function Home() {
  const [activeSection, setActiveSection] = useState('design');
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // Set client-side flag
    setIsClient(true);
    
    // Check authentication only on client side
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      window.location.href = '/login';
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('userCompany');
      sessionStorage.removeItem('userPassword');
      window.location.href = '/login';
    }
  };
  
  // Don't render until we're on client side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-blue-900 bg-opacity-80 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-blue-900 bg-opacity-80 flex flex-col text-black">
      <header className="bg-white text-white p-4 flex items-center justify-between">
        <Image src={logo} alt="Zekindo Chemicals Logo" width={200} height={80} style={{ height: 'auto' }} />
        <div className="flex items-center space-x-4">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveSection('design')}
              className={`px-4 py-2 rounded ${activeSection === 'design' ? 'bg-blue-100 text-blue-900' : 'text-blue-900'}`}
            >
              UF System Design
            </button>
            <button
              onClick={() => setActiveSection('monitoring')}
              className={`px-4 py-2 rounded ${activeSection === 'monitoring' ? 'bg-blue-100 text-blue-900' : 'text-blue-900'}`}
            >
              UF Performance Monitoring
            </button>
            
            {/* Commented out RO sections - can be re-enabled later */}
            {/* 
            <button
              onClick={() => setActiveSection('project')}
              className={`px-4 py-2 rounded ${activeSection === 'project' ? 'bg-blue-100 text-blue-900' : 'text-blue-900'}`}
            >
              Project Details
            </button>
            <button
              onClick={() => setActiveSection('water')}
              className={`px-4 py-2 rounded ${activeSection === 'water' ? 'bg-blue-100 text-blue-900' : 'text-blue-900'}`}
            >
              Feed Water Analysis
            </button>
            <button
              onClick={() => setActiveSection('membrane')}
              className={`px-4 py-2 rounded ${activeSection === 'membrane' ? 'bg-blue-100 text-blue-900' : 'text-blue-900'}`}
            >
              RO Membrane Design
            </button>
            <button
              onClick={() => setActiveSection('operating')}
              className={`px-4 py-2 rounded ${activeSection === 'operating' ? 'bg-blue-100 text-blue-900' : 'text-blue-900'}`}
            >
              RO Membrane Evaluation
            </button>
            */}
          </nav>
          <button 
            onClick={handleLogout}
            className="text-blue-900 hover:text-blue-700"
          >
            Logout
          </button>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <DataManager />
        
        {/* UF System Design Section */}
        {activeSection === 'design' && <OperatingData />}
        
        {/* UF Performance Monitoring Section */}
        {activeSection === 'monitoring' && <PerformanceNormalization />}
        
        {/* Commented out RO sections - easy to re-enable later */}
        {/* 
        {activeSection === 'project' && <ProjectDetails />}
        {activeSection === 'water' && <FeedWaterAnalysis />}
        {activeSection === 'membrane' && <ROMembraneDesign />}
        {activeSection === 'operating' && <OperatingData />}
        */}
      </main>
      
      <footer className="bg-white text-center py-6 mt-8">
        <div className="text-gray-700">
          <p className="font-semibold">Distributed by:</p>
          <p>PT Acme Indonesia</p>
          <p>Head & Marketing Office</p>
          <p>The Prominence Office Tower, 12ᵀᴴ Floor,</p>
          <p>Jl. Jalur Sutera Barat No. 15, Alam Sutera, Tangerang, Indonesia</p>
          <p>Phone: <a href="tel:+62 85974902615" className="text-blue-800">+62 85974902615</a></p>
          <p>Email: <a href="mailto:eva.monica@zekindo.co.id" className="text-blue-800">eva.monica@zekindo.co.id</a></p>
        </div>
      </footer>
    </div>
  );
}
