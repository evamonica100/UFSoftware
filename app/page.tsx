'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import logo from '../public/zekindo-logo.png';
import ProjectDetails from './components/ProjectDetails';
import ScalingIndicesCalculator from './components/ScalingIndicesCalculator';
import ROCalculator from './components/ROCalculator';
import OperatingData from './components/OperatingData';

export default function Home() {
  const [activeSection, setActiveSection] = useState('project');

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      window.location.href = '/login';
    }
  }, []);

  return (
    <div className="min-h-screen bg-blue-900 bg-opacity-80 flex flex-col text-black">
      <header className="bg-white text-white p-4 flex items-center justify-between">
        <Image src={logo} alt="Zekindo Chemicals Logo" width={200} height={80} style={{ height: 'auto' }} />
        <div className="flex items-center space-x-4">
          <nav className="flex space-x-4">
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
          </nav>
          <button 
            onClick={() => {
              sessionStorage.removeItem('isAuthenticated');
              window.location.href = '/login';
            }}
            className="text-blue-900 hover:text-blue-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {activeSection === 'project' && <ProjectDetails />}
        {activeSection === 'water' && <ScalingIndicesCalculator />}
        {activeSection === 'membrane' && <ROCalculator />}
        {activeSection === 'operating' && <OperatingData />}
      </main>

      <footer className="bg-white text-center py-6 mt-8">
        <div className="text-gray-700">
          <p className="font-semibold">Connect with Us</p>
          <p>PT Zeus Kimiatama Indonesia (ZEKINDO)</p>
          <p>Kantor Pusat & Operasional dan Pabrik 1</p>
          <p>Kawasan Industri Jababeka, Jl.Jababeka IV Blok V Kav. 74-75</p>
          <p>Jawa Barat, Indonesia 17530</p>
          <p>Phone: <a href="tel:+6221 8934922" className="text-blue-800">+6221 8934922</a></p>
          <p>Email: <a href="mailto:corsec@zekindo.co.id" className="text-blue-800">corsec@zekindo.co.id</a></p>
        </div>
      </footer>
    </div>
  );
}