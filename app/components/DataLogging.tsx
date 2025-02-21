
'use client';

import React, { useState } from 'react';
import { Input } from './ui/input';

interface LogEntry {
  timestamp: string;
  pressures: {
    feed: number;
    permeate: number;
    concentrate: number;
    dropPerStage: number;
    dropPerFilter: number;
  };
  flows: {
    feed: number;
    permeate: number;
    concentrate: number;
  };
  waterQuality: {
    conductivity: {
      feed: number;
      permeate: number;
      concentrate: number;
    };
    tds: {
      feed: number;
      permeate: number;
      concentrate: number;
    };
    ph: number;
    temperature: number;
  };
}

const calculateTDS = (conductivity: number): number => {
  if (conductivity <= 1) return conductivity * 0.50;
  if (conductivity <= 80) return conductivity * 0.55;
  if (conductivity <= 6000) return conductivity * 0.70;
  return conductivity * 0.75;
};

const DataLogging = () => {
  const [logEntry, setLogEntry] = useState<LogEntry>({
    timestamp: new Date().toISOString(),
    pressures: {
      feed: 0,
      permeate: 0,
      concentrate: 0,
      dropPerStage: 0,
      dropPerFilter: 0
    },
    flows: {
      feed: 0,
      permeate: 0,
      concentrate: 0
    },
    waterQuality: {
      conductivity: {
        feed: 0,
        permeate: 0,
        concentrate: 0
      },
      tds: {
        feed: 0,
        permeate: 0,
        concentrate: 0
      },
      ph: 7,
      temperature: 25
    }
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleInputChange = (category: string, subcategory: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLogEntry(prev => {
      const newEntry = { ...prev };
      if (category === 'pressures') {
        newEntry.pressures[subcategory] = numValue;
      } else if (category === 'flows') {
        newEntry.flows[subcategory] = numValue;
      } else if (category === 'waterQuality') {
        if (subcategory.startsWith('conductivity.')) {
          const field = subcategory.split('.')[1];
          newEntry.waterQuality.conductivity[field] = numValue;
          newEntry.waterQuality.tds[field] = calculateTDS(numValue);
        } else {
          newEntry.waterQuality[subcategory] = numValue;
        }
      }
      return newEntry;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLogs(prev => [...prev, { ...logEntry, timestamp: new Date().toISOString() }]);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Operating Data Logging</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pressure Readings */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">Pressure Readings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(logEntry.pressures).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key.split(/(?=[A-Z])/).join(' ')} (psi)
                </label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleInputChange('pressures', key, e.target.value)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Flow Measurements */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">Flow Measurements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(logEntry.flows).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key.charAt(0).toUpperCase() + key.slice(1)} Flow (gpm)
                </label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleInputChange('flows', key, e.target.value)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Water Quality */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">Water Quality</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['feed', 'permeate', 'concentrate'].map((type) => (
              <div key={type}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {type.charAt(0).toUpperCase() + type.slice(1)} Conductivity (mS/m)
                </label>
                <Input
                  type="number"
                  value={logEntry.waterQuality.conductivity[type]}
                  onChange={(e) => handleInputChange('waterQuality', `conductivity.${type}`, e.target.value)}
                  className="w-full"
                />
                <div className="mt-1 text-sm text-gray-500">
                  TDS: {logEntry.waterQuality.tds[type].toFixed(2)} mg/L
                </div>
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">pH</label>
              <Input
                type="number"
                value={logEntry.waterQuality.ph}
                onChange={(e) => handleInputChange('waterQuality', 'ph', e.target.value)}
                className="w-full"
                min="0"
                max="14"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <Input
                type="number"
                value={logEntry.waterQuality.temperature}
                onChange={(e) => handleInputChange('waterQuality', 'temperature', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Log Data
        </button>
      </form>

      {/* Logged Data Display */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-blue-700 mb-4">Logged Data</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feed Pressure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feed Flow</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feed TDS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temperature</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4">{log.pressures.feed}</td>
                  <td className="px-6 py-4">{log.flows.feed}</td>
                  <td className="px-6 py-4">{log.waterQuality.tds.feed.toFixed(2)}</td>
                  <td className="px-6 py-4">{log.waterQuality.temperature}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataLogging;
