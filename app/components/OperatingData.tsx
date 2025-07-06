"use client";

import React, { useState, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
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

interface ReferenceConditions {
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
  feedTDS: number;
  permeateTDS: number;
  avgConcentration: number;
  feedOsmoticPressure: number;
  permeateOsmoticPressure: number;
  netDrivingPressure: number;
  tempCorrectionFactor: number;
  normalizedSaltPassage: number;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentEntry, setCurrentEntry] = useState<LogEntry>({
    date: new Date().toISOString().split("T")[0],
    feedFlow: 0,
    feedPressure: 0,
    permeatePressure: 0,
    concentratePressure: 0,
    permeateFlow: 0,
    feedTemp: 0,
    feedConductivity: 0,
    permeateConductivity: 0,
  });
  
  // Convert Conductivity to TDS using the specified formulas
  const conductivityToTDS = (conductivity: number): number => {
    if (conductivity > 7630) {
      // High conductivity formula
      return 8.01E-11 * Math.exp(Math.pow((-50.6458 - Math.log(conductivity)), 2) / 112.484);
    } else {
      // Low conductivity formula
      return 7.70E-20 * Math.exp(Math.pow((-90.4756 - Math.log(conductivity)), 2) / 188.8844);
    }
  };

  // Temperature conversion (if needed - assuming input is already in Celsius)
  const fahrenheitToCelsius = (tempF: number): number => {
    return (tempF - 32) * 5/9;
  };

  // Temperature Correction Factor
  const calculateTempCorrectionFactor = (tempC: number): number => {
    return Math.exp(2640 * ((1/298.15) - 1/(tempC + 273.15)));
  };

  // Average Concentration Calculation
  const calculateAverageConcentration = (feedTDS: number, recovery: number): number => {
    if (recovery >= 1 || recovery <= 0) return feedTDS; // Avoid division by zero or invalid recovery
    return feedTDS * (Math.log(1/(1-recovery)) / recovery);
  };

  // Osmotic Pressure Calculation
  const calculateOsmoticPressure = (tds: number, tempC: number): number => {
    const tempK = tempC + 273.15;
    return (0.0385 * tds * tempK) / (1000 - (tds/1000)) / 14.5;
  };

  // Net Driving Pressure Calculation
  const calculateNetDrivingPressure = (
    feedPressure: number, 
    differentialPressure: number, 
    feedOsmoticPressure: number, 
    permeatePressure: number, 
    permeateOsmoticPressure: number
  ): number => {
    return feedPressure - (differentialPressure/2) - feedOsmoticPressure - permeatePressure + permeateOsmoticPressure;
  };
  
  // Create Excel template for download
  const createExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    const headers = [
      "Date", 
      "Feed Flow (m³/h)", 
      "Feed Pressure (bar)", 
      "Permeate Pressure (bar)", 
      "Concentrate Pressure (bar)", 
      "Permeate Flow (m³/h)", 
      "Feed Temp (°C)", 
      "Feed Conductivity (µS/cm)", 
      "Permeate Conductivity (µS/cm)"
    ];
    
    const sampleData = [
      new Date().toISOString().split("T")[0],
      "100.0", "800.0", "0.0", "780.0", "45.0", "25.0", "53000.0", "300.0"
    ];
    
    const wsData = [headers, sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    
    XLSX.utils.book_append_sheet(wb, ws, "RO Operating Data");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const template = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = URL.createObjectURL(template);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RO_Data_Template.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };
  
  // Handle file import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
      
      const importedLogs: LogEntry[] = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length < 9) continue;
        
        const entry: LogEntry = {
          date: row[0] || new Date().toISOString().split("T")[0],
          feedFlow: parseFloat(row[1]) || 0,
          feedPressure: parseFloat(row[2]) || 0,
          permeatePressure: parseFloat(row[3]) || 0,
          concentratePressure: parseFloat(row[4]) || 0,
          permeateFlow: parseFloat(row[5]) || 0,
          feedTemp: parseFloat(row[6]) || 0,
          feedConductivity: parseFloat(row[7]) || 0,
          permeateConductivity: parseFloat(row[8]) || 0,
        };
        
        importedLogs.push(entry);
      }
      
      const processedLogs = importedLogs.map((entry, index) => {
        const firstEntry = index === 0 ? entry : importedLogs[0];
        const results = calculateResults(entry, firstEntry);
        return { ...entry, ...results };
      });
      
      setLogs(processedLogs);
      localStorage.setItem("operatingData", JSON.stringify(processedLogs));
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    reader.readAsBinaryString(file);
  };
  
  // Export current data to Excel
  const exportToExcel = () => {
    if (logs.length === 0) {
      alert("No data to export");
      return;
    }
    
    const wb = XLSX.utils.book_new();
    
    const exportData = logs.map(log => ({
      "Date": log.date,
      "Feed Flow (m³/h)": log.feedFlow,
      "Feed Pressure (bar)": log.feedPressure,
      "Permeate Pressure (bar)": log.permeatePressure,
      "Concentrate Pressure (bar)": log.concentratePressure,
      "Permeate Flow (m³/h)": log.permeateFlow,
      "Feed Temp (°C)": log.feedTemp,
      "Feed Conductivity (µS/cm)": log.feedConductivity,
      "Permeate Conductivity (µS/cm)": log.permeateConductivity,
      "Days": log.days,
      "Differential Pressure (bar)": log.dP,
      "Recovery (%)": log.R,
      "Feed TDS (mg/L)": log.feedTDS,
      "Permeate TDS (mg/L)": log.permeateTDS,
      "Average Concentration (mg/L)": log.avgConcentration,
      "Feed Osmotic Pressure (bar)": log.feedOsmoticPressure,
      "Permeate Osmotic Pressure (bar)": log.permeateOsmoticPressure,
      "Net Driving Pressure (bar)": log.netDrivingPressure,
      "Temperature Correction Factor": log.tempCorrectionFactor,
      "Normalized Permeate Flow (m³/h)": log.NQp,
      "Normalized Salt Passage": log.normalizedSaltPassage,
      "Normalized Salt Rejection (%)": log.NSR * 100,
      "Normalized Differential Pressure (bar)": log.NdP
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "RO Operating Data");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RO_Operating_Data.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const [logs, setLogs] = useState<Array<LogEntry & CalculatedResults>>([]);

  const [referenceConditions, setReferenceConditions] = useState<ReferenceConditions>({
    feedFlow: 100,
    feedPressure: 800,
    permeatePressure: 0,
    concentratePressure: 780,
    permeateFlow: 45,
    feedTemp: 25,
    feedConductivity: 53000,
    permeateConductivity: 300,
  });

  const [useReferenceForNormalization, setUseReferenceForNormalization] = useState<boolean>(false);

  const [tankSizing, setTankSizing] = useState<TankSizing>({
    vesselCount: 10,
    elementsPerVessel: 6,
    vesselDiameter: 8,
    vesselLength: 20,
    pipeLength: 50,
    pipeDiameter: 4,
  });

  const [cleaningVolumes, setCleaningVolumes] = useState({
    vesselVolume: 0,
    pipeVolume: 0,
    totalVolume: 0,
  });

  const calculateResults = (entry: LogEntry, firstEntry?: LogEntry): CalculatedResults => {
    // Determine reference values
    const referenceEntry = useReferenceForNormalization ? referenceConditions : firstEntry || entry;

    // Step 1: Convert Conductivity to TDS
    const feedTDS = conductivityToTDS(entry.feedConductivity);
    const permeateTDS = conductivityToTDS(entry.permeateConductivity);
    const referenceFeedTDS = conductivityToTDS(referenceEntry.feedConductivity);
    const referencePermeateTDS = conductivityToTDS(referenceEntry.permeateConductivity);

    // Step 2: Basic Calculations
    const startDate = firstEntry ? new Date(firstEntry.date) : new Date(entry.date);
    const currentDate = new Date(entry.date);
    const days = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    const dP = entry.feedPressure - entry.concentratePressure;
    const F = entry.permeateFlow / entry.feedFlow; // Recovery as decimal
    const R = (1 - entry.permeateConductivity / entry.feedConductivity) * 100; // Salt rejection %

    const referenceRecovery = referenceEntry.permeateFlow / referenceEntry.feedFlow;

    // Step 3: Temperature Correction Factor
    const tempCorrectionFactor = calculateTempCorrectionFactor(entry.feedTemp);
    const referenceTempCorrectionFactor = calculateTempCorrectionFactor(referenceEntry.feedTemp);

    // Step 4: Average Concentration Calculation
    const avgConcentration = calculateAverageConcentration(feedTDS, F);
    const referenceAvgConcentration = calculateAverageConcentration(referenceFeedTDS, referenceRecovery);

    // Step 5: Osmotic Pressure Calculations
    const feedOsmoticPressure = calculateOsmoticPressure(avgConcentration, entry.feedTemp);
    const permeateOsmoticPressure = calculateOsmoticPressure(permeateTDS, entry.feedTemp);
    const referenceFeedOsmoticPressure = calculateOsmoticPressure(referenceAvgConcentration, referenceEntry.feedTemp);
    const referencePermeateOsmoticPressure = calculateOsmoticPressure(referencePermeateTDS, referenceEntry.feedTemp);

    // Step 6: Net Driving Pressure
    const netDrivingPressure = calculateNetDrivingPressure(
      entry.feedPressure, 
      dP, 
      feedOsmoticPressure, 
      entry.permeatePressure, 
      permeateOsmoticPressure
    );

    const referenceNetDrivingPressure = calculateNetDrivingPressure(
      referenceEntry.feedPressure,
      referenceEntry.feedPressure - referenceEntry.concentratePressure,
      referenceFeedOsmoticPressure,
      referenceEntry.permeatePressure,
      referencePermeateOsmoticPressure
    );

    // Step 7: Normalization Calculations
    
    // Normalized Permeate Flow
    let NQp = 0;
    if (netDrivingPressure > 0 && referenceNetDrivingPressure > 0) {
      NQp = entry.permeateFlow * 
            (referenceNetDrivingPressure * referenceTempCorrectionFactor) / 
            (netDrivingPressure * tempCorrectionFactor);
    }

    // Normalized Salt Passage
    const currentSaltPassage = permeateTDS / feedTDS;
    const referenceSaltPassage = referencePermeateTDS / referenceFeedTDS;
    
    const normalizedSaltPassage = currentSaltPassage * 
      (entry.permeateFlow * referenceTempCorrectionFactor * referenceAvgConcentration * referenceEntry.feedConductivity) /
      (referenceEntry.permeateFlow * tempCorrectionFactor * avgConcentration * entry.feedConductivity);

    // Normalized Salt Rejection
    const NSR = 1 - normalizedSaltPassage;

    // Normalized System Pressure (simplified - using temperature correction)
    const NSP = entry.feedPressure / tempCorrectionFactor;

    // Normalized Differential Pressure (flow-corrected)
    const concentrateFlow = entry.feedFlow - entry.permeateFlow;
    const referenceConcentrateFlow = referenceEntry.feedFlow - referenceEntry.permeateFlow;
    const NdP = Math.pow((entry.permeateFlow + 2 * concentrateFlow) / 
                        (referenceEntry.permeateFlow + 2 * referenceConcentrateFlow), 2) * dP;

    return { 
      days, 
      dP, 
      F, 
      R, 
      NQp, 
      NSP, 
      NSR, 
      NdP,
      feedTDS,
      permeateTDS,
      avgConcentration,
      feedOsmoticPressure,
      permeateOsmoticPressure,
      netDrivingPressure,
      tempCorrectionFactor,
      normalizedSaltPassage
    };
  };

  const handleInputChange = (field: keyof LogEntry, value: string) => {
    setCurrentEntry((prev) => ({
      ...prev,
      [field]: field === "date" ? value : Number(value),
    }));
  };

  const handleAddEntry = () => {
    const firstEntry = logs[0];
    const results = calculateResults(currentEntry, firstEntry);
    const newLogs = [...logs, { ...currentEntry, ...results }];
    setLogs(newLogs);

    localStorage.setItem("operatingData", JSON.stringify(newLogs));
    localStorage.setItem(
      "referenceConditions",
      JSON.stringify({
        values: referenceConditions,
        useForNormalization: useReferenceForNormalization,
      }),
    );

    setCurrentEntry({
      ...currentEntry,
      date: new Date().toISOString().split("T")[0],
    });
  };

  useEffect(() => {
    const savedLogs = localStorage.getItem("operatingData");
    const savedReferenceConditions = localStorage.getItem("referenceConditions");

    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }

    if (savedReferenceConditions) {
      const parsed = JSON.parse(savedReferenceConditions);
      setReferenceConditions(parsed.values);
      setUseReferenceForNormalization(parsed.useForNormalization);
    }
  }, []);

  const calculateCleaningVolumes = () => {
    const CONVERSION_FACTOR = 1 / (144 * 7.48);
    const vesselRadius = tankSizing.vesselDiameter / 2;
    const vesselLengthInches = tankSizing.vesselLength * 12;
    const pipeLengthInches = tankSizing.pipeLength * 12;
    const pipeRadius = tankSizing.pipeDiameter / 2;

    const vesselVolume = Math.PI * Math.pow(vesselRadius, 2) * vesselLengthInches * tankSizing.vesselCount * CONVERSION_FACTOR;
    const pipeVolume = Math.PI * Math.pow(pipeRadius, 2) * pipeLengthInches * CONVERSION_FACTOR;
    const totalVolume = vesselVolume + pipeVolume;

    setCleaningVolumes({
      vesselVolume: Math.round(vesselVolume),
      pipeVolume: Math.round(pipeVolume),
      totalVolume: Math.round(totalVolume),
    });
  };

  const getRecommendedFlowRate = (diameter: number) => {
    const flowRates = {
      2.5: "3-5 gpm (0.7-1.2 m³/h)",
      4: "8-10 gpm (1.8-2.3 m³/h)",
      6: "16-20 gpm (3.6-4.5 m³/h)",
      8: "30-45 gpm (6.0-10.2 m³/h)",
    };
    return flowRates[diameter as keyof typeof flowRates] || "N/A";
  };

  const handleTankSizingChange = (field: keyof TankSizing, value: string) => {
    setTankSizing((prev) => ({
      ...prev,
      [field]: Number(value),
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">
        RO Membrane Evaluation
      </h2>

      {/* Reference Conditions */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-blue-700">
            Reference Conditions
          </h3>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useReference"
              checked={useReferenceForNormalization}
              onChange={() => setUseReferenceForNormalization(!useReferenceForNormalization)}
              className="mr-2"
            />
            <label htmlFor="useReference" className="text-sm text-gray-700">
              Use for normalization
            </label>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          These reference values will be used as the baseline for normalization calculations when enabled. 
          Otherwise, the first log entry will be used as the baseline. Enter the value based on your 
          operating data at start up or based on the operating design of your RO membrane.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.keys(referenceConditions).map((key) => (
            <div key={key} className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {key === "feedFlow" ? "Feed Flow (m³/h)" :
                 key === "feedPressure" ? "Feed Press. (bar)" :
                 key === "permeatePressure" ? "Perm. Press. (bar)" :
                 key === "concentratePressure" ? "Conc. Press. (bar)" :
                 key === "permeateFlow" ? "Perm. Flow (m³/h)" :
                 key === "feedTemp" ? "Feed Temp. (°C)" :
                 key === "feedConductivity" ? "Feed Cond. (µS/cm)" :
                 "Perm. Cond. (µS/cm)"}
              </label>
              <input
                type="number"
                value={referenceConditions[key as keyof ReferenceConditions]}
                onChange={(e) =>
                  setReferenceConditions((prev) => ({
                    ...prev,
                    [key]: Number(e.target.value),
                  }))
                }
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Input Table */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Input Parameters</h3>
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Import Excel
            </button>
            <button
              onClick={exportToExcel}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
              disabled={logs.length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 010 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L2 10.586V4a1 1 0 012 0v6.586l1.293-1.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Export Data
            </button>
            <button
              onClick={createExcelTemplate}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
              </svg>
              Download Template
            </button>
          </div>
        </div>
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
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    className="w-full"
                  />
                </td>
                {Object.keys(currentEntry).map((key) => {
                  if (key === "date") return null;
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

      {/* Import/Export Help */}
      <div className="mb-4 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
        <h4 className="font-semibold mb-1">Import/Export Instructions:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Import Excel:</strong> Upload data from an Excel file. The file should match the template format.</li>
          <li><strong>Export Data:</strong> Download current data as an Excel file including all calculated results.</li>
          <li><strong>Download Template:</strong> Get a blank Excel template with the correct format for data import.</li>
        </ul>
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
                <th className="px-4 py-2 border">Recovery (%)</th>
                <th className="px-4 py-2 border">Salt Rejection (%)</th>
                <th className="px-4 py-2 border">Feed TDS (mg/L)</th>
                <th className="px-4 py-2 border">Permeate TDS (mg/L)</th>
                <th className="px-4 py-2 border">Net Driving Pressure (bar)</th>
                <th className="px-4 py-2 border">Normalized Permeate Flow (m³/h)</th>
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
                  <td className="px-4 py-2 border">{log.feedTDS.toFixed(0)}</td>
                  <td className="px-4 py-2 border">{log.permeateTDS.toFixed(0)}</td>
                  <td className="px-4 py-2 border">{log.netDrivingPressure.toFixed(2)}</td>
                  <td className="px-4 py-2 border">{log.NQp.toFixed(2)}</td>
                  <td className="px-4 py-2 border">{(log.NSR * 100).toFixed(2)}</td>
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
            labels: logs.map((log) => log.date),
            datasets: [
              {
                label: "Normalized Permeate Flow (m³/h)",
                data: logs.map((log) => log.NQp),
                borderColor: "rgb(75, 192, 192)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
              },
              {
                label: "Net Driving Pressure (bar)",
                data: logs.map((log) => log.netDrivingPressure),
                borderColor: "rgb(255, 99, 132)",
                backgroundColor: "rgba(255, 99, 132, 0.2)",
              },
              {
                label: "Normalized Salt Rejection (%)",
                data: logs.map((log) => log.NSR * 100),
                borderColor: "rgb(153, 102, 255)",
                backgroundColor: "rgba(153, 102, 255, 0.2)",
              },
              {
                label: "Normalized Differential Pressure (bar)",
                data: logs.map((log) => log.NdP),
                borderColor: "rgb(255, 159, 64)",
                backgroundColor: "rgba(255, 159, 64, 0.2)",
              },
            ],
          }}
          options={{
            responsive: true,
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  text: "Date",
                },
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: "Value",
                },
              },
            },
          }}
        />
      </div>

      {/* Cleaning Requirements Display */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Cleaning Requirements Analysis</h3>
        <div className="mb-2 text-sm text-gray-700">
          <strong>Baseline source:</strong>{" "}
          {useReferenceForNormalization ? "Reference Conditions" : "First Log Entry"}
        </div>
        {logs.length >= 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const latest = logs[logs.length - 1];
              const baselineValues = useReferenceForNormalization
                ? calculateResults(referenceConditions as LogEntry)
                : logs[0];

              const flowDecline = ((latest.NQp - baselineValues.NQp) / baselineValues.NQp) * 100;
              const saltRejectionChange = ((latest.NSR - baselineValues.NSR) / baselineValues.NSR) * 100;
              const pressureDropIncrease = ((latest.NdP - baselineValues.NdP) / baselineValues.NdP) * 100;

              return (
                <>
                  <div className={`p-4 rounded-lg ${flowDecline <= -10 ? "bg-red-100" : "bg-green-100"}`}>
                    <h4 className="font-semibold">Normalized Flow Decline</h4>
                    <p className="text-2xl font-bold">{flowDecline.toFixed(2)}%</p>
                    <p className="text-sm mt-2">
                      {flowDecline <= -10 ? "Cleaning Required" : "Within Normal Range"}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${saltRejectionChange <= -5 ? "bg-red-100" : "bg-green-100"}`}>
                    <h4 className="font-semibold">Salt Rejection Change</h4>
                    <p className="text-2xl font-bold">{saltRejectionChange.toFixed(2)}%</p>
                    <p className="text-sm mt-2">
                      {saltRejectionChange <= -5 ? "Cleaning Required" : "Within Normal Range"}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${pressureDropIncrease >= 15 ? "bg-red-100" : "bg-green-100"}`}>
                    <h4 className="font-semibold">Pressure Drop Increase</h4>
                    <p className="text-2xl font-bold">{pressureDropIncrease.toFixed(2)}%</p>
                    <p className="text-sm mt-2">
                      {pressureDropIncrease >= 15 ? "Cleaning Required" : "Within Normal Range"}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        )}
        {logs.length < 1 && (
          <p className="text-gray-600">
            At least one data point is needed to analyze cleaning requirements.
          </p>
        )}
      </div>

      {/* Cleaning Tank Sizing Calculator */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-semibold mb-4">Cleaning Tank Sizing Calculator</h3>

        {/* Vessel Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Vessels</label>
            <input
              type="number"
              value={tankSizing.vesselCount}
              onChange={(e) => handleTankSizingChange("vesselCount", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Elements per Vessel</label>
            <input
              type="number"
              value={tankSizing.elementsPerVessel}
              onChange={(e) => handleTankSizingChange("elementsPerVessel", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vessel Diameter (inches)</label>
            <input
              type="number"
              value={tankSizing.vesselDiameter}
              onChange={(e) => handleTankSizingChange("vesselDiameter", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vessel Length (feet)</label>
            <input
              type="number"
              value={tankSizing.vesselLength}
              onChange={(e) => handleTankSizingChange("vesselLength", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pipe Length (feet)</label>
            <input
              type="number"
              value={tankSizing.pipeLength}
              onChange={(e) => handleTankSizingChange("pipeLength", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pipe Diameter (inches)</label>
            <input
              type="number"
              value={tankSizing.pipeDiameter}
              onChange={(e) => handleTankSizingChange("pipeDiameter", e.target.value)}
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

      {/* Calculation Details */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-800">Calculation Method Details</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>TDS Conversion:</strong> Uses industry-standard formulas based on conductivity ranges (&gt;7630 µS/cm vs ≤7630 µS/cm)</p>
          <p><strong>Temperature Correction:</strong> Exponential correction factor: exp(2640 × ((1/298.15) - 1/(T+273.15)))</p>
          <p><strong>Osmotic Pressure:</strong> Calculated using: 0.0385 × TDS × (T+273.15) / (1000 - TDS/1000) / 14.5</p>
          <p><strong>Net Driving Pressure:</strong> Feed Pressure - (ΔP/2) - Feed Osmotic Pressure - Permeate Pressure + Permeate Osmotic Pressure</p>
          <p><strong>Normalized Flow:</strong> Current Flow × (Baseline NDP × Baseline TCF) / (Current NDP × Current TCF)</p>
          <p><strong>Normalized Salt Passage:</strong> Complex formula accounting for flow rates, temperature, and concentration effects</p>
        </div>
      </div>
    </div>
  );
};

export default OperatingData;
