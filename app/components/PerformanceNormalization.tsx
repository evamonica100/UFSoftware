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
    flux: false,
    tmp: true,
    tcsf: true,
    differentialPressure: false,
    instantaneousRecovery: false,
    normalizedTMP: false,
    normalizedFlux: true,
    normalizedTCSF: false,
    feedTurbidity: false,
    filtrateTurbidity: false
  });

  // Membrane area (ft²) - this would typically be input or selected based on module type
  const [membraneArea, setMembraneArea] = useState<number>(1000);

  // UF specific calculations
  const calculateUFPerformance = (data: OperatingData, index: number): ResultData => {
    
    // 1. Flux calculation: J = (1440 × Q) / A_m [gfd]
    const flux = (1440 * data.filtrateFlow) / membraneArea;

    // 2. Trans Membrane Pressure (TMP) calculation:
    const tmp = ((data.bottomPressure + data.topPressure) / 2) - data.filtratePressure;

    // 3. Temperature Compensated Specific Flux (TCSF):
    const tcsf = tmp > 0 ? (flux / tmp) * Math.exp(-0.015 * (data.temperature - 20)) : 0;

    // 4. Differential pressure (ΔP):
    const differentialPressure = data.bottomPressure - data.topPressure;

    // 5. Instantaneous Recovery:
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
      ["UF Performance Monitoring Data Export"],
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
    link.download = "UF_Performance_Monitoring_Data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const templateData = [
      ["UF Performance Monitoring Template"],
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
    link.download = "UF_Monitoring_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Simple SVG Chart Component
  const SimpleChart = ({ data, selectedParams }: { data: ResultData[], selectedParams: ChartParameters }) => {
    if (data.length === 0) return <div className="text-gray-500">No data to display</div>;

    const chartWidth = 800;
    const chartHeight = 400;
    const padding = { top: 20, right: 60, bottom: 40, left: 60 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

    // Get active parameters
    const activeParams = Object.entries(selectedParams)
      .filter(([key, value]) => value)
      .map(([key]) => key as keyof ChartParameters);

    if (activeParams.length === 0) {
      return <div className="text-gray-500">Select parameters to display trends</div>;
    }

    // Create data points for each active parameter
    const chartData = activeParams.map((param, paramIndex) => {
      const values = data.map((d, index) => {
        let value = 0;
        switch (param) {
          case 'flux': value = d.flux; break;
          case 'tmp': value = d.tmp; break;
          case 'tcsf': value = d.tcsf; break;
          case 'differentialPressure': value = d.differentialPressure; break;
          case 'instantaneousRecovery': value = d.instantaneousRecovery; break;
          case 'normalizedTMP': value = d.normalizedTMP; break;
          case 'normalizedFlux': value = d.normalizedFlux; break;
          case 'normalizedTCSF': value = d.normalizedTCSF; break;
          case 'feedTurbidity': value = inputData[index]?.feedTurbidity || 0; break;
          case 'filtrateTurbidity': value = inputData[index]?.filtrateTurbidity || 0; break;
        }
        return { x: index, y: value, day: d.days };
      });

      const minY = Math.min(...values.map(v => v.y));
      const maxY = Math.max(...values.map(v => v.y));
      const yRange = maxY - minY || 1;

      const points = values.map(point => ({
        x: padding.left + (point.x / (data.length - 1 || 1)) * plotWidth,
        y: padding.top + plotHeight - ((point.y - minY) / yRange) * plotHeight,
        day: point.day,
        value: point.y
      }));

      const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1', '#F97316', '#84CC16'];
      
      return {
        param,
        points,
        color: colors[paramIndex % colors.length],
        minY,
        maxY
      };
    });

    return (
      <div className="bg-white p-4 border rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-3">Performance Trends Over Time</h4>
        <svg width={chartWidth} height={chartHeight} className="border">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={padding.top + ratio * plotHeight}
                x2={padding.left + plotWidth}
                y2={padding.top + ratio * plotHeight}
                stroke="#E5E7EB"
                strokeWidth="1"
              />
              <line
                x1={padding.left + ratio * plotWidth}
                y1={padding.top}
                x2={padding.left + ratio * plotWidth}
                y2={padding.top + plotHeight}
                stroke="#E5E7EB"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Data lines */}
          {chartData.map((series, seriesIndex) => (
            <g key={series.param}>
              <polyline
                fill="none"
                stroke={series.color}
                strokeWidth="2"
                points={series.points.map(p => `${p.x},${p.y}`).join(' ')}
              />
              {/* Data points */}
              {series.points.map((point, pointIndex) => (
                <circle
                  key={pointIndex}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={series.color}
                >
                  <title>{`Day ${point.day}: ${point.value.toFixed(2)}`}</title>
                </circle>
              ))}
            </g>
          ))}

          {/* Axes */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#374151" strokeWidth="2"/>
          <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#374151" strokeWidth="2"/>

          {/* X-axis labels */}
          {data.map((d, index) => (
            index % Math.ceil(data.length / 8) === 0 && (
              <text
                key={index}
                x={padding.left + (index / (data.length - 1 || 1)) * plotWidth}
                y={padding.top + plotHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#6B7280"
              >
                Day {d.days}
              </text>
            )
          ))}

          {/* Legend */}
          {chartData.map((series, index) => (
            <g key={series.param}>
              <rect
                x={padding.left + plotWidth + 10}
                y={padding.top + index * 20}
                width="12"
                height="12"
                fill={series.color}
              />
              <text
                x={padding.left + plotWidth + 25}
                y={padding.top + index * 20 + 9}
                fontSize="12"
                fill="#374151"
              >
                {series.param}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  useEffect(() => {
    calculateResults();
  }, [inputData, membraneArea]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">UF Performance Monitoring & Predictive Maintenance</h2>
          <p className="text-gray-600 mt-2">Monitor membrane health • Optimize cleaning schedules • Prevent costly failures</p>
        </div>
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
        <h3 className="text-xl font-bold text-gray-800 mb-4">Operating Data Collection</h3>
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
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">🎯 Data Collection Goals:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-green-700">
            <div>
              <h5 className="font-semibold mb-1">Prevent Membrane Damage:</h5>
              <p>Track TMP to avoid exceeding 20 psi damage threshold</p>
            </div>
            <div>
              <h5 className="font-semibold mb-1">Optimize Cleaning Schedule:</h5>
              <p>Monitor TCSF decline to clean at optimal timing</p>
            </div>
            <div>
              <h5 className="font-semibold mb-1">Extend Membrane Life:</h5>
              <p>Identify fouling trends before performance degrades</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Membrane Health Assessment</h3>
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
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">Membrane<br/>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="border-b">
                  <td className="px-3 py-2 border text-sm">{result.date}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.days}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.flux.toFixed(1)}</td>
                  <td className="px-3 py-2 border text-sm text-center">
                    <span className={result.tmp > 20 ? 'text-red-600 font-bold' : result.tmp > 15 ? 'text-yellow-600 font-bold' : ''}>
                      {result.tmp.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2 border text-sm text-center">
                    <span className={result.tcsf < 7 ? 'text-red-600 font-bold' : result.tcsf < 10 ? 'text-yellow-600 font-bold' : ''}>
                      {result.tcsf.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2 border text-sm text-center">{result.differentialPressure.toFixed(2)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.instantaneousRecovery.toFixed(1)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.normalizedTMP.toFixed(2)}</td>
                  <td className="px-3 py-2 border text-sm text-center">{result.normalizedFlux.toFixed(1)}</td>
                  <td className="px-3 py-2 border text-sm text-center">
                    {result.tmp > 20 || result.tcsf < 7 ? (
                      <span className="text-red-600 font-bold">🚨 Clean Now</span>
                    ) : result.tmp > 15 || result.tcsf < 10 ? (
                      <span className="text-yellow-600 font-bold">⚠️ Plan Cleaning</span>
                    ) : (
                      <span className="text-green-600">✅ Healthy</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Trends with SVG Chart */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Performance Trends & Predictive Analytics</h3>
        
        {/* Chart Parameter Selection */}
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-700 mb-3">Select Key Performance Indicators to Track:</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.tmp}
                  onChange={() => toggleChartParam('tmp')}
                  className="mr-2"
                />
                <span className="text-sm font-medium">🔴 TMP (Pressure Health)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.tcsf}
                  onChange={() => toggleChartParam('tcsf')}
                  className="mr-2"
                />
                <span className="text-sm font-medium">🔵 TCSF (Membrane Permeability)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.normalizedFlux}
                  onChange={() => toggleChartParam('normalizedFlux')}
                  className="mr-2"
                />
                <span className="text-sm font-medium">🟢 Normalized Flux</span>
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
                <span className="text-sm">Differential Pressure (Fiber Health)</span>
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
                  checked={chartParams.flux}
                  onChange={() => toggleChartParam('flux')}
                  className="mr-2"
                />
                <span className="text-sm">Raw Flux (gfd)</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.feedTurbidity}
                  onChange={() => toggleChartParam('feedTurbidity')}
                  className="mr-2"
                />
                <span className="text-sm">Feed Water Quality (Turbidity)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartParams.filtrateTurbidity}
                  onChange={() => toggleChartParam('filtrateTurbidity')}
                  className="mr-2"
                />
                <span className="text-sm">Product Water Quality</span>
              </label>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <SimpleChart data={results} selectedParams={chartParams} />
      </div>

      {/* Action Recommendations */}
      {performanceAnalysis && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Action Recommendations</h3>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Analysis baseline:</strong> First measurement (Day 1) • <strong>Current Status:</strong> 
            <span className={`ml-2 font-semibold ${
              performanceAnalysis.current_tmp > 20 || performanceAnalysis.current_tcsf < 7 ? 'text-red-600' : 
              performanceAnalysis.current_tmp > 15 || performanceAnalysis.current_tcsf < 10 ? 'text-yellow-600' : 
              'text-green-600'
            }`}>
              {performanceAnalysis.current_tmp > 20 || performanceAnalysis.current_tcsf < 7 ? 'URGENT ACTION REQUIRED' : 
               performanceAnalysis.current_tmp > 15 || performanceAnalysis.current_tcsf < 10 ? 'PLAN MAINTENANCE' : 
               'SYSTEM HEALTHY'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Immediate Actions */}
            <div className="p-4 bg-red-50 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-3">🚨 Immediate Actions (0-7 days)</h4>
              <ul className="space-y-2 text-sm">
                {performanceAnalysis.current_tmp > 20 && (
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">🛑</span>
                    <div>
                      <strong className="text-red-800">CRITICAL:</strong> Stop operation immediately
                      <div className="text-red-600">TMP = {performanceAnalysis.current_tmp.toFixed(2)} psi (exceeds 20 psi safe limit)</div>
                    </div>
                  </li>
                )}
                {performanceAnalysis.current_tcsf < 7 && (
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">🔴</span>
                    <div>
                      <strong className="text-red-800">URGENT:</strong> Perform chemical cleaning now
                      <div className="text-red-600">TCSF = {performanceAnalysis.current_tcsf.toFixed(2)} gfd/psi (below 7 minimum)</div>
                    </div>
                  </li>
                )}
                {performanceAnalysis.current_tmp > 15 && performanceAnalysis.current_tmp <= 20 && (
                  <li className="flex items-start">
                    <span className="text-yellow-600 mr-2">⚠️</span>
                    <div>
                      <strong className="text-yellow-800">WARNING:</strong> Schedule cleaning within 3 days
                      <div className="text-yellow-600">TMP trending upward ({performanceAnalysis.current_tmp.toFixed(2)} psi)</div>
                    </div>
                  </li>
                )}
                {performanceAnalysis.tcsf_decline > 30 && performanceAnalysis.current_tcsf >= 7 && (
                  <li className="flex items-start">
                    <span className="text-yellow-600 mr-2">📉</span>
                    <div>
                      <strong className="text-yellow-800">DECLINING:</strong> Performance drop detected
                      <div className="text-yellow-600">TCSF declined {performanceAnalysis.tcsf_decline.toFixed(1)}% from baseline</div>
                    </div>
                  </li>
                )}
                {performanceAnalysis.current_tmp <= 15 && performanceAnalysis.current_tcsf >= 10 && performanceAnalysis.tcsf_decline <= 15 && (
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✅</span>
                    <div>
                      <strong className="text-green-800">HEALTHY:</strong> Continue normal monitoring
                      <div className="text-green-600">All parameters within optimal range</div>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* Planning Actions */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3">📅 Planning Actions (1-4 weeks)</h4>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">📈</span>
                  <div>
                    <strong>Trend Analysis:</strong> Review {results.length} days of performance data
                    <div className="text-blue-600">Monitor TCSF and TMP trends for early warning signs</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">🔄</span>
                  <div>
                    <strong>Optimize Operations:</strong> Adjust backwash frequency
                    <div className="text-blue-600">Based on current fouling rate and membrane condition</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">📊</span>
                  <div>
                    <strong>Reset Baseline:</strong> Establish new reference after cleaning
                    <div className="text-blue-600">Update tracking parameters for accurate monitoring</div>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">🎯</span>
                  <div>
                    <strong>Predictive Alerts:</strong> Set early warning thresholds
                    <div className="text-blue-600">Alert at 15% TCSF decline or TMP increase</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Cost Savings Summary */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-3">💰 Maintenance Value Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-semibold text-green-700 mb-2">Cost Avoidance:</h5>
                <ul className="space-y-1 text-green-600">
                  <li>• Prevent $10,000+ membrane replacement costs</li>
                  <li>• Avoid emergency shutdown losses</li>
                  <li>• Reduce chemical cleaning frequency</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-green-700 mb-2">Performance Benefits:</h5>
                <ul className="space-y-1 text-green-600">
                  <li>• Extend membrane life by 25-40%</li>
                  <li>• Maintain consistent water quality</li>
                  <li>• Optimize operational efficiency</li>
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
