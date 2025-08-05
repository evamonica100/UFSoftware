"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface WaterAnalysis {
  // Cations (mg/L)
  ca: number;
  mg: number;
  na: number;
  k: number;
  // Anions (mg/L)
  hco3: number;
  cl: number;
  so4: number;
  f: number;
  sio2: number;
  // Other parameters
  tds: number;
  ph: number;
  temperature: number;
}

interface SystemParameters {
  feedFlow: number;
  permeateFlow: number;
  recovery: number;
  membraneRejection: number; // Overall rejection %
  antiscalantDose: number;
}

interface ScalingResults {
  concentrationFactor: number;
  feedComposition: WaterAnalysis;
  permeateComposition: WaterAnalysis;
  concentrateComposition: WaterAnalysis;
  scalingSaturation: {
    caco3: { noChem: number; withTreatment: number; };
    caso4: { noChem: number; withTreatment: number; };
    sio2: { noChem: number; withTreatment: number; };
    caf2: { noChem: number; withTreatment: number; };
  };
  antiscalantEfficiency: number;
}

// Temperature-dependent Ksp calculations
const getCaCO3Ksp = (temperature: number): number => {
  const tempK = temperature + 273.15;
  const ksp25 = 3.36e-9;
  const deltaH = -12100;
  const R = 8.314;
  return ksp25 * Math.exp((deltaH / R) * (1/298.15 - 1/tempK));
};

const getCaSO4Ksp = (temperature: number): number => {
  const tempK = temperature + 273.15;
  const ksp25 = 2.4e-5;
  const deltaH = 17200;
  const R = 8.314;
  return ksp25 * Math.exp((deltaH / R) * (1/298.15 - 1/tempK));
};

const calculateActivityCoefficient = (charge: number, ionicStrength: number): number => {
  const A = 0.5085;
  const sqrtI = Math.sqrt(ionicStrength);
  const logGamma = -A * charge * charge * sqrtI / (1 + sqrtI);
  return Math.pow(10, logGamma);
};

const ROScalingAssessment = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [waterAnalysis, setWaterAnalysis] = useState<WaterAnalysis>({
    ca: 355,
    mg: 1150,
    na: 10700,
    k: 360,
    hco3: 152.39,
    cl: 18400,
    so4: 2900,
    f: 1.8,
    sio2: 1.0,
    tds: 34020,
    ph: 6.8,
    temperature: 32,
  });

  const [systemParams, setSystemParams] = useState<SystemParameters>({
    feedFlow: 398,
    permeateFlow: 326.4,
    recovery: 82,
    membraneRejection: 99.3, // Overall rejection %
    antiscalantDose: 2.0, // mg/L
  });

  const [results, setResults] = useState<ScalingResults | null>(null);

  // Calculate concentration factor
  const calculateConcentrationFactor = (recovery: number): number => {
    return 1 / (1 - recovery / 100);
  };

  // Calculate antiscalant efficiency based on dose
  const calculateAntiscalantEfficiency = (dose: number): number => {
    // Simplified efficiency: 2 mg/L gives ~50% reduction in scaling potential
    const efficiency = Math.min(dose * 25, 80); // Max 80% reduction
    return efficiency / 100;
  };

  // Calculate rigorous ionic strength using half-sum formula
