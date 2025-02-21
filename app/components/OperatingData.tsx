'use client';

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LogEntry {
  date: string;
  feedFlow: number;
  feedPressure: number;
  permeatePressure: number;
  concentratePressure: number;
  permeateFlow: number;
  feedTemp: number;
  feedConductivity: number;
  permeateConductivity: number;
}

interface CalculatedResults {
  days: number;
  dP: number;
  F: number;
  R: number;
  NQp: number;
  NSP: number;
  NSR: number;
  NdP: number;
}

interface TankSizing {
  vesselCount: number;
  elementsPerVessel: number;
  vesselDiameter: number;
  vesselLength: number;
  pipeLength: number;
  pipeDiameter: number;
}

const OperatingData = () => {
  const [currentEntry, setCurrentEntry] = useState<LogEntry>({
    date: new Date().toISOString().split('T')[0],
    feedFlow: 0,
    feedPressure: 0,
    permeatePressure: 0,
    concentratePressure: 0,
    permeateFlow: 0,
    feedTemp: 0,
    feedConductivity: 0,
    permeateConductivity: 0
  });

  const [logs, setLogs] = useState<Array<LogEntry & CalculatedResults>>([]);

  const [tankSizing, setTankSizing] = useState<TankSizing>({
    vesselCount: 10,
    elementsPerVessel: 6,
    vesselDiameter: 8,
    vesselLength: 20,
    pipeLength: 50,
    pipeDiameter: 4
  });

  const [cleaningVolumes, setCleaningVolumes] = useState({
    vesselVolume: 0,
    pipeVolume: 0,
    totalVolume: 0
  });

  const calculateResults = (entry: LogEntry, firstEntry?: LogEntry): CalculatedResults => {
    const startDate = firstEntry ? new Date(firstEntry.date) : new Date(entry.date);
    const currentDate = new Date(entry.date);
    const days = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    const dP = entry.feedPressure - entry.concentratePressure;
    const F = entry.permeateFlow / entry.feedFlow;
    const R = (1 - entry.permeateConductivity / entry.feedConductivity) * 100;

    const TCF = Math.exp(2640 * ((1/298) - (1/(273 + entry.feedTemp))));
    const NQp = entry.permeateFlow / TCF;
    const NSP = entry.feedPressure / TCF;
    const NSR = R / TCF;
    const NdP = dP / TCF;

    return { days, dP, F, R, NQp, NSP, NSR, NdP };
  };

  const handleInputChange = (field: keyof LogEntry, value: string) => {
    setCurrentEntry(prev => ({
      ...prev,
      [field]: field === 'date' ? value : Number(value)
    }));
  };

  const handleAddEntry = () => {
    const firstEntry = logs[0];
    const results = calculateResults(currentEntry, firstEntry);
    setLogs(prev => [...prev, { ...currentEntry, ...results }]);
    setCurrentEntry({
      ...currentEntry,
      date: new Date().toISOString().split('T')[0]
    });
  };

  const calculateCleaningVolumes = () => {
    const CONVERSION_FACTOR = 1 / (144 * 7.48);
    const vesselRadius = tankSizing.vesselDiameter / 2;
    const vesselLengthInches = tankSizing.vesselLength * 12;
    const pipeLengthInches = tankSizing.pipeLength * 12;
    const pipeRadius = tankSizing.pipeDiameter / 2;

    const vesselVolume = Math.PI * Math.pow(vesselRadius, 2) * vesselLengthInches * 
                        tankSizing.vesselCount * CONVERSION_FACTOR;
    const pipeVolume = Math.PI * Math.pow(pipeRadius, 2) * pipeLengthInches * CONVERSION_FACTOR;
    const totalVolume = vesselVolume + pipeVolume;

    setCleaningVolumes({
      vesselVolume: Math.round(vesselVolume),
      pipeVolume: Math.round(pipeVolume),
      totalVolume: Math.round(totalVolume)
    });
  };

  const getRecommendedFlowRate = (diameter: number) => {
    const flowRates = {
      2.5: '3-5 gpm (0.7-1.2 m³/h)',
      4: '8-10 gpm (1.8-2.3 m³/h)',
      6: '16-20 gpm (3.6-4.5 m³/h)',
      8: '30-45 gpm (6.0-10.2 m³/h)'
    };
    return flowRates[diameter as keyof typeof flowRates] || 'N/A';
  };

  const handleTankSizingChange = (field: keyof TankSizing, value: string) => {
    setTankSizing(prev => ({
      ...prev,
      [field]: Number(value)
    }));
  };

  const showCleaningRequirements = () => {
    if (logs.length < 2) {
      alert('Need at least two data points to calculate cleaning requirements');
      return;
    }

    const latest = logs[logs.length - 1];
    const baseline = logs[0];

    const flowDecline = ((latest.NQp - baseline.NQp) / baseline.NQp) * 100;
    const saltPassageIncrease = ((latest.NSR - baseline.NSR) / baseline.NSR) * 100;
    const pressureDropIncrease = ((latest.NdP - baseline.NdP) / baseline.NdP) * 100;

    alert(
      `Cleaning Requirements Analysis:\n\n` +
      `Flow Decline: ${flowDecline.toFixed(2)}% ${flowDecline <= -10 ? '(Cleaning Required)' : ''}\n` +
      `Salt Passage Increase: ${saltPassageIncrease.toFixed(2)}% ${saltPassageIncrease >= 10 ? '(Cleaning Required)' : ''}\n` +
      `Pressure Drop Increase: ${pressureDropIncrease.toFixed(2)}% ${pressureDropIncrease >= 15 ? '(Cleaning Required)' : ''}\n\n` +
      `Cleaning is required when:\n` +
      `• Normalized permeate flow drops 10%\n` +
      `• Normalized salt passage increases 5-10%\n` +
      `• Normalized pressure drop increases 10-15%`
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">RO Membrane Evaluation</h2>

      {/* Input Table */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-4">Input Parameters</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 border">Date</th>
                <th className="px-4 py-2 border">Feed Flow (m³/h)</th>
                <th className="px-4 py-2 border">Feed Press. (bar)</th>
                <th className="px-4 py-2 border">Perm. Press. (bar)</th>
                <th className="px-4 py-2 border">Conc. Press. (bar)</th>
                <th className="px-4 py-2 border">Perm. Flow (m³/h)</th>
                <th className="px-4 py-2 border">Feed Temp. (°C)</th>
                <th className="px-4 py-2 border">Feed Cond. (µS/cm)</th>
                <th className="px-4 py-2 border">Perm. Cond. (µS/cm)</th>
                <th className="px-4 py-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-1 border">
                  <input
                    type="date"
                    value={currentEntry.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="w-full"
                  />
                </td>
                {Object.keys(currentEntry).map(key => {
                  if (key === 'date') return null;
                  return (
                    <td key={key} className="px-2 py-1 border">
                      <input
                        type="number"
                        value={currentEntry[key as keyof LogEntry]}
                        onChange={(e) => handleInputChange(key as keyof LogEntry, e.target.value)}
                        className="w-full"
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 border">
                  <button 
                    onClick={handleAddEntry}
                    className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Results</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 border">Date</th>
                <th className="px-4 py-2 border">Days</th>
                <th className="px-4 py-2 border">Differential Pressure (bar)</th>
                <th className="px-4 py-2 border">Flow Factor (%)</th>
                <th className="px-4 py-2 border">Recovery (%)</th>
                <th className="px-4 py-2 border">Normalized Permeate Flow (m³/h)</th>
                <th className="px-4 py-2 border">Normalized System Pressure (bar)</th>
                <th className="px-4 py-2 border">Normalized Salt Rejection (%)</th>
                <th className="px-4 py-2 border">Normalized Differential Pressure (bar)</th>
                <th className="px-4 py-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 border">{log.date}</td>
                  <td className="px-4 py-2 border">{log.days.toFixed(1)}</td>
                  <td className="px-4 py-2 border">{log.dP.toFixed(2)}</td>
                  <td className="px-4 py-2 border">{(log.F * 100).toFixed(2)}</td>
                  <td className="px-4 py-2 border">{log.R.toFixed(2)}</td>
                  <td className="px-4 py-2 border">{log.NQp.toFixed(2)}</td>
                  <td className="px-4 py-2 border">{log.NSP.toFixed(2)}</td>
                  <td className="px-4 py-2 border">{log.NSR.toFixed(2)}</td>
                  <td className="px-4 py-2 border">{log.NdP.toFixed(2)}</td>
                  <td className="px-4 py-2 border">
                    <button 
                      onClick={() => setLogs(logs.filter((_, i) => i !== index))}
                      className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Graphs */}
      <div className="mt-8 mb-8">
        <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
        <Line 
          data={{
            labels: logs.map(log => log.date),
            datasets: [
              {
                label: 'Normalized Permeate Flow (m³/h)',
                data: logs.map(log => log.NQp),
                borderColor: 'rgb(75, 192, 192)',
              },
              {
                label: 'Normalized System Pressure (bar)',
                data: logs.map(log => log.NSP),
                borderColor: 'rgb(255, 99, 132)',
              },
              {
                label: 'Normalized Salt Rejection (%)',
                data: logs.map(log => log.NSR),
                borderColor: 'rgb(153, 102, 255)',
              },
              {
                label: 'Normalized Differential Pressure (bar)',
                data: logs.map(log => log.NdP),
                borderColor: 'rgb(255, 159, 64)',
              }
            ]
          }}
          options={{
            responsive: true,
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  text: 'Date'
                }
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: 'Value'
                }
              }
            }
          }}
        />
      </div>

      {/* Cleaning Requirements Display */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Cleaning Requirements Analysis</h3>
        {logs.length >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${
              ((logs[logs.length-1].NQp - logs[0].NQp) / logs[0].NQp * 100) <= -10 
                ? 'bg-red-100' 
                : 'bg-green-100'
            }`}>
              <h4 className="font-semibold">Normalized Flow Decline</h4>
              <p className="text-2xl font-bold">
                {((logs[logs.length-1].NQp - logs[0].NQp) / logs[0].NQp * 100).toFixed(2)}%
              </p>
              <p className="text-sm mt-2">
                {((logs[logs.length-1].NQp - logs[0].NQp) / logs[0].NQp * 100) <= -10 
                  ? 'Cleaning Required' 
                  : 'Within Normal Range'}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              ((logs[logs.length-1].NSR - logs[0].NSR) / logs[0].NSR * 100) >= 5 
                ? 'bg-red-100' 
                : 'bg-green-100'
            }`}>
              <h4 className="font-semibold">Salt Passage Increase</h4>
              <p className="text-2xl font-bold">
                {((logs[logs.length-1].NSR - logs[0].NSR) / logs[0].NSR * 100).toFixed(2)}%
              </p>
              <p className="text-sm mt-2">
                {((logs[logs.length-1].NSR - logs[0].NSR) / logs[0].NSR * 100) >= 5 
                  ? 'Cleaning Required' 
                  : 'Within Normal Range'}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              ((logs[logs.length-1].NdP - logs[0].NdP) / logs[0].NdP * 100) >= 15 
                ? 'bg-red-100' 
                : 'bg-green-100'
            }`}>
              <h4 className="font-semibold">Pressure Drop Increase</h4>
              <p className="text-2xl font-bold">
                {((logs[logs.length-1].NdP - logs[0].NdP) / logs[0].NdP * 100).toFixed(2)}%
              </p>
              <p className="text-sm mt-2">
                {((logs[logs.length-1].NdP - logs[0].NdP) / logs[0].NdP * 100) >= 15 
                  ? 'Cleaning Required' 
                  : 'Within Normal Range'}
              </p>
            </div>
          </div>
        )}
        {logs.length < 2 && (
          <p className="text-gray-600">At least two data points are needed to analyze cleaning requirements.</p>
        )}
      </div>

      {/* Cleaning Tank Sizing Calculator */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-semibold mb-4">Cleaning Tank Sizing Calculator</h3>

        {/* Vessel Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Vessels
            </label>
            <input
              type="number"
              value={tankSizing.vesselCount}
              onChange={(e) => handleTankSizingChange('vesselCount', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Elements per Vessel
            </label>
            <input
              type="number"
              value={tankSizing.elementsPerVessel}
              onChange={(e) => handleTankSizingChange('elementsPerVessel', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vessel Diameter (inches)
            </label>
            <input
              type="number"
              value={tankSizing.vesselDiameter}
              onChange={(e) => handleTankSizingChange('vesselDiameter', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vessel Length (feet)
            </label>
            <input
              type="number"
              value={tankSizing.vesselLength}
              onChange={(e) => handleTankSizingChange('vesselLength', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipe Length (feet)
            </label>
            <input
              type="number"
              value={tankSizing.pipeLength}
              onChange={(e) => handleTankSizingChange('pipeLength', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipe Diameter (inches)
            </label>
            <input
              type="number"
              value={tankSizing.pipeDiameter}
              onChange={(e) => handleTankSizingChange('pipeDiameter', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <button
          onClick={calculateCleaningVolumes}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 mb-4"
        >
          Calculate Cleaning Tank Size
        </button>

        {cleaningVolumes.totalVolume > 0 && (
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold mb-4">Calculation Results:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Vessel Volume:</p>
                <p className="text-lg font-semibold">{cleaningVolumes.vesselVolume} gallons</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pipe Volume:</p>
                <p className="text-lg font-semibold">{cleaningVolumes.pipeVolume} gallons</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Volume:</p>
                <p className="text-lg font-semibold">{cleaningVolumes.totalVolume} gallons</p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold mb-2">Recommended Flow Rate:</h4>
              <p className="text-lg">{getRecommendedFlowRate(tankSizing.vesselDiameter)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatingData;