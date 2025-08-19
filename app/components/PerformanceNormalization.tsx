"use client";

import React, { useState, useEffect } from "react";

interface OperatingData {
  date: string;
  time: string;
  hourMeter: number;
  temperature: number;
  screenFilterPressureIn: number;
  screenFilterPressureOut: number;
  bottomPressure: number;
  topPressure: number;
  filtratePressure: number;
  feedTurbidity: number;
  filtrateTurbidity: number;
  filtrateFlow: number;
  bleedFlow: number;
  recycleFlow: number;
  comments: string;
  selected: boolean;
}

interface ResultData {
  date: string;
  days: number;
  flux: number; // J - filtrate flux [gfd]
  tmp: number; // Trans Membrane Pressure [psi]
  tcsf: number; // Temperature Compensated Specific Flux [gfd/psi]
  differentialPressure: number; // ΔP [psi]
  instantaneousRecovery: number; // Recovery [%]
  normalizedTMP: number;
  normalizedFlux: number;
  normalizedTCSF: number;
}

interface ChartParameters {
  flux: boolean;
  tmp: boolean;
  tcsf: boolean;
  differentialPressure: boolean;
  instantaneousRecovery: boolean;
  normalizedTMP: boolean;
  normalizedFlux: boolean;
  normalizedTCSF: boolean;
  feedTurbidity: boolean;
  filtrateTurbidity: boolean;
}

const UFMonitoringSystem = () => {
  const [inputData, setInputData] = useState<OperatingData[]>([
    {
      date: '19/08/2025',
      time: '00:00',
      hourMeter: 0,
      temperature: 20,
      screenFilterPressureIn: 0,
      screenFilterPressureOut: 0,
      bottomPressure: 0,
      topPressure: 0,
      filtratePressure: 0,
      feedTurbidity: 0,
      filtrateTurbidity: 0,
      filtrateFlow: 0,
      bleedFlow: 0,
      recycleFlow: 0,
      comments: '',
      selected: false
    }
  ]);

  const [results, setResults] = useState<ResultData[]>([]);
  const [chartParams, setChartParams] = useState<ChartParameters>({
    flux: true,
    tmp: true,
    tcsf: true,
    differentialPressure: false,
    instantaneousRecovery: false,
    normalizedTMP: false,
    normalizedFlux: false,
    normalizedTCSF: false,
    feedTurbidity: false,
    filtrateTurbidity: false
  });

  // Membrane area (ft²) - this would typically be input or selected based on module type
  const [membraneArea, setMembraneArea] = useState<number>(1000);

  // UF specific calculations based on HYDRAcap documentation
  const calculateUFPerformance = (data: OperatingData, index: number): ResultData => {
    
    // 1. Flux calculation: J = (1440 × Q) / A_m [gfd]
    // where Q = filtrate flow [gpm], A_m = effective membrane area [ft²]
    const flux = (1440 * data.filtrateFlow) / membraneArea;

    // 2. Trans Membrane Pressure (TMP) calculation:
    // TMP = ((P_bottom + P_top) / 2) - P_filt [psi]
    const tmp = ((data.bottomPressure + data.topPressure) / 2) - data.filtratePressure;

    // 3. Temperature Compensated Specific Flux (TCSF):
    // TCSF = (J / TMP) × e^(-0.015 × (T - 20)) [gfd/psi]
    // where T = water temperature [°C]
    const tcsf = tmp > 0 ? (flux / tmp) * Math.exp(-0.015 * (data.temperature - 20)) : 0;

    // 4. Differential pressure (ΔP):
    // ΔP = P_bottom - P_top [psi]
    const differentialPressure = data.bottomPressure - data.topPressure;

    // 5. Instantaneous Recovery:
    // R = [1 - (V_BW / (V_FiltrateGross + V_Bleed + V_FF))] × 100 [%]
    // Simplified version: R = [1 - (V_BW / V_FiltrateGross)] × 100
    // For instantaneous calculation during normal operation:
    const totalFeedFlow = data.filtrateFlow + data.bleedFlow + data.recycleFlow;
    const instantaneousRecovery = totalFeedFlow > 0 ? (data.filtrateFlow / totalFeedFlow) * 100 : 0;

    // 6. Temperature normalization to 20°C reference
    const tempCorrectionFactor = Math.exp(-0.015 * (data.temperature - 20));
    
    // Normalized values (corrected to 20°C)
    const normalizedTMP = tmp / tempCorrectionFactor;
    const normalizedFlux = flux / tempCorrectionFactor;
    const normalizedTCSF = tcsf; // TCSF is already temperature compensated

    return {
      date: data.date,
      days: index + 1,
      flux,
      tmp,
      tcsf,
      differentialPressure,
      instantaneousRecovery,
      normalizedTMP,
      normalizedFlux,
      normalizedTCSF
    };
  };

  const calculateResults = () => {
    const newResults: ResultData[] = inputData.map((data, index) => 
      calculateUFPerformance(data, index)
    );
    setResults(newResults);
  };

  const addRow = () => {
    const newRow: OperatingData = {
      date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      hourMeter: 0,
      temperature: 20,
      screenFilterPressureIn: 0,
      screenFilterPressureOut: 0,
      bottomPressure: 0,
      topPressure: 0,
      filtratePressure: 0,
      feedTurbidity: 0,
      filtrateTurbidity: 0,
      filtrateFlow: 0,
      bleedFlow: 0,
      recycleFlow: 0,
      comments: '',
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

  const getPerformanceAnalysis = () => {
    if (results.length < 2) return null;

    const latestResult = results[results.length - 1];
    const baselineResult = results[0];

    // TCSF decline analysis
    const tcsf_decline = baselineResult.tcsf > 0 
      ? ((baselineResult.tcsf - latestResult.tcsf) / baselineResult.tcsf) * 100 
      : 0;

    // TMP increase analysis  
    const tmp_increase = baselineResult.tmp > 0 
      ? ((latestResult.tmp - baselineResult.tmp) / baselineResult.tmp) * 100
      : 0;

    // Differential pressure increase
    const dp_increase = Math.abs(baselineResult.differentialPressure) > 0 
      ? ((Math.abs(latestResult.differentialPressure) - Math.abs(baselineResult.differentialPressure)) / Math.abs(baselineResult.differentialPressure)) * 100
      : 0;

    return {
      tcsf_decline,
      tmp_increase,
      dp_increase,
      current_tcsf: latestResult.tcsf,
      current_tmp: latestResult.tmp
    };
  };

  const performanceAnalysis = getPerformanceAnalysis();

  const importExcel = () => {
    alert("Excel import functionality would be implemented here");
  };

  const exportData = () => {
    const csvData = [
      ["HYDRAcap UF Monitoring Data Export"],
      [""],
      ["Input Data"],
      ["Date", "Time", "Hour Meter", "Temperature (°C)", "Screen Filter Press. In (psi)", 
       "Screen Filter Press. Out (psi)", "Bottom Pressure (psi)", "Top Pressure (psi)", 
       "Filtrate Pressure (psi)", "Feed Turbidity (NTU)", "Filtrate Turbidity (NTU)", 
       "Filtrate Flow (gpm)", "Bleed Flow (gpm)", "Recycle Flow (gpm)", "Comments"],
      ...inputData.map(data => [
        data.date, data.time, data.hourMeter, data.temperature, data.screenFilterPressureIn,
        data.screenFilterPressureOut, data.bottomPressure, data.topPressure, data.filtratePressure,
        data.feedTurbidity, data.filtrateTurbidity, data.filtrateFlow, data.bleedFlow, 
        data.recycleFlow, data.comments
      ]),
      [""],
      ["Results"],
      ["Date", "Days", "Flux (gfd)", "TMP (psi)", "TCSF (gfd/psi)", "ΔP (psi)", 
       "Recovery (%)", "Normalized TMP (psi)", "Normalized Flux (gfd)", "Normalized TCSF (gfd/psi)"],
      ...results.map(result => [
        result.date, result.days, result.flux.toFixed(1), result.tmp.toFixed(2),
        result.tcsf.toFixed(2), result.differentialPressure.toFixed(2), result.instantaneousRecovery.toFixed(1),
        result.normalizedTMP.toFixed(2), result.normalizedFlux.toFixed(1), result.normalizedTCSF.toFixed(2)
      ])
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "HYDRAcap_UF_Monitoring_Data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const templateData = [
      ["HYDRAcap UF Monitoring Template"],
      [""],
      ["Date", "Time", "Hour Meter", "Temperature (°C)", "Screen Filter Press. In (psi)", 
       "Screen Filter Press. Out (psi)", "Bottom Pressure (psi)", "Top Pressure (psi)", 
       "Filtrate Pressure (psi)", "Feed Turbidity (NTU)", "Filtrate Turbidity (NTU)", 
       "Filtrate Flow (gpm)", "Bleed Flow (gpm)", "Recycle Flow (gpm)", "Comments"],
      ["01/01/2025", "08:00", "1000", "20", "15", "14", "12", "10", "2", "0.5", "0.1", "100", "5", "10", "Normal operation"]
    ];

    const csvContent = templateData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "HYDRAcap_UF_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    calculateResults();
  }, [inputData, membraneArea]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">HYDRAcap® UF Data Logging & Performance Analysis</h2>
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

      {/* System Configuration */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-700 mb-3">System Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effective Membrane Area (ft²)</label>
            <input
              type="number"
              value={membraneArea}
              onChange={(e) => setMembraneArea(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
            <span className="text-xs text-gray-500">Required for flux calculations</span>
          </div>
        </div>
      </div>

      {/* Input Parameters Table */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Data Logging Sheet</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 border">Date</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Time</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Hour<br/>Meter</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Temp.<br/>(°C)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Screen Filter<br/>Press. In (psi)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Screen Filter<br/>Press. Out (psi)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Bottom<br/>Press. (psi)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Top<br/>Press. (psi)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Filtrate<br/>Press. (psi)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Feed<br/>Turbidity (NTU)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Filtrate<br/>Turbidity (NTU)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Filtrate<br/>Flow (gpm)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Bleed<br/>Flow (gpm)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Recycle<br/>Flow (gpm)</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Comments</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {inputData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="px-2 py-2 border">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => updateInputData(index, 'selected', e.target.checked)}
                        className="mr-1"
                      />
                      <input
                        type="text"
                        value={row.date}
                        onChange={(e) => updateInputData(index, 'date', e.target.value)}
                        className="w-20 p-1 text-xs border rounded"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="text"
                      value={row.time}
                      onChange={(e) => updateInputData(index, 'time', e.target.value)}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      value={row.hourMeter}
                      onChange={(e) => updateInputData(index, 'hourMeter', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      step="0.1"
                      value={row.temperature}
                      onChange={(e) => updateInputData(index, 'temperature', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      step="0.1"
                      value={row.screenFilterPressureIn}
                      onChange={(e) => updateInputData(index, 'screenFilterPressureIn', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      step="0.1"
                      value={row.screenFilterPressureOut}
                      onChange={(e) => updateInputData(index, 'screenFilterPressureOut', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      step="0.1"
                      value={row.bottomPressure}
                      onChange={(e) => updateInputData(index, 'bottomPressure', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      step="0.1"
                      value={row.topPressure}
                      onChange={(e) => updateInputData(index, 'topPressure', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      step="0.1"
                      value={row.filtratePressure}
                      onChange={(e) => updateInputData(index, 'filtratePressure', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      step="0.1"
                      value={row.feedTurbidity}
                      onChange={(e) => updateInputData(index, 'feedTurbidity', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      step="0.01"
                      value={row.filtrateTurbidity}
                      onChange={(e) => updateInputData(index, 'filtrateTurbidity', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      value={row.filtrateFlow}
                      onChange={(e) => updateInputData(index, 'filtrateFlow', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      value={row.bleedFlow}
                      onChange={(e) => updateInputData(index, 'bleedFlow', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="number"
                      value={row.recycleFlow}
                      onChange={(e) => updateInputData(index, 'recycleFlow', Number(e.target.value))}
                      className="w-12 p-1 text-xs text-center border rounded"
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <input
                      type="text"
                      value={row.comments}
                      onChange={(e) => updateInputData(index, 'comments', e.target.value)}
                      className="w-20 p-1 text-xs border rounded"
                      placeholder="Comments..."
                    />
                  </td>
                  <td className="px-2 py-2 border">
                    <button
                      onClick={addRow}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
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
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">Data Logging Instructions:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Frequency:</strong> Log data at least once per day (minimum), preferably once per operator shift</li>
            <li>• <strong>Timing:</strong> Include data logged 2 minutes prior to backwash and 2 minutes after backwash</li>
            <li>• <strong>Critical Parameters:</strong> Monitor Recovery, ΔP, TCSF and TMP for complete performance assessment</li>
            <li>• <strong>Alerts:</strong> TMP should never exceed 20 psi, TCSF should never decrease below 7 gfd/psi</li>
          </ul>
        </div>
      </div>

      {/* Results Table */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Performance Analysis Results</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 border">Date</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Days</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Flux<br/>(gfd)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">TMP<br/>(psi)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">TCSF<br/>(gfd/psi)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">ΔP<br/>(psi)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Recovery<br/>(%)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Normalized<br/>TMP (psi)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Normalized<br/>Flux (gfd)</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="border-b">
                  <td className="px-3 py-2 border text-sm">{result.date}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.days}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.flux.toFixed(1)}</td>
                  <td className="px-3 py-2 border text-sm text-center">
                    <span className={result.tmp > 20 ? 'text-red-600 font-bold' : ''}>
                      {result.tmp.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2 border text-sm text-center">
                    <span className={result.tcsf < 7 ? 'text-red-600 font-bold' : ''}>
                      {result.tcsf.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2 border text-sm text-center">{result.differentialPressure.toFixed(2)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.instantaneousRecovery.toFixed(1)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.normalizedTMP.toFixed(2)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.normalizedFlux.toFixed(1)}</td>
                  <td className="px-3 py-2 border text-sm text-center">
                    {result.tmp > 20 || result.tcsf < 7 ? (
                      <span className="text-red-600 font-bold">⚠️ Alert</span>
                    ) : (
                      <span className="text-green-600">✓ Normal</span>
                    )}
                  </td>
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
          <h4 className="text-lg font-semibold text-gray-700 mb-3">Select Parameters to Display:</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.flux}
                  onChange={() => toggleChartParam('flux')}
                  className="mr-2"
                />
                <span className="text-sm">Flux (gfd)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.tmp}
                  onChange={() => toggleChartParam('tmp')}
                  className="mr-2"
                />
                <span className="text-sm">TMP (psi)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.tcsf}
                  onChange={() => toggleChartParam('tcsf')}
                  className="mr-2"
                />
                <span className="text-sm">TCSF (gfd/psi)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.feedTurbidity}
                  onChange={() => toggleChartParam('feedTurbidity')}
                  className="mr-2"
                />
                <span className="text-sm">Feed Turbidity (NTU)</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.differentialPressure}
                  onChange={() => toggleChartParam('differentialPressure')}
                  className="mr-2"
                />
                <span className="text-sm">Differential Pressure (psi)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.instantaneousRecovery}
                  onChange={() => toggleChartParam('instantaneousRecovery')}
                  className="mr-2"
                />
                <span className="text-sm">Recovery (%)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.normalizedTMP}
                  onChange={() => toggleChartParam('normalizedTMP')}
                  className="mr-2"
                />
                <span className="text-sm">Normalized TMP (psi)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.filtrateTurbidity}
                  onChange={() => toggleChartParam('filtrateTurbidity')}
                  className="mr-2"
                />
                <span className="text-sm">Filtrate Turbidity (NTU)</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.normalizedFlux}
                  onChange={() => toggleChartParam('normalizedFlux')}
                  className="mr-2"
                />
                <span className="text-sm">Normalized Flux (gfd)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.normalizedTCSF}
                  onChange={() => toggleChartParam('normalizedTCSF')}
                  className="mr-2"
                />
                <span className="text-sm">Normalized TCSF (gfd/psi)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Trend Data Table */}
        <div className="bg-white p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-3">Selected Parameters Trend:</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 border">Date</th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Days</th>
                  {chartParams.flux && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Flux (gfd)</th>}
                  {chartParams.tmp && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">TMP (psi)</th>}
                  {chartParams.tcsf && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">TCSF (gfd/psi)</th>}
                  {chartParams.differentialPressure && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">ΔP (psi)</th>}
                  {chartParams.instantaneousRecovery && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Recovery (%)</th>}
                  {chartParams.normalizedTMP && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Norm. TMP</th>}
                  {chartParams.normalizedFlux && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Norm. Flux</th>}
                  {chartParams.normalizedTCSF && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Norm. TCSF</th>}
                  {chartParams.feedTurbidity && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Feed Turb.</th>}
                  {chartParams.filtrateTurbidity && <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Filt. Turb.</th>}
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-3 py-2 border text-sm">{result.date}</td>
                    <td className="px-3 py-2 border text-sm text-center">{result.days}</td>
                    {chartParams.flux && <td className="px-3 py-2 border text-sm text-center">{result.flux.toFixed(1)}</td>}
                    {chartParams.tmp && <td className="px-3 py-2 border text-sm text-center">{result.tmp.toFixed(2)}</td>}
                    {chartParams.tcsf && <td className="px-3 py-2 border text-sm text-center">{result.tcsf.toFixed(2)}</td>}
                    {chartParams.differentialPressure && <td className="px-3 py-2 border text-sm text-center">{result.differentialPressure.toFixed(2)}</td>}
                    {chartParams.instantaneousRecovery && <td className="px-3 py-2 border text-sm text-center">{result.instantaneousRecovery.toFixed(1)}</td>}
                    {chartParams.normalizedTMP && <td className="px-3 py-2 border text-sm text-center">{result.normalizedTMP.toFixed(2)}</td>}
                    {chartParams.normalizedFlux && <td className="px-3 py-2 border text-sm text-center">{result.normalizedFlux.toFixed(1)}</td>}
                    {chartParams.normalizedTCSF && <td className="px-3 py-2 border text-sm text-center">{result.normalizedTCSF.toFixed(2)}</td>}
                    {chartParams.feedTurbidity && <td className="px-3 py-2 border text-sm text-center">{inputData[index]?.feedTurbidity.toFixed(1) || '-'}</td>}
                    {chartParams.filtrateTurbidity && <td className="px-3 py-2 border text-sm text-center">{inputData[index]?.filtrateTurbidity.toFixed(2) || '-'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Performance Analysis */}
      {performanceAnalysis && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">HYDRAcap® Performance Analysis</h3>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Baseline source:</strong> First data point (Reference Conditions)
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* TCSF Analysis */}
            <div className={`p-4 rounded-lg ${performanceAnalysis.tcsf_decline > 30 || performanceAnalysis.current_tcsf < 7 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <h4 className="font-semibold text-gray-800 mb-2">TCSF Performance</h4>
              <div className={`text-2xl font-bold mb-2 ${performanceAnalysis.tcsf_decline > 30 || performanceAnalysis.current_tcsf < 7 ? 'text-red-600' : 'text-green-600'}`}>
                {performanceAnalysis.tcsf_decline > 0 ? '-' : '+'}{Math.abs(performanceAnalysis.tcsf_decline).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-700 mb-1">
                Current: {performanceAnalysis.current_tcsf.toFixed(2)} gfd/psi
              </div>
              <div className={`text-sm font-medium ${performanceAnalysis.tcsf_decline > 30 || performanceAnalysis.current_tcsf < 7 ? 'text-red-800' : 'text-green-800'}`}>
                {performanceAnalysis.current_tcsf < 7 ? 'Chemical Cleaning Required' : 
                 performanceAnalysis.tcsf_decline > 30 ? 'Performance Declining' : 'Within Normal Range'}
              </div>
            </div>

            {/* TMP Analysis */}
            <div className={`p-4 rounded-lg ${performanceAnalysis.tmp_increase > 50 || performanceAnalysis.current_tmp > 20 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <h4 className="font-semibold text-gray-800 mb-2">TMP Performance</h4>
              <div className={`text-2xl font-bold mb-2 ${performanceAnalysis.tmp_increase > 50 || performanceAnalysis.current_tmp > 20 ? 'text-red-600' : 'text-green-600'}`}>
                {performanceAnalysis.tmp_increase > 0 ? '+' : ''}{performanceAnalysis.tmp_increase.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-700 mb-1">
                Current: {performanceAnalysis.current_tmp.toFixed(2)} psi
              </div>
              <div className={`text-sm font-medium ${performanceAnalysis.tmp_increase > 50 || performanceAnalysis.current_tmp > 20 ? 'text-red-800' : 'text-green-800'}`}>
                {performanceAnalysis.current_tmp > 20 ? 'CAUTION: TMP exceeds 20 psi' : 
                 performanceAnalysis.tmp_increase > 50 ? 'Membrane Fouling' : 'Within Normal Range'}
              </div>
            </div>

            {/* Differential Pressure Analysis */}
            <div className={`p-4 rounded-lg ${Math.abs(performanceAnalysis.dp_increase) > 100 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <h4 className="font-semibold text-gray-800 mb-2">Differential Pressure</h4>
              <div className={`text-2xl font-bold mb-2 ${Math.abs(performanceAnalysis.dp_increase) > 100 ? 'text-red-600' : 'text-green-600'}`}>
                {performanceAnalysis.dp_increase > 0 ? '+' : ''}{performanceAnalysis.dp_increase.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-700 mb-1">
                Fiber condition indicator
              </div>
              <div className={`text-sm font-medium ${Math.abs(performanceAnalysis.dp_increase) > 100 ? 'text-red-800' : 'text-green-800'}`}>
                {Math.abs(performanceAnalysis.dp_increase) > 100 ? 'Check for Fiber Plugging' : 'Normal Fiber Condition'}
              </div>
            </div>
          </div>

          {/* Performance Guidelines */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-3">HYDRAcap® Performance Guidelines:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-semibold text-blue-700 mb-2">Critical Operating Limits:</h5>
                <ul className="space-y-1 text-blue-700">
                  <li>• <strong>TMP:</strong> Never exceed 20 psi (1.4 bar)</li>
                  <li>• <strong>TCSF:</strong> Never decrease below 7 gfd/psi (172 lmh/bar)</li>
                  <li>• <strong>Recovery:</strong> Optimize based on feed water quality</li>
                  <li>• <strong>Temperature:</strong> Reference normalization at 20°C</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-blue-700 mb-2">Maintenance Actions:</h5>
                <ul className="space-y-1 text-blue-700">
                  <li>• <strong>TMP 15-20 psi:</strong> Chemical cleaning recommended</li>
                  <li>• <strong>TCSF decline greater than 30%:</strong> Evaluate cleaning schedule</li>
                  <li>• <strong>High ΔP:</strong> Check for fiber plugging or cake layer</li>
                  <li>• <strong>Unstable operation:</strong> Increase backwash frequency</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UFMonitoringSystem;