const calculateRigorousIonicStrength = (composition: WaterAnalysis): number => {
  // Ion data: [concentration_mg/L, molecular_weight_g/mol, charge]
  const ions = [
    { conc: composition.ca, mw: 40.08, charge: 2 },     // Ca²⁺
    { conc: composition.mg, mw: 24.31, charge: 2 },     // Mg²⁺
    { conc: composition.na, mw: 22.99, charge: 1 },     // Na⁺
    { conc: composition.k, mw: 39.10, charge: 1 },      // K⁺
    { conc: composition.hco3, mw: 61.02, charge: 1 },   // HCO₃⁻
    { conc: composition.cl, mw: 35.45, charge: 1 },     // Cl⁻
    { conc: composition.so4, mw: 96.06, charge: 2 },    // SO₄²⁻
    { conc: composition.f, mw: 19.00, charge: 1 }       // F⁻
  ];
  
  let ionicStrength = 0;
  
  ions.forEach(ion => {
    // Convert mg/L to molarity: (mg/L) / (MW g/mol × 1000)
    const molarity = (ion.conc / 1000) / ion.mw;
    // Add contribution: Ci × Zi²
    ionicStrength += molarity * ion.charge * ion.charge;
  });
  
  // Apply half-sum formula: I = ½ × Σ(Ci × Zi²)
  return ionicStrength / 2;
};
// Calculate scaling saturation percentage
  const calculateScalingSaturation = (
    feedConc: number,
    concentrateConc: number,
    compound: string,
    concentrateComp: WaterAnalysis
  ): number => {
    
    switch (compound) {
      case 'caco3': {
        const caMolar = (concentrateComp.ca / 1000) / 40.08;
        const hco3Molar = (concentrateComp.hco3 / 1000) / 61.02;
        
        const h = Math.pow(10, -concentrateComp.ph);
        const k2 = 4.69e-11;
        const tempK = concentrateComp.temperature + 273.15;
        const k2Temp = k2 * Math.exp(1760 * (1/298.15 - 1/tempK));
        
        const co3Molar = (k2Temp * hco3Molar) / h;
        const ionicStrength = calculateRigorousIonicStrength(concentrateComp);
        const gammaCa = calculateActivityCoefficient(2, ionicStrength);
        const gammaCO3 = calculateActivityCoefficient(2, ionicStrength);
        
        const ionProduct = (caMolar * gammaCa) * (co3Molar * gammaCO3);
        const ksp = getCaCO3Ksp(concentrateComp.temperature);
        
        return (ionProduct / ksp) * 100;
      }
      
      case 'caso4': {
        const caMolar = (concentrateComp.ca / 1000) / 40.08;
        const so4Molar = (concentrateComp.so4 / 1000) / 96.06;
        
        const ionicStrength = calculateRigorousIonicStrength(concentrateComp);
        const gammaCa = calculateActivityCoefficient(2, ionicStrength);
        const gammaSO4 = calculateActivityCoefficient(2, ionicStrength);
        
        const ionProduct = (caMolar * gammaCa) * (so4Molar * gammaSO4);
        const ksp = getCaSO4Ksp(concentrateComp.temperature);
        
        return (ionProduct / ksp) * 100;
      }
      
      case 'sio2': {
        const tempK = concentrateComp.temperature + 273.15;
        const maxSolubility = Math.exp(4.52 - 731/tempK) * 60080; // mg/L
        return (concentrateComp.sio2 / maxSolubility) * 100;
      }
      
      case 'caf2': {
        const caMolar = (concentrateComp.ca / 1000) / 40.08;
        const fMolar = (concentrateComp.f / 1000) / 18.998;
        
        const ionicStrength = calculateRigorousIonicStrength(concentrateComp);
        const gammaCa = calculateActivityCoefficient(2, ionicStrength);
        const gammaF = calculateActivityCoefficient(1, ionicStrength);
        
        const ionProduct = (caMolar * gammaCa) * Math.pow(fMolar * gammaF, 2);
        const ksp25 = 3.9e-11;
        const tempK = concentrateComp.temperature + 273.15;
        const ksp = ksp25 * Math.exp((15900/8.314) * (1/298.15 - 1/tempK));
        
        return (ionProduct / ksp) * 100;
      }
      
      default:
        return 0;
    }
  };

  // Main calculation function
  const calculateScaling = (): ScalingResults => {
    const concFactor = calculateConcentrationFactor(systemParams.recovery);
    const rejectionDecimal = systemParams.membraneRejection / 100;
    const antiscalantEff = calculateAntiscalantEfficiency(systemParams.antiscalantDose);

    // Calculate permeate composition (what passes through membrane)
    const permeateComp: WaterAnalysis = {
      ca: waterAnalysis.ca * (1 - rejectionDecimal),
      mg: waterAnalysis.mg * (1 - rejectionDecimal),
      na: waterAnalysis.na * (1 - rejectionDecimal),
      k: waterAnalysis.k * (1 - rejectionDecimal),
      hco3: waterAnalysis.hco3 * (1 - rejectionDecimal),
      cl: waterAnalysis.cl * (1 - rejectionDecimal),
      so4: waterAnalysis.so4 * (1 - rejectionDecimal),
      f: waterAnalysis.f * (1 - rejectionDecimal),
      sio2: waterAnalysis.sio2 * (1 - rejectionDecimal),
      tds: waterAnalysis.tds * (1 - rejectionDecimal),
      ph: waterAnalysis.ph, // pH doesn't concentrate linearly
      temperature: waterAnalysis.temperature,
    };

    // Calculate concentrate composition (concentrated reject stream)
    const concentrateComp: WaterAnalysis = {
      ca: waterAnalysis.ca * concFactor,
      mg: waterAnalysis.mg * concFactor,
      na: waterAnalysis.na * concFactor,
      k: waterAnalysis.k * concFactor,
      hco3: waterAnalysis.hco3 * concFactor,
      cl: waterAnalysis.cl * concFactor,
      so4: waterAnalysis.so4 * concFactor,
      f: waterAnalysis.f * concFactor,
      sio2: waterAnalysis.sio2 * concFactor,
      tds: waterAnalysis.tds * concFactor,
      ph: waterAnalysis.ph + (0.1 * Math.log10(concFactor)), // Conservative pH increase
      temperature: waterAnalysis.temperature,
    };

    // Calculate scaling saturations
const scalingSaturation = {
      caco3: {
        noChem: calculateScalingSaturation(waterAnalysis.ca, concentrateComp.ca, 'caco3', concentrateComp),
        withTreatment: calculateScalingSaturation(waterAnalysis.ca, concentrateComp.ca, 'caco3', concentrateComp) * (1 - antiscalantEff)
      },
      caso4: {
        noChem: calculateScalingSaturation(waterAnalysis.ca, concentrateComp.ca, 'caso4', concentrateComp),
        withTreatment: calculateScalingSaturation(waterAnalysis.ca, concentrateComp.ca, 'caso4', concentrateComp) * (1 - antiscalantEff)
      },
      sio2: {
        noChem: calculateScalingSaturation(waterAnalysis.sio2, concentrateComp.sio2, 'sio2', concentrateComp),
        withTreatment: calculateScalingSaturation(waterAnalysis.sio2, concentrateComp.sio2, 'sio2', concentrateComp) * (1 - antiscalantEff * 0.3)
      },
      caf2: {
        noChem: calculateScalingSaturation(waterAnalysis.f, concentrateComp.f, 'caf2', concentrateComp),
        withTreatment: calculateScalingSaturation(waterAnalysis.f, concentrateComp.f, 'caf2', concentrateComp) * (1 - antiscalantEff * 0.8)
      }
    };

    return {
      concentrationFactor: concFactor,
      feedComposition: waterAnalysis,
      permeateComposition: permeateComp,
      concentrateComposition: concentrateComp,
      scalingSaturation,
      antiscalantEfficiency: antiscalantEff * 100, // Convert to percentage
    };
  };

  // Handle calculation
  const handleCalculate = () => {
    const calculatedResults = calculateScaling();
    setResults(calculatedResults);
    localStorage.setItem("roScalingResults", JSON.stringify(calculatedResults));
    localStorage.setItem("waterAnalysis", JSON.stringify(waterAnalysis));
    localStorage.setItem("systemParams", JSON.stringify(systemParams));
  };

  // Export results to Excel
  const exportToExcel = () => {
    if (!results) {
      alert("Please calculate results first");
      return;
    }

    const wb = XLSX.utils.book_new();

    // System Information
    const systemInfo = [
      ["System Information", "", ""],
      ["Feed Water Type", "Sea Water", ""],
      ["Feed Water Flow", systemParams.feedFlow, "m³/hr"],
      ["Permeate Flow", systemParams.permeateFlow, "m³/hr"],
      ["System Recovery", systemParams.recovery, "%"],
      ["Feed Temperature", waterAnalysis.temperature, "°C"],
      ["Membrane Rejection", systemParams.membraneRejection, "%"],
      ["", "", ""],
      ["Antiscalant Dose Rate", systemParams.antiscalantDose, "mg/L Feed"],
      ["", "", ""],
    ];

    // Water Analysis
    const waterAnalysisData = [
      ["Water Analysis", "Feed", "Permeate", "Concentrate"],
      ["Ions (mg/L)", "", "", ""],
      ["Ca", results.feedComposition.ca, results.permeateComposition.ca.toFixed(2), results.concentrateComposition.ca.toFixed(0)],
      ["Mg", results.feedComposition.mg, results.permeateComposition.mg.toFixed(2), results.concentrateComposition.mg.toFixed(0)],
      ["Na", results.feedComposition.na, results.permeateComposition.na.toFixed(2), results.concentrateComposition.na.toFixed(0)],
      ["K", results.feedComposition.k, results.permeateComposition.k.toFixed(2), results.concentrateComposition.k.toFixed(0)],
      ["HCO3", results.feedComposition.hco3, results.permeateComposition.hco3.toFixed(2), results.concentrateComposition.hco3.toFixed(0)],
      ["Cl", results.feedComposition.cl, results.permeateComposition.cl.toFixed(2), results.concentrateComposition.cl.toFixed(0)],
      ["SO4", results.feedComposition.so4, results.permeateComposition.so4.toFixed(2), results.concentrateComposition.so4.toFixed(0)],
      ["F", results.feedComposition.f, results.permeateComposition.f.toFixed(2), results.concentrateComposition.f.toFixed(2)],
      ["SiO2", results.feedComposition.sio2, results.permeateComposition.sio2.toFixed(2), results.concentrateComposition.sio2.toFixed(2)],
      ["TDS", results.feedComposition.tds, results.permeateComposition.tds.toFixed(0), results.concentrateComposition.tds.toFixed(0)],
      ["pH", results.feedComposition.ph, results.permeateComposition.ph.toFixed(2), results.concentrateComposition.ph.toFixed(2)],
    ];

    // Scaling Results
    const scalingData = [
      ["Scaling Analysis", "No Chem (%)", "With Treatment (%)"],
      ["CaCO3", results.scalingSaturation.caco3.noChem.toFixed(1), results.scalingSaturation.caco3.withTreatment.toFixed(1)],
      ["CaSO4", results.scalingSaturation.caso4.noChem.toFixed(1), results.scalingSaturation.caso4.withTreatment.toFixed(1)],
      ["SiO2", results.scalingSaturation.sio2.noChem.toFixed(1), results.scalingSaturation.sio2.withTreatment.toFixed(1)],
      ["CaF2", results.scalingSaturation.caf2.noChem.toFixed(1), results.scalingSaturation.caf2.withTreatment.toFixed(1)],
      ["", "", ""],
      ["Concentration Factor", results.concentrationFactor.toFixed(2), ""],
      ["Antiscalant Efficiency", results.antiscalantEfficiency.toFixed(1) + "%", ""],
    ];

    const systemWs = XLSX.utils.aoa_to_sheet(systemInfo);
    const waterWs = XLSX.utils.aoa_to_sheet(waterAnalysisData);
    const scalingWs = XLSX.utils.aoa_to_sheet(scalingData);

    XLSX.utils.book_append_sheet(wb, systemWs, "System Info");
    XLSX.utils.book_append_sheet(wb, waterWs, "Water Analysis");
    XLSX.utils.book_append_sheet(wb, scalingWs, "Scaling Results");

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RO_Scaling_Assessment.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Load saved data on component mount
  useEffect(() => {
    const savedWaterAnalysis = localStorage.getItem("waterAnalysis");
    const savedSystemParams = localStorage.getItem("systemParams");
    const savedResults = localStorage.getItem("roScalingResults");

    if (savedWaterAnalysis) {
      setWaterAnalysis(JSON.parse(savedWaterAnalysis));
    }
    if (savedSystemParams) {
      setSystemParams(JSON.parse(savedSystemParams));
    }
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">
        RO Membrane Scaling Potential Assessment
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* System Parameters */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">System Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feed Flow (m³/hr)</label>
                <input
                  type="number"
                  value={systemParams.feedFlow}
                  onChange={(e) => setSystemParams(prev => ({ ...prev, feedFlow: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permeate Flow (m³/hr)</label>
                <input
                  type="number"
                  value={systemParams.permeateFlow}
                  onChange={(e) => {
                    const permeateFlow = Number(e.target.value);
                    const recovery = (permeateFlow / systemParams.feedFlow) * 100;
                    setSystemParams(prev => ({ 
                      ...prev, 
                      permeateFlow,
                      recovery: Number(recovery.toFixed(1))
                    }));
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Recovery (%)</label>
                <input
                  type="number"
                  value={systemParams.recovery}
                  onChange={(e) => {
                    const recovery = Number(e.target.value);
                    const permeateFlow = (recovery / 100) * systemParams.feedFlow;
                    setSystemParams(prev => ({ 
                      ...prev, 
                      recovery,
                      permeateFlow: Number(permeateFlow.toFixed(1))
                    }));
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feed Temperature (°C)</label>
                <input
                  type="number"
                  value={waterAnalysis.temperature}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Membrane Rejection (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={systemParams.membraneRejection}
                  onChange={(e) => setSystemParams(prev => ({ ...prev, membraneRejection: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Antiscalant Dose (mg/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={systemParams.antiscalantDose}
                  onChange={(e) => setSystemParams(prev => ({ ...prev, antiscalantDose: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Water Analysis */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">Feed Water Analysis</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calcium (Ca) mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.ca}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, ca: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Magnesium (Mg) mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.mg}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, mg: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sodium (Na) mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.na}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, na: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Potassium (K) mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.k}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, k: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bicarbonate (HCO3) mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.hco3}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, hco3: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chloride (Cl) mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.cl}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, cl: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sulfate (SO4) mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.so4}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, so4: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fluoride (F) mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.f}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, f: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Silica (SiO2) mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.sio2}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, sio2: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TDS mg/L</label>
                <input
                  type="number"
                  value={waterAnalysis.tds}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, tds: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">pH</label>
                <input
                  type="number"
                  step="0.1"
                  value={waterAnalysis.ph}
                  onChange={(e) => setWaterAnalysis(prev => ({ ...prev, ph: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleCalculate}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Calculate Scaling Potential
            </button>
            <button
              onClick={exportToExcel}
              disabled={!results}
              className="bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
            >
              Export Results
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {results && (
            <>
              {/* Key Metrics */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">System Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Concentration Factor</div>
                    <div className="text-2xl font-bold text-blue-800">{results.concentrationFactor.toFixed(2)}x</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Recovery Rate</div>
                    <div className="text-2xl font-bold text-blue-800">{systemParams.recovery}%</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Membrane Rejection</div>
                    <div className="text-2xl font-bold text-blue-800">{systemParams.membraneRejection}%</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Antiscalant Efficiency</div>
                    <div className="text-2xl font-bold text-green-600">{results.antiscalantEfficiency.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Scaling Potential Chart */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Concentrate Solubilities</h3>
                <Bar
                  data={{
                    labels: ['CaCO₃', 'CaSO₄', 'SiO₂', 'CaF₂'],
                    datasets: [
                      {
                        label: 'NO CHEM',
                        data: [
                          results.scalingSaturation.caco3.noChem,
                          results.scalingSaturation.caso4.noChem,
                          results.scalingSaturation.sio2.noChem,
                          results.scalingSaturation.caf2.noChem
                        ],
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                      },
                      {
                        label: 'WITH TREATMENT',
                        data: [
                          results.scalingSaturation.caco3.withTreatment,
                          results.scalingSaturation.caso4.withTreatment,
                          results.scalingSaturation.sio2.withTreatment,
                          results.scalingSaturation.caf2.withTreatment
                        ],
                        backgroundColor: 'rgba(75, 192, 192, 0.8)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Percent of Saturation'
                        },
                        ticks: {
                          callback: function(value) {
                            return value + '%';
                          }
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Scale Forming Compound'
                        }
                      }
                    }
                  }}
                />
                
                {/* Add red line at 100% like in the original report */}
                <div className="mt-2 text-xs text-gray-600 text-center">
                  <span className="inline-block w-8 h-0.5 bg-red-500 mr-2"></span>
                  100% Saturation Limit
                </div>
              </div>

              {/* Saturation Table */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Saturation Analysis</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded border text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Compound</th>
                        <th className="px-3 py-2 text-center">Feed</th>
                        <th className="px-3 py-2 text-center">Concentrate</th>
                        <th className="px-3 py-2 text-center">With Treatment</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">CaCO₃</td>
                        <td className="px-3 py-2 text-center">{(results.scalingSaturation.caco3.noChem / results.concentrationFactor).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{results.scalingSaturation.caco3.noChem.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{results.scalingSaturation.caco3.withTreatment.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            results.scalingSaturation.caco3.withTreatment > 100 ? 'bg-red-100 text-red-800' :
                            results.scalingSaturation.caco3.withTreatment > 80 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {results.scalingSaturation.caco3.withTreatment > 100 ? 'HIGH RISK' :
                             results.scalingSaturation.caco3.withTreatment > 80 ? 'MODERATE' : 'LOW RISK'}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">CaSO₄</td>
                        <td className="px-3 py-2 text-center">{(results.scalingSaturation.caso4.noChem / results.concentrationFactor).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{results.scalingSaturation.caso4.noChem.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{results.scalingSaturation.caso4.withTreatment.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            results.scalingSaturation.caso4.withTreatment > 100 ? 'bg-red-100 text-red-800' :
                            results.scalingSaturation.caso4.withTreatment > 80 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {results.scalingSaturation.caso4.withTreatment > 100 ? 'HIGH RISK' :
                             results.scalingSaturation.caso4.withTreatment > 80 ? 'MODERATE' : 'LOW RISK'}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">SiO₂</td>
                        <td className="px-3 py-2 text-center">{(results.scalingSaturation.sio2.noChem / results.concentrationFactor).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{results.scalingSaturation.sio2.noChem.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{results.scalingSaturation.sio2.withTreatment.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            results.scalingSaturation.sio2.withTreatment > 100 ? 'bg-red-100 text-red-800' :
                            results.scalingSaturation.sio2.withTreatment > 80 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {results.scalingSaturation.sio2.withTreatment > 100 ? 'HIGH RISK' :
                             results.scalingSaturation.sio2.withTreatment > 80 ? 'MODERATE' : 'LOW RISK'}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">CaF₂</td>
                        <td className="px-3 py-2 text-center">{(results.scalingSaturation.caf2.noChem / results.concentrationFactor).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{results.scalingSaturation.caf2.noChem.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{results.scalingSaturation.caf2.withTreatment.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            results.scalingSaturation.caf2.withTreatment > 100 ? 'bg-red-100 text-red-800' :
                            results.scalingSaturation.caf2.withTreatment > 80 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {results.scalingSaturation.caf2.withTreatment > 100 ? 'HIGH RISK' :
                             results.scalingSaturation.caf2.withTreatment > 80 ? 'MODERATE' : 'LOW RISK'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Water Analysis Results */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Water Analysis Results</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded border text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Ions (mg/L)</th>
                        <th className="px-3 py-2 text-center">Feed</th>
                        <th className="px-3 py-2 text-center">Permeate</th>
                        <th className="px-3 py-2 text-center">Concentrate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">Ca</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.ca.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.ca.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.ca.toFixed(0)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">Mg</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.mg.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.mg.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.mg.toFixed(0)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">Na</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.na.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.na.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.na.toFixed(0)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">K</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.k.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.k.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.k.toFixed(0)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">HCO₃</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.hco3.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.hco3.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.hco3.toFixed(0)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">Cl</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.cl.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.cl.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.cl.toFixed(0)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">SO₄</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.so4.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.so4.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.so4.toFixed(0)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">F</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.f.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.f.toFixed(3)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.f.toFixed(2)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">SiO₂</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.sio2.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.sio2.toFixed(3)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.sio2.toFixed(2)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">TDS</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.tds.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.tds.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.tds.toFixed(0)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">pH</td>
                        <td className="px-3 py-2 text-center">{results.feedComposition.ph.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{results.permeateComposition.ph.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{results.concentrateComposition.ph.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white border-l-4 border-blue-500 p-4 rounded">
                <h3 className="text-lg font-semibold text-blue-700 mb-3">System Recommendations</h3>
                <div className="space-y-2 text-sm">
                  {results.scalingSaturation.caco3.withTreatment > 100 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <strong className="text-red-800">⚠️ CaCO₃ Scaling Risk:</strong>
                      <p className="text-red-700">High calcium carbonate scaling potential ({results.scalingSaturation.caco3.withTreatment.toFixed(1)}%). Consider increasing antiscalant dose or reducing recovery rate.</p>
                    </div>
                  )}
                  
                  {results.scalingSaturation.caso4.withTreatment > 100 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <strong className="text-red-800">⚠️ CaSO₄ Scaling Risk:</strong>
                      <p className="text-red-700">High calcium sulfate scaling potential ({results.scalingSaturation.caso4.withTreatment.toFixed(1)}%). Consider reducing recovery or increasing antiscalant dose.</p>
                    </div>
                  )}

                  {results.scalingSaturation.sio2.withTreatment > 100 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <strong className="text-red-800">⚠️ SiO₂ Scaling Risk:</strong>
                      <p className="text-red-700">High silica scaling potential ({results.scalingSaturation.sio2.withTreatment.toFixed(1)}%). Consider reducing recovery rate or adding dispersant.</p>
                    </div>
                  )}

                  {systemParams.recovery > 85 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <strong className="text-yellow-800">⚠️ High Recovery Rate:</strong>
                      <p className="text-yellow-700">Recovery rate of {systemParams.recovery}% is high. Monitor scaling indices closely and consider frequent cleaning cycles.</p>
                    </div>
                  )}

                  {systemParams.antiscalantDose < 1.5 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <strong className="text-yellow-800">⚠️ Low Antiscalant Dose:</strong>
                      <p className="text-yellow-700">Antiscalant dose of {systemParams.antiscalantDose} mg/L may be insufficient for high scaling conditions. Consider increasing to 2-3 mg/L.</p>
                    </div>
                  )}

                  {/* Positive recommendations */}
                  {results.scalingSaturation.caco3.withTreatment < 80 && 
                   results.scalingSaturation.caso4.withTreatment < 80 && 
                   results.scalingSaturation.sio2.withTreatment < 80 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <strong className="text-green-800">✅ Low Scaling Risk:</strong>
                      <p className="text-green-700">All scaling indices are within acceptable limits. Current operating conditions and antiscalant dose are suitable.</p>
                    </div>
                  )}

                  {results.concentrationFactor < 5 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <strong className="text-green-800">✅ Conservative Operation:</strong>
                      <p className="text-green-700">Concentration factor of {results.concentrationFactor.toFixed(2)}x indicates conservative operation with good margin for scaling control.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!results && (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <div className="text-gray-500 text-lg mb-2">No Results Yet</div>
              <p className="text-gray-400">Enter your system parameters and water analysis data, then click "Calculate Scaling Potential" to see the assessment results.</p>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
    </div>
  );
};

export default ROScalingAssessment;
