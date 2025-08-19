"use client";

import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OperatingData {
  date: string;
  feedFlow: number;
  feedPressure: number;
  permPressure: number;
  concPressure: number;
  permFlow: number;
  feedTemp: number;
  feedConductivity: number;
  permConductivity: number;
  selected: boolean;
}

interface ResultData {
  date: string;
  days: number;
  differentialPressure: number;
  recovery: number;
  feedTDS: number;
  permeateTDS: number;
  netDrivingPressure: number;
  normalizedPermeateFlow: number;
  normalizedSaltPassage: number;
  normalizedSaltRejection: number;
}

interface ChartParameters {
  normalizedPermeateFlow: boolean;
  feedTDS: boolean;
  feedOsmoticPressure: boolean;
  netDrivingPressure: boolean;
  permeateTDS: boolean;
  recovery: boolean;
  normalizedSaltRejection: boolean;
  temperatureCorrectionFactor: boolean;
  differentialPressure: boolean;
}

const UFMonitoringSystem = () => {
  const [inputData, setInputData] = useState<OperatingData[]>([
    {
      date: '19/08/2025',
      feedFlow: 0,
      feedPressure: 0,
      permPressure: 0,
      concPressure: 0,
      permFlow: 0,
      feedTemp: 0,
      feedConductivity: 0,
      permConductivity: 0,
      selected: false
    }
  ]);

  const [results, setResults] = useState<ResultData[]>([]);
  const [chartParams, setChartParams] = useState<ChartParameters>({
    normalizedPermeateFlow: true,
    feedTDS: false,
    feedOsmoticPressure: false,
    netDrivingPressure: true,
    permeateTDS: false,
    recovery: false,
    normalizedSaltRejection: true,
    temperatureCorrectionFactor: false,
    differentialPressure: false
  });

  // TCF calculation (same as before)
  const calculateTCF = (tempCelsius: number): number => {
    const tcfLookupTable: Record<number, number> = {
      0: 0.50, 5: 0.59, 10: 0.68, 15: 0.78,
      20: 0.89, 25: 1.00, 30: 1.12, 35: 1.24, 40: 1.36
    };
    
    if (tcfLookupTable.hasOwnProperty(tempCelsius)) {
      return tcfLookupTable[tempCelsius];
    }
    
    const tempKeys = Object.keys(tcfLookupTable).map(Number).sort((a, b) => a - b);
    
    for (let i = 0; i < tempKeys.length - 1; i++) {
      const t1 = tempKeys[i];
      const t2 = tempKeys[i + 1];
      
      if (tempCelsius >= t1 && tempCelsius <= t2) {
        const tcf1 = tcfLookupTable[t1];
        const tcf2 = tcfLookupTable[t2];
        const tcf = tcf1 + (tcf2 - tcf1) * (tempCelsius - t1) / (t2 - t1);
        return Math.round(tcf * 100) / 100;
      }
    }
    
    return 1.0; // Default fallback
  };

  const calculateResults = () => {
    const newResults: ResultData[] = inputData.map((data, index) => {
      const tcf = calculateTCF(data.feedTemp);
      const differentialPressure = data.feedPressure - data.concPressure;
      const recovery = data.permFlow > 0 ? (data.permFlow / data.feedFlow) * 100 : 0;
      const feedTDS = data.feedConductivity * 0.64; // Approximate conversion
      const permeateTDS = data.permConductivity * 0.64;
      
      // UF specific calculations
      const actualTMP = data.feedPressure - data.permPressure;
      const actualPermeability = data.permFlow > 0 && actualTMP > 0 ? data.permFlow / actualTMP : 0;
      const normalizedPermeability = actualPermeability / tcf;
      const normalizedPermeateFlow = data.permFlow / tcf;
      
      // Calculate salt passage and rejection (for UF these are typically very low)
      const saltPassage = feedTDS > 0 ? (permeateTDS / feedTDS) * 100 : 0;
      const normalizedSaltPassage = saltPassage / tcf;
      const normalizedSaltRejection = 100 - normalizedSaltPassage;
      
      const netDrivingPressure = actualTMP - (feedTDS - permeateTDS) * 0.01; // Simplified osmotic pressure

      return {
        date: data.date,
        days: index + 1,
        differentialPressure,
        recovery,
        feedTDS,
        permeateTDS,
        netDrivingPressure,
        normalizedPermeateFlow,
        normalizedSaltPassage,
        normalizedSaltRejection
      };
    });

    setResults(newResults);
  };

  const addRow = () => {
    const newRow: OperatingData = {
      date: new Date().toLocaleDateString('en-GB'),
      feedFlow: 0,
      feedPressure: 0,
      permPressure: 0,
      concPressure: 0,
      permFlow: 0,
      feedTemp: 0,
      feedConductivity: 0,
      permConductivity: 0,
      selected: false
    };
    setInputData([...inputData, newRow]);
  };

  const updateInputData = (index: number, field: keyof OperatingData, value: any) => {
    const newData = [...inputData];
    newData[index] = { ...newData[index], [field]: value };
    setInputData(newData);
  };

  const toggleChartParam = (param: keyof ChartParameters) => {
    setChartParams(prev => ({ ...prev, [param]: !prev[param] }));
  };

  const getChartData = () => {
    return results.map((result, index) => ({
      date: result.date,
      days: result.days,
      normalizedPermeateFlow: result.normalizedPermeateFlow,
      netDrivingPressure: result.netDrivingPressure,
      normalizedSaltRejection: result.normalizedSaltRejection,
      feedTDS: result.feedTDS,
      permeateTDS: result.permeateTDS,
      recovery: result.recovery,
      differentialPressure: result.differentialPressure,
      temperatureCorrectionFactor: inputData[index] ? calculateTCF(inputData[index].feedTemp) : 1
    }));
  };

  const getCleaningAnalysis = () => {
    if (results.length < 2) return null;

    const latestResult = results[results.length - 1];
    const baselineResult = results[0];

    const flowDecline = baselineResult.normalizedPermeateFlow > 0 
      ? ((baselineResult.normalizedPermeateFlow - latestResult.normalizedPermeateFlow) / baselineResult.normalizedPermeateFlow) * 100 
      : 0;

    const saltPassageIncrease = latestResult.normalizedSaltPassage - baselineResult.normalizedSaltPassage;
    
    const pressureIncrease = ((latestResult.differentialPressure - baselineResult.differentialPressure) / baselineResult.differentialPressure) * 100;

    return {
      flowDecline,
      saltPassageIncrease,
      pressureIncrease
    };
  };

  const cleaningAnalysis = getCleaningAnalysis();

  const importExcel = () => {
    // Placeholder for Excel import functionality
    alert("Excel import functionality would be implemented here");
  };

  const exportData = () => {
    const csvData = [
      ["UF Monitoring Data Export"],
      [""],
      ["Input Data"],
      ["Date", "Feed Flow (m³/h)", "Feed Press. (bar)", "Perm. Press. (bar)", "Conc. Press. (bar)", 
       "Perm. Flow (m³/h)", "Feed Temp. (°C)", "Feed Cond. (µS/cm)", "Perm. Cond. (µS/cm)"],
      ...inputData.map(data => [
        data.date, data.feedFlow, data.feedPressure, data.permPressure, data.concPressure,
        data.permFlow, data.feedTemp, data.feedConductivity, data.permConductivity
      ]),
      [""],
      ["Results"],
      ["Date", "Days", "Differential Pressure (bar)", "Recovery (%)", "Feed TDS (mg/L)", 
       "Permeate TDS (mg/L)", "Net Driving Pressure (bar)", "Normalized Permeate Flow (m³/h)", 
       "Normalized Salt Passage (%)", "Normalized Salt Rejection (%)"],
      ...results.map(result => [
        result.date, result.days, result.differentialPressure.toFixed(2), result.recovery.toFixed(1),
        result.feedTDS.toFixed(0), result.permeateTDS.toFixed(0), result.netDrivingPressure.toFixed(2),
        result.normalizedPermeateFlow.toFixed(2), result.normalizedSaltPassage.toFixed(2),
        result.normalizedSaltRejection.toFixed(1)
      ])
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "UF_Monitoring_Data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const templateData = [
      ["UF Monitoring Data Template"],
      [""],
      ["Date", "Feed Flow (m³/h)", "Feed Press. (bar)", "Perm. Press. (bar)", "Conc. Press. (bar)", 
       "Perm. Flow (m³/h)", "Feed Temp. (°C)", "Feed Cond. (µS/cm)", "Perm. Cond. (µS/cm)"],
      ["01/01/2025", "100", "1.5", "0.2", "0.1", "85", "25", "500", "50"]
    ];

    const csvContent = templateData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "UF_Monitoring_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    calculateResults();
  }, [inputData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Input Parameters</h2>
        <div className="flex space-x-2">
          <button
            onClick={importExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center"
          >
            ↑ Import Excel
          </button>
          <button
            onClick={exportData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center"
          >
            ↓ Export Data
          </button>
          <button
            onClick={downloadTemplate}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium flex items-center"
          >
            ⬇ Download Template
          </button>
        </div>
      </div>

      {/* Input Parameters Table */}
      <div className="mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 border">Date</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Feed Flow<br/>(m³/h)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Feed<br/>Press.<br/>(bar)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Perm.<br/>Press.<br/>(bar)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Conc.<br/>Press.<br/>(bar)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Perm.<br/>Flow<br/>(m³/h)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Feed<br/>Temp. (°C)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Feed Cond.<br/>(µS/cm)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Perm.<br/>Cond.<br/>(µS/cm)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {inputData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="px-3 py-2 border">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => updateInputData(index, 'selected', e.target.checked)}
                        className="mr-2"
                      />
                      <input
                        type="text"
                        value={row.date}
                        onChange={(e) => updateInputData(index, 'date', e.target.value)}
                        className="w-24 p-1 text-sm border rounded"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 border">
                    <input
                      type="number"
                      value={row.feedFlow}
                      onChange={(e) => updateInputData(index, 'feedFlow', Number(e.target.value))}
                      className="w-16 p-1 text-sm text-center border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 border">
                    <input
                      type="number"
                      step="0.01"
                      value={row.feedPressure}
                      onChange={(e) => updateInputData(index, 'feedPressure', Number(e.target.value))}
                      className="w-16 p-1 text-sm text-center border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 border">
                    <input
                      type="number"
                      step="0.01"
                      value={row.permPressure}
                      onChange={(e) => updateInputData(index, 'permPressure', Number(e.target.value))}
                      className="w-16 p-1 text-sm text-center border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 border">
                    <input
                      type="number"
                      step="0.01"
                      value={row.concPressure}
                      onChange={(e) => updateInputData(index, 'concPressure', Number(e.target.value))}
                      className="w-16 p-1 text-sm text-center border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 border">
                    <input
                      type="number"
                      value={row.permFlow}
                      onChange={(e) => updateInputData(index, 'permFlow', Number(e.target.value))}
                      className="w-16 p-1 text-sm text-center border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 border">
                    <input
                      type="number"
                      value={row.feedTemp}
                      onChange={(e) => updateInputData(index, 'feedTemp', Number(e.target.value))}
                      className="w-16 p-1 text-sm text-center border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 border">
                    <input
                      type="number"
                      value={row.feedConductivity}
                      onChange={(e) => updateInputData(index, 'feedConductivity', Number(e.target.value))}
                      className="w-16 p-1 text-sm text-center border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 border">
                    <input
                      type="number"
                      value={row.permConductivity}
                      onChange={(e) => updateInputData(index, 'permConductivity', Number(e.target.value))}
                      className="w-16 p-1 text-sm text-center border rounded"
                    />
                  </td>
                  <td className="px-3 py-2 border">
                    <button
                      onClick={addRow}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Import/Export Instructions:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Import Excel:</strong> Upload data from an Excel file. The file should match the template format.</li>
            <li>• <strong>Export Data:</strong> Download current data as an Excel file including all calculated results.</li>
            <li>• <strong>Download Template:</strong> Get a blank Excel template with the correct format for data import.</li>
          </ul>
        </div>
      </div>

      {/* Results Table */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Results</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 border">Date</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Days</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Differential<br/>Pressure<br/>(bar)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Recovery<br/>(%)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Feed<br/>TDS<br/>(mg/L)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Permeate<br/>TDS<br/>(mg/L)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Net<br/>Driving<br/>Pressure<br/>(bar)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Normalized<br/>Permeate<br/>Flow (m³/h)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Normalized<br/>Salt Passage<br/>(%)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Normalized<br/>Salt<br/>Rejection<br/>(%)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="border-b">
                  <td className="px-3 py-2 border text-sm">{result.date}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.days}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.differentialPressure.toFixed(2)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.recovery.toFixed(1)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.feedTDS.toFixed(0)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.permeateTDS.toFixed(0)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.netDrivingPressure.toFixed(2)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.normalizedPermeateFlow.toFixed(2)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.normalizedSaltPassage.toFixed(2)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.normalizedSaltRejection.toFixed(1)}</td>
                  <td className="px-3 py-2 border text-sm text-center">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Performance Trends</h3>
        
        {/* Chart Parameter Selection */}
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-700 mb-3">Select Parameters to Plot:</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.normalizedPermeateFlow}
                  onChange={() => toggleChartParam('normalizedPermeateFlow')}
                  className="mr-2"
                />
                <span className="text-sm">Normalized Permeate Flow (m³/h)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.feedTDS}
                  onChange={() => toggleChartParam('feedTDS')}
                  className="mr-2"
                />
                <span className="text-sm">Feed TDS (mg/L)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.feedOsmoticPressure}
                  onChange={() => toggleChartParam('feedOsmoticPressure')}
                  className="mr-2"
                />
                <span className="text-sm">Feed Osmotic Pressure (bar)</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.netDrivingPressure}
                  onChange={() => toggleChartParam('netDrivingPressure')}
                  className="mr-2"
                />
                <span className="text-sm">Net Driving Pressure (bar)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.permeateTDS}
                  onChange={() => toggleChartParam('permeateTDS')}
                  className="mr-2"
                />
                <span className="text-sm">Permeate TDS (mg/L)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.recovery}
                  onChange={() => toggleChartParam('recovery')}
                  className="mr-2"
                />
                <span className="text-sm">Recovery (%)</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.normalizedSaltRejection}
                  onChange={() => toggleChartParam('normalizedSaltRejection')}
                  className="mr-2"
                />
                <span className="text-sm">Normalized Salt Rejection (%)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.temperatureCorrectionFactor}
                  onChange={() => toggleChartParam('temperatureCorrectionFactor')}
                  className="mr-2"
                />
                <span className="text-sm">Temperature Correction Factor</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.differentialPressure}
                  onChange={() => toggleChartParam('differentialPressure')}
                  className="mr-2"
                />
                <span className="text-sm">Differential Pressure (bar)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-4 border rounded-lg" style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="days" />
              <YAxis />
              <Tooltip />
              <Legend />
              
              {chartParams.normalizedPermeateFlow && (
                <Line type="monotone" dataKey="normalizedPermeateFlow" stroke="#10B981" strokeWidth={2} name="Normalized Permeate Flow (m³/h)" />
              )}
              {chartParams.netDrivingPressure && (
                <Line type="monotone" dataKey="netDrivingPressure" stroke="#EF4444" strokeWidth={2} name="Net Driving Pressure (bar)" />
              )}
              {chartParams.normalizedSaltRejection && (
                <Line type="monotone" dataKey="normalizedSaltRejection" stroke="#8B5CF6" strokeWidth={2} name="Normalized Salt Rejection (%)" />
              )}
              {chartParams.feedTDS && (
                <Line type="monotone" dataKey="feedTDS" stroke="#F59E0B" strokeWidth={2} name="Feed TDS (mg/L)" />
              )}
              {chartParams.permeateTDS && (
                <Line type="monotone" dataKey="permeateTDS" stroke="#3B82F6" strokeWidth={2} name="Permeate TDS (mg/L)" />
              )}
              {chartParams.recovery && (
                <Line type="monotone" dataKey="recovery" stroke="#6366F1" strokeWidth={2} name="Recovery (%)" />
              )}
              {chartParams.temperatureCorrectionFactor && (
                <Line type="monotone" dataKey="temperatureCorrectionFactor" stroke="#EC4899" strokeWidth={2} name="Temperature Correction Factor" />
              )}
              {chartParams.differentialPressure && (
                <Line type="monotone" dataKey="differentialPressure" stroke="#14B8A6" strokeWidth={2} name="Differential Pressure (bar)" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cleaning Requirements Analysis */}
      {cleaningAnalysis && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Cleaning Requirements Analysis</h3>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Baseline source:</strong> Reference Conditions
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${Math.abs(cleaningAnalysis.flowDecline) > 15 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <h4 className="font-semibold text-gray-800 mb-2">Normalized Flow Decline</h4>
              <div className={`text-2xl font-bold mb-2 ${Math.abs(cleaningAnalysis.flowDecline) > 15 ? 'text-red-600' : 'text-green-600'}`}>
                {cleaningAnalysis.flowDecline > 0 ? '-' : '+'}{Math.abs(cleaningAnalysis.flowDecline).toFixed(2)}%
              </div>
              <div className={`text-sm font-medium ${Math.abs(cleaningAnalysis.flowDecline) > 15 ? 'text-red-800' : 'text-green-800'}`}>
                {Math.abs(cleaningAnalysis.flowDecline) > 15 ? 'Cleaning Required' : 'Within Normal Range'}
              </div>
            </div>

            <div className={`p-4 rounded-lg ${Math.abs(cleaningAnalysis.saltPassageIncrease) > 5 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <h4 className="font-semibold text-gray-800 mb-2">Salt Passage Increase</h4>
              <div className={`text-2xl font-bold mb-2 ${Math.abs(cleaningAnalysis.saltPassageIncrease) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {cleaningAnalysis.saltPassageIncrease > 0 ? '+' : ''}{cleaningAnalysis.saltPassageIncrease.toFixed(2)}%
              </div>
              <div className={`text-sm font-medium ${Math.abs(cleaningAnalysis.saltPassageIncrease) > 5 ? 'text-red-800' : 'text-green-800'}`}>
                {Math.abs(cleaningAnalysis.saltPassageIncrease) > 5 ? 'Cleaning Required' : 'Within Normal Range'}
              </div>
            </div>

            <div className={`p-4 rounded-lg ${Math.abs(cleaningAnalysis.pressureIncrease) > 15 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <h4 className="font-semibold text-gray-800 mb-2">Pressure Drop Increase</h4>
              <div className={`text-2xl font-bold mb-2 ${Math.abs(cleaningAnalysis.pressureIncrease) > 15 ? 'text-red-600' : 'text-green-600'}`}>
                {cleaningAnalysis.pressureIncrease > 0 ? '+' : ''}{cleaningAnalysis.pressureIncrease.toFixed(1)}%
              </div>
              <div className={`text-sm font-medium ${Math.abs(cleaningAnalysis.pressureIncrease) > 15 ? 'text-red-800' : 'text-green-800'}`}>
                {Math.abs(cleaningAnalysis.pressureIncrease) > 15 ? 'Cleaning Required' : 'Within Normal Range'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UFMonitoringSystem;
