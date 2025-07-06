// app/components/DataManager.tsx
'use client';
import React, { useState } from 'react';
import { Button } from './ui/button';

const DataManager = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const saveData = async () => {
    setIsSaving(true);
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const userPassword = sessionStorage.getItem('userPassword');
      
      if (!userEmail || !userPassword) {
        alert('Please log in again');
        return;
      }

      // Collect all data from localStorage
      const dataToSave: any = {};
      const keys = [
        'operatingData',
        'performanceData', 
        'cleaningData',
        'scalingData',
        'calculatorSettings'
      ];

      keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            dataToSave[key] = JSON.parse(data);
          } catch (e) {
            dataToSave[key] = data;
          }
        }
      });

      const response = await fetch('/api/data/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password: userPassword,
          data: dataToSave
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setLastSaved(new Date().toLocaleString());
        alert('Data saved successfully!');
      } else {
        alert(result.error || 'Save failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const userPassword = sessionStorage.getItem('userPassword');
      
      if (!userEmail || !userPassword) {
        alert('Please log in again');
        return;
      }

      const response = await fetch('/api/data/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password: userPassword
        })
      });

      const result = await response.json();
      
      if (response.ok && result.data) {
        // Load data into localStorage
        Object.keys(result.data).forEach(key => {
          if (key !== 'lastSaved') {
            localStorage.setItem(key, JSON.stringify(result.data[key]));
          }
        });
        
        alert('Data loaded successfully! Please refresh the page to see your data.');
        window.location.reload();
      } else {
        alert(result.error || 'No saved data found');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInfo = () => {
    const email = sessionStorage.getItem('userEmail');
    const company = sessionStorage.getItem('userCompany');
    return { email, company };
  };

  const { email, company } = getUserInfo();

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p><strong>User:</strong> {email}</p>
          <p><strong>Company:</strong> {company}</p>
          {lastSaved && <p><strong>Last Saved:</strong> {lastSaved}</p>}
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={loadData} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Loading...' : 'Load Data'}
          </Button>
          
          <Button 
            onClick={saveData} 
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save Work'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataManager;
