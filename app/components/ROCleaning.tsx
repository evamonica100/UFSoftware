
'use client';

import React, { useState, useEffect } from 'react';

const CleaningEvaluation = () => {
  const [performanceData, setPerformanceData] = useState({
    normalizedFlow: '',
    saltPassage: '',
    pressureDrop: ''
  });

  useEffect(() => {
    const operatingData = localStorage.getItem('operatingData');
    if (operatingData) {
      const data = JSON.parse(operatingData);
      if (data.length >= 2) {
        const latest = data[data.length - 1];
        const baseline = data[0];
        setPerformanceData({
          normalizedFlow: ((latest.NQp - baseline.NQp) / baseline.NQp * 100).toFixed(2),
          saltPassage: ((latest.NSR - baseline.NSR) / baseline.NSR * 100).toFixed(2),
          pressureDrop: ((latest.NdP - baseline.NdP) / baseline.NdP * 100).toFixed(2)
        });
      }
    }
  }, []);

  const [tankDimensions, setTankDimensions] = useState({
    numberOfElements: 6,
    elementLength: 40, // inches
    elementDiameter: 4, // inches
    cleaningSolutionVolume: 0,
    tankVolume: 0
  });

  const calculateTankSize = () => {
    // Volume calculation for minimum cleaning solution (allowing for 20% safety factor)
    const elementVolume = Math.PI * Math.pow(tankDimensions.elementDiameter/2, 2) * 
                         tankDimensions.elementLength * tankDimensions.numberOfElements;
    const cleaningSolutionVolume = elementVolume * 5; // 5x element volume
    const tankVolume = cleaningSolutionVolume * 1.2; // 20% safety factor

    setTankDimensions(prev => ({
      ...prev,
      cleaningSolutionVolume: (cleaningSolutionVolume / 231).toFixed(2), // Convert to gallons
      tankVolume: (tankVolume / 231).toFixed(2) // Convert to gallons
    }));
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Performance Evaluation & Cleaning Requirements</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${
          parseFloat(performanceData.normalizedFlow) <= -10 ? 'bg-red-100' : 'bg-green-100'
        }`}>
          <h4 className="font-semibold">Normalized Flow Decline</h4>
          <p className="text-2xl font-bold">{performanceData.normalizedFlow}%</p>
          <p className="text-sm mt-2">
            {parseFloat(performanceData.normalizedFlow) <= -10 
              ? 'Cleaning Required' 
              : 'Within Normal Range'}
          </p>
        </div>

        <div className={`p-4 rounded-lg ${
          parseFloat(performanceData.saltPassage) >= 10 ? 'bg-red-100' : 'bg-green-100'
        }`}>
          <h4 className="font-semibold">Salt Passage Increase</h4>
          <p className="text-2xl font-bold">{performanceData.saltPassage}%</p>
          <p className="text-sm mt-2">
            {parseFloat(performanceData.saltPassage) >= 10 
              ? 'Cleaning Required' 
              : 'Within Normal Range'}
          </p>
        </div>

        <div className={`p-4 rounded-lg ${
          parseFloat(performanceData.pressureDrop) >= 15 ? 'bg-red-100' : 'bg-green-100'
        }`}>
          <h4 className="font-semibold">Pressure Drop Increase</h4>
          <p className="text-2xl font-bold">{performanceData.pressureDrop}%</p>
          <p className="text-sm mt-2">
            {parseFloat(performanceData.pressureDrop) >= 15 
              ? 'Cleaning Required' 
              : 'Within Normal Range'}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Cleaning Tank Sizing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Elements</label>
              <input
                type="number"
                value={tankDimensions.numberOfElements}
                onChange={(e) => setTankDimensions(prev => ({
                  ...prev,
                  numberOfElements: parseInt(e.target.value) || 0
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={calculateTankSize}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Calculate Tank Size
            </button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Results</h4>
            <div className="space-y-2">
              <p>Cleaning Solution Volume: {tankDimensions.cleaningSolutionVolume} gallons</p>
              <p>Recommended Tank Volume: {tankDimensions.tankVolume} gallons</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleaningEvaluation;
