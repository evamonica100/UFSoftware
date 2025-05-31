"use client";

import React, { useState, useEffect } from "react";
import Chart from "chart.js/auto";

const ROCalculator = () => {
const [inputs, setInputs] = useState({
  stages: 2,
  stageVessels: [6, 3],
  vesselElements: [
    [7, 7, 7, 7, 7, 7],
    [7, 7, 7],
  ],
  temperature: 28,
  feedFlow: 150,
  foulingFactor: 0.8,
  feedTDS: 32000,
  recoveryTarget: 75,
  iterationLimit: 50,
  convergenceTolerance: 0.001,
  recyclePercent: 0,
  flowFactor: 0.85,
  elementType: 'ZEKINDO SW-400 HR',
// ADDITION 4: Option for uniform elements per vessel
useUniformElements: true,
elementsPerVessel: 7,

// ADDITION 6: Enhanced water analysis with additional ions
waterAnalysis: {
  cations: {
    sodium: 10750,
    calcium: 410,
    magnesium: 1290,
    potassium: 380,
    ammonium: 0,        // NH4+ (NEW)
    strontium: 0,       // Sr2+ (NEW)
    barium: 0,          // Ba2+ (NEW)
  },
  anions: {
    chloride: 19350,
    sulfate: 2710,
    bicarbonate: 145,
    carbonate: 0,
    fluoride: 0,        // F- (NEW)
    nitrate: 0,         // NO3- (NEW)
    phosphate: 0,       // PO4 3- (NEW)
    bromide: 65,        // Br- (NEW)
  },
  neutrals: {
    silica: 0,
    boron: 4.5,
    carbonDioxide: 0,   // CO2 (NEW)
  }
}
  // Add this to your resetCalculator function in the setInputs call
chemicalDosing: {
  acidAdjustment: { enabled: false, chemical: 'HCl', targetPH: 6.5, dosage: 0, cost: 0 },
  antiscalant: { enabled: false, chemical: 'Na6P6O18', dosage: 3.0, cost: 0 },
  coagulant: { enabled: false, chemical: 'FeCl3', dosage: 5.0, cost: 0 },
  dechlorinator: { enabled: false, chemical: 'Na2S2O5', dosage: 2.0, cost: 0 },
  baseAdjustment: { enabled: false, chemical: 'NaOH30', targetPH: 8.0, dosage: 0, cost: 0 }
}
});
  

  const inputLabels = {
    stages: { label: "Number of Stages", unit: "" },
    elementsPerVessel: { label: "Elements per Vessel", unit: "" },
    vesselsStage1: { label: "Vessels in Stage 1", unit: "" },
    vesselsStage2: { label: "Vessels in Stage 2", unit: "" },
    elementArea: { label: "Element Area", unit: "ft²" },
    temperature: { label: "Temperature", unit: "°C" },
    feedPressure: { label: "Feed Pressure", unit: "psi" },
    permatePressure: { label: "Permeate Pressure", unit: "psi" },
    feedFlow: { label: "Feed Flow", unit: "m³/h" },
    foulingFactor: { label: "Fouling Factor", unit: "" },
    feedTDS: { label: "Feed TDS", unit: "mg/L" },
    saltRejection: { label: "Salt Rejection", unit: "" },
  };

  const [results, setResults] = useState({
    elementResults: [],
    systemResults: {
      recovery: 0,
      limitingRecovery: 0,
      averageFlux: 0,
      totalPermeateFlow: 0,
      permeateConcentration: 0,
      averageElementRecovery: 0,
      concentratePolarization: 0,
      concentrateOsmoticPressure: 0,
      pressureDrops: [0, 0],
      feedOsmoticPressure: 0,
      feedPressure: 0,
      averageNDP: 0,
    },
  });
  
  const [calculating, setCalculating] = useState(false);
  const [iterationCount, setIterationCount] = useState(0);
  const [convergenceStatus, setConvergenceStatus] = useState('');
  const [scalingWarnings, setScalingWarnings] = useState([]);
const [chemicalCosts, setChemicalCosts] = useState({});
  
  // Constants and conversion factors
  const GPD_TO_M3H = 0.00015771; // Gallons per day to cubic meters per hour
  const M3H_TO_GPM = 4.4029; // Cubic meters per hour to gallons per minute
  const M3H_TO_GPD = 6340.13; // Cubic meters per hour to gallons per day
  const FT2_TO_M2 = 0.092903; // Square feet to square meters
  const GPD_FT2_TO_LMH = 1.6996; // Gallons per day per square foot to liters per square meter per hour
  
  // Membrane properties database
  const membraneProperties = {
    // Original membranes
    'SW30XLE-440i': {
      area: 440, // ft²
      waterPermeability: 0.125, // gfd/psi at 25°C
      saltPermeability: 0.00005, // gfd
      rejectionNominal: 0.997, // fraction
      maxFlux: 22, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'SW30HRLE-440i': {
      area: 440,
      waterPermeability: 0.11,
      saltPermeability: 0.00002,
      rejectionNominal: 0.9985,
      maxFlux: 20,
      maxFeedFlowRate: 16,
      maxPressureDrop: 15
    },
    
    // ZEKINDO Brackish Water (BW) membranes
    'ZEKINDO BW-4040': {
      area: 82, // ft²
      waterPermeability: 0.13, // gfd/psi at 25°C (derived from specs)
      saltPermeability: 0.00007, // gfd (estimated based on rejection)
      rejectionNominal: 0.9965, // fraction (from specs)
      maxFlux: 24, // gfd (estimated)
      maxFeedFlowRate: 16, // gpm (standard for 4" element)
      maxPressureDrop: 15 // psi (standard)
    },
    'ZEKINDO BW-365': {
      area: 365, // ft²
      waterPermeability: 0.128, // gfd/psi (derived from specs)
      saltPermeability: 0.00007, // gfd
      rejectionNominal: 0.9965, // fraction
      maxFlux: 24, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'ZEKINDO BW-400': {
      area: 400, // ft²
      waterPermeability: 0.129, // gfd/psi
      saltPermeability: 0.00006, // gfd
      rejectionNominal: 0.997, // fraction
      maxFlux: 24, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'ZEKINDO BW-400 FR': {
      area: 400, // ft²
      waterPermeability: 0.129, // gfd/psi
      saltPermeability: 0.00006, // gfd
      rejectionNominal: 0.997, // fraction
      maxFlux: 24, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    
    // ZEKINDO Sea Water (SW) membranes
'ZEKINDO SW-4040': {
  area: 82,
  waterPermeability: 0.0189,
  saltPermeability: 0.00005,  // ← FIXED
  rejectionNominal: 0.996,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15
},
'ZEKINDO SW-400 HR': {
  area: 400,
  waterPermeability: 0.0227,
  saltPermeability: 0.00005,  // ← FIXED
  rejectionNominal: 0.997,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15
},
'ZEKINDO SW-440 HR': {
  area: 440,
  waterPermeability: 0.0224,  // FIXED: Calculated from specs
  saltPermeability: 0.0511,   // FIXED: Calculated from specs
  rejectionNominal: 0.997,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15
},
'ZEKINDO SW-4040 HRLE': {
  area: 82,
  waterPermeability: 0.0232,  // FIXED: Calculated from specs
  saltPermeability: 0.0531,   // FIXED: Calculated from specs
  rejectionNominal: 0.996,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15
},
'ZEKINDO SW-400 HRLE': {
  area: 400,
  waterPermeability: 0.0246,  // FIXED: Calculated from specs
  saltPermeability: 0.0563,   // FIXED: Calculated from specs
  rejectionNominal: 0.997,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15
},
'ZEKINDO SW-440 HRLE': {
  area: 440,
  waterPermeability: 0.0245,  // FIXED: Calculated from specs
  saltPermeability: 0.0558,   // FIXED: Calculated from specs
  rejectionNominal: 0.997,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15
}
  };

const chemicalDatabase = {
  'HCl': {
    name: 'Hydrochloric Acid',
    displayAs: 'HCl (32)',
    category: 'Acid',
    bulkConcentration: 32.00,
    bulkDensity: 1.1604,
    bulkPrice: 0.10,
    costType: 'kg',
    formula: 'HCl',
    molecularWeight: 36.458
  },
  'H2SO4': {
    name: 'Sulfuric Acid',
    displayAs: 'H2SO4(98)',
    category: 'Acid',
    bulkConcentration: 98.00,
    bulkDensity: 1.8385,
    bulkPrice: 0.06,
    costType: 'kg',
    formula: 'H2SO4',
    molecularWeight: 98.079
  },
  'Na6P6O18': {
    name: 'Sodium Hexametaphosphate',
    displayAs: 'Na6P6O18(100)',
    category: 'Antiscalant',
    bulkConcentration: 100.00,
    bulkDensity: 2.4840,
    bulkPrice: 1.00,
    costType: 'kg',
    formula: 'Na6P6O18',
    molecularWeight: 611.77
  },
  'Na2CO3': {
    name: 'Sodium Carbonate',
    displayAs: 'Na2CO3 (15)',
    category: 'Base',
    bulkConcentration: 15.00,
    bulkDensity: 1.1589,
    bulkPrice: 0.10,
    costType: 'kg',
    formula: 'Na2CO3',
    molecularWeight: 105.99
  },
  'NaOH30': {
    name: 'Sodium Hydroxide',
    displayAs: 'NaOH (30)',
    category: 'Base',
    bulkConcentration: 30.00,
    bulkDensity: 1.3286,
    bulkPrice: 0.26,
    costType: 'kg',
    formula: 'NaOH',
    molecularWeight: 39.997
  },
  'NaOH50': {
    name: 'Sodium Hydroxide',
    displayAs: 'NaOH (50)',
    category: 'Base',
    bulkConcentration: 50.00,
    bulkDensity: 1.5238,
    bulkPrice: 0.26,
    costType: 'kg',
    formula: 'NaOH',
    molecularWeight: 39.997
  },
  'FeCl3': {
    name: 'Ferric Chloride',
    displayAs: 'FeCl3(100)',
    category: 'Coagulant',
    bulkConcentration: 100.00,
    bulkDensity: 2.8980,
    bulkPrice: 1.67,
    costType: 'kg',
    formula: 'FeCl3',
    molecularWeight: 162.204
  },
  'PACl': {
    name: 'Polyaluminum Chloride',
    displayAs: 'Al2(OH)nCl6-n (5.5)',
    category: 'Coagulant',
    bulkConcentration: 5.50,
    bulkDensity: 1.2000,
    bulkPrice: 0.40,
    costType: 'kg',
    formula: 'Al2(OH)nCl6-n',
    molecularWeight: 174.45
  },
  'Na2S2O5': {
    name: 'Sodium Metabisulfite',
    displayAs: 'Na2S2O5(100)',
    category: 'Dechlorinator',
    bulkConcentration: 100.00,
    bulkDensity: 1.4800,
    bulkPrice: 2.07,
    costType: 'kg',
    formula: 'Na2S2O5',
    molecularWeight: 190.107
  },
  'C6H8O7': {
    name: 'Citric Acid',
    displayAs: 'Citric Acid(100)',
    category: 'Organic Acid',
    bulkConcentration: 100.00,
    bulkDensity: 1.6650,
    bulkPrice: 1.52,
    costType: 'kg',
    formula: 'C6H8O7',
    molecularWeight: 192.124
  },
  'C2O4H2': {
    name: 'Oxalic Acid',
    displayAs: 'Oxalic Acid(100)',
    category: 'Organic Acid',
    bulkConcentration: 100.00,
    bulkDensity: 1.9000,
    bulkPrice: 0.94,
    costType: 'kg',
    formula: 'C2O4H2',
    molecularWeight: 90.03
  },
  'NaOCl': {
    name: 'Sodium Hypochlorite',
    displayAs: 'NaOCl(12)',
    category: 'Oxidant',
    bulkConcentration: 12.00,
    bulkDensity: 1.1364,
    bulkPrice: 0.33,
    costType: 'kg',
    formula: 'NaOCl',
    molecularWeight: 74.442
  },
  'NaCl': {
    name: 'Sodium Chloride',
    displayAs: 'NaCl (26)',
    category: 'Salt',
    bulkConcentration: 26.00,
    bulkDensity: 1.1988,
    bulkPrice: 0.10,
    costType: 'kg',
    formula: 'NaCl',
    molecularWeight: 58.44
  },
  'SLS': {
    name: 'Sodium Lauryl Sulfate',
    displayAs: 'CH3(CH2)11SO4Na',
    category: 'Surfactant',
    bulkConcentration: 100.00,
    bulkDensity: 1.0100,
    bulkPrice: 0.45,
    costType: 'kg',
    formula: 'CH3(CH2)11SO4Na',
    molecularWeight: 288.38
  }
};
  const resultLabels = {
    recovery: { label: "Recovery", unit: "%" },
    limitingRecovery: { label: "Limiting Recovery", unit: "%" },
    averageFlux: { label: "Average Flux", unit: "GFD" },
    totalPermeateFlow: { label: "Total Permeate Flow", unit: "m³/h" },
    permeateConcentration: { label: "Permeate TDS", unit: "mg/L" },
    averageElementRecovery: { label: "Average Element Recovery", unit: "%" },
    concentratePolarization: { label: "Concentration Polarization", unit: "" },
    concentrateOsmoticPressure: {
      label: "Concentrate Osmotic Pressure",
      unit: "psi",
    },
    feedOsmoticPressure: { label: "Feed Osmotic Pressure", unit: "psi" },
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: parseFloat(value) || value,
    }));
  };

  // Calculate temperature correction factor
  const calculateTCF = (T: number) => {
    if (T >= 25) {
      return Math.exp(2640 * (1 / 298 - 1 / (273 + T)));
    }
    return Math.exp(3020 * (1 / 298 - 1 / (273 + T)));
  };

// Calculate feedwater osmotic pressure using ion-specific approach
const calculateOsmoticPressure = (waterAnalysis, temperature) => {
  // ADDITION 6: Updated molecular weights including new ions
const ionData = {
  // Cations
  sodium: { mw: 22.99 },
  calcium: { mw: 40.08 },
  magnesium: { mw: 24.31 },
  potassium: { mw: 39.10 },
  ammonium: { mw: 18.04 },      // NH4+ (NEW)
  strontium: { mw: 87.62 },     // Sr2+ (NEW)
  barium: { mw: 137.33 },       // Ba2+ (NEW)
  // Anions
  chloride: { mw: 35.45 },
  sulfate: { mw: 96.06 },
  bicarbonate: { mw: 61.02 },
  carbonate: { mw: 60.01 },
  fluoride: { mw: 18.998 },     // F- (NEW)
  nitrate: { mw: 62.004 },      // NO3- (NEW)
  phosphate: { mw: 94.97 },     // PO4 3- (NEW)
  bromide: { mw: 79.904 }       // Br- (NEW)
};
  
  let totalMolality = 0;
  
  // Calculate molality for cations
  Object.keys(waterAnalysis.cations).forEach(ion => {
    const concentration = waterAnalysis.cations[ion]; // mg/L
    if (concentration > 0 && ionData[ion]) {
      const molality = (concentration / 1000) / ionData[ion].mw; // mol/kg
      totalMolality += molality;
    }
  });
  
  // Calculate molality for anions
  Object.keys(waterAnalysis.anions).forEach(ion => {
    const concentration = waterAnalysis.anions[ion]; // mg/L
    if (concentration > 0 && ionData[ion]) {
      const molality = (concentration / 1000) / ionData[ion].mw; // mol/kg
      totalMolality += molality;
    }
  });
  
  // Van't Hoff equation: π = 1.12 × (273 + T) × Σmj
  return 1.12 * (273 + temperature) * totalMolality;
};
  
  // Helper function to calculate concentration polarization factor
  const calculatePolarizationFactor = (recovery: number) => {
    return Math.exp(0.7 * recovery);
  };

  // Calculate pressure drop in element based on flow rate
  const calculateElementPressureDrop = (flowRate: number) => {
    // Convert m³/h to gpm for calculation
    const flowGpm = flowRate * M3H_TO_GPM;
    // ΔPfc = 0.01 ηfc¹·⁷
    return 0.01 * Math.pow(flowGpm, 1.7);
  };

  // Calculate permeate flux based on net driving pressure
  const calculateFlux = (ndp: number, waterPermeability: number, tcf: number, ff: number) => {
    // Flux = A * (NDP) * TCF * FF
    // A is the water permeability, NDP is net driving pressure, TCF is temp correction factor, FF is fouling factor
    // If NDP is non-positive, return 0 flux
    if (ndp <= 0) return 0;
    return waterPermeability * ndp * tcf * ff;
  };

// FIXED: Simple rejection-based permeate TDS calculation
const calculatePermeateTDS = (feedTDS, elementRejection, flux, saltPermeability, tcf, elementArea = null, permeateFlow = null, concentrateTDS = null, polarizationFactor = null) => {
  // Use concentrate TDS and polarization factor for more accuracy
  if (concentrateTDS && polarizationFactor) {
    // Effective feed TDS at membrane surface (higher due to concentration polarization)
    const effectiveFeedTDS = concentrateTDS * polarizationFactor;
    
    // Simple rejection formula: Permeate TDS = Feed TDS × (1 - Rejection)
    const permeateTDS = effectiveFeedTDS * (1 - elementRejection);
    
    // Apply safety limits
    return Math.max(10, Math.min(permeateTDS, feedTDS * 0.8)); // Min 10 mg/L, max 80% of feed
  }
  
  // Fallback method using feed TDS
  const effectiveFeedTDS = feedTDS * (polarizationFactor || 1.0);
  const permeateTDS = effectiveFeedTDS * (1 - elementRejection);
  
  // Apply safety limits
  return Math.max(10, Math.min(permeateTDS, feedTDS * 0.8));
};

  // Calculate limiting system recovery using formula: YL = 1 - (πf × pf × R) / (Pf - ΔPfc - Pp)
const calculateLimitingRecovery = (
  feedOsmoticPressure,     // πf (psi)
  polarizationFactor,      // pf (dimensionless)
  systemRejection,         // R (fraction)
  feedPressure,           // Pf (psi)
  avgPressureDrop,        // ΔPfc (psi)
  permatePressure         // Pp (psi)
) => {
  const numerator = feedOsmoticPressure * polarizationFactor * systemRejection;
  const denominator = feedPressure - avgPressureDrop - permatePressure;
  
  if (denominator <= 0) return 0; // Invalid operating conditions
  
  const limitingRecovery = 1 - (numerator / denominator);
  return Math.max(0, Math.min(0.95, limitingRecovery)); // Cap at 95%
};

// Calculate average element recovery using formula: Yr = 1 - (1 - Y)^(1/n)
const calculateAverageElementRecovery = (systemRecovery, totalElements) => {
  if (totalElements <= 0) return 0;
  return 1 - Math.pow(1 - systemRecovery, 1 / totalElements);
};
  // ADDITION 1: Calculate average permeate-side osmotic pressure 
// Formula from attachment: π̄pf = πfi(1 - Ri)
const calculatePermeateOsmoticPressure = (feedOsmoticPressure, elementRejection) => {
  return feedOsmoticPressure * (1 - elementRejection);
};

// REMOVED: No longer needed for simple rejection method
// const calculatePermeateConcentration = ... (function deleted)
  
  const resetCalculator = () => {
    // Reset inputs to empty values
    setInputs({
      stages: 0,
      stageVessels: [], // Empty array of vessels per stage
      vesselElements: [], // Empty array of arrays containing elements per vessel
      temperature: 0,
      feedFlow: 0,
      foulingFactor: 0,
      feedTDS: 0,
      recoveryTarget: 0,
      iterationLimit: 50, // Keep reasonable defaults for calculation parameters
      convergenceTolerance: 0.001,
      recyclePercent: 0,
      flowFactor: 0,
      elementType: '',
// ADDITION 4: Add uniform elements option to reset
useUniformElements: true,
elementsPerVessel: 7,
// ADDITION 6: Updated water analysis with new ions
waterAnalysis: {
  cations: { sodium: 0, calcium: 0, magnesium: 0, potassium: 0, ammonium: 0, strontium: 0, barium: 0 },
  anions: { chloride: 0, sulfate: 0, bicarbonate: 0, carbonate: 0, fluoride: 0, nitrate: 0, phosphate: 0, bromide: 0 },
  neutrals: { silica: 0, boron: 0, carbonDioxide: 0 }
}
    });

chemicalDosing: {
  acidAdjustment: {
    enabled: false,
    chemical: 'HCl',
    targetPH: 6.5,
    dosage: 0,
    cost: 0
  },
  antiscalant: {
    enabled: false,
    chemical: 'Na6P6O18',
    dosage: 3.0,
    cost: 0
  },
  coagulant: {
    enabled: false,
    chemical: 'FeCl3',
    dosage: 5.0,
    cost: 0
  },
  dechlorinator: {
    enabled: false,
    chemical: 'Na2S2O5',
    dosage: 2.0,
    cost: 0
  },
  baseAdjustment: {
    enabled: false,
    chemical: 'NaOH30',
    targetPH: 8.0,
    dosage: 0,
    cost: 0
  }
}

    // Reset results
    setResults({
      elementResults: [],
      systemResults: {
        recovery: 0,
        limitingRecovery: 0,
        averageFlux: 0,
        totalPermeateFlow: 0,
        permeateConcentration: 0,
        averageElementRecovery: 0,
        concentratePolarization: 0,
        concentrateOsmoticPressure: 0,
        pressureDrops: [0, 0],
        feedOsmoticPressure: 0,
        feedPressure: 0,
        averageNDP: 0,
      },
    });

    // Reset membrane selection
    setSelectedMembrane(membraneSpecs.swro[0]);

    // Clear charts
    const ctxConc = document.getElementById(
      "concentrationGraph",
    ) as HTMLCanvasElement;
    const ctxPress = document.getElementById(
      "pressureRecoveryGraph",
    ) as HTMLCanvasElement;

    if (ctxConc) {
      const concChart = Chart.getChart(ctxConc);
      concChart?.destroy();
    }

    if (ctxPress) {
      const pressChart = Chart.getChart(ctxPress);
      pressChart?.destroy();
    }
    
    // Reset iteration count and convergence status
    setIterationCount(0);
    setConvergenceStatus('');
    
    // Clear form fields by resetting to empty values
    setTimeout(() => {
      const formElements = document.querySelectorAll('input[type="number"]');
      formElements.forEach((el: any) => {
        el.value = '';
      });
    }, 0);
  };
  const calculatePolarization = (averageElementRecovery: number) => {
    return Math.exp(0.7 * averageElementRecovery); // Updated calculation based on average element recovery
  };

  const calculatePressureDrop = (flow: number, isFirstStage: boolean) => {
    return isFirstStage ? 20 : 15; // Simplified calculation
  };
  // Add these functions before the main calculate function
const checkScalingPotential = (waterAnalysis, temperature, recovery) => {
  const warnings = [];
  
  // LSI calculation for CaCO3 scaling
  const lsi = calculateLSI(waterAnalysis, temperature);
  if (lsi > 0.2) {
    warnings.push({
      type: 'scaling',
      severity: lsi > 1.0 ? 'critical' : 'high',
      compound: 'CaCO3',
      message: `CaCO3 scaling potential (LSI: ${lsi.toFixed(2)}). ${lsi > 1.0 ? 'Critical risk!' : 'Consider acid dosing.'}`
    });
  }
  
  // CaSO4 solubility check
  const concentrateCa = waterAnalysis.cations.calcium / (1 - recovery);
  const concentrateSO4 = waterAnalysis.anions.sulfate / (1 - recovery);
  const caSO4Product = (concentrateCa * concentrateSO4) / 1000000; // Convert to mol²/L²
  
  if (caSO4Product > 0.25) {
    warnings.push({
      type: 'scaling',
      severity: caSO4Product > 0.5 ? 'critical' : 'high',
      compound: 'CaSO4',
      message: `CaSO4 scaling risk at ${(recovery*100).toFixed(1)}% recovery. ${caSO4Product > 0.5 ? 'Reduce recovery!' : 'Consider antiscalant.'}`
    });
  }
  
  // BaSO4 check
  if (waterAnalysis.cations.barium > 0.1) {
    const concentrateBa = waterAnalysis.cations.barium / (1 - recovery);
    const baSO4Product = (concentrateBa * concentrateSO4) / 1000000;
    if (baSO4Product > 0.001) {
      warnings.push({
        type: 'scaling',
        severity: 'critical',
        compound: 'BaSO4',
        message: 'BaSO4 scaling risk detected. Consider Ba removal pretreatment.'
      });
    }
  }
  
  // Silica scaling check
  if (waterAnalysis.neutrals.silica > 0) {
    const concentrateSilica = waterAnalysis.neutrals.silica / (1 - recovery);
    if (concentrateSilica > 150) {
      warnings.push({
        type: 'scaling',
        severity: concentrateSilica > 200 ? 'critical' : 'high',
        compound: 'SiO2',
        message: `Silica scaling risk. Concentrate silica: ${concentrateSilica.toFixed(1)} mg/L`
      });
    }
  }
  
  // High recovery warning
  if (recovery > 0.85) {
    warnings.push({
      type: 'operational',
      severity: 'high',
      compound: 'General',
      message: `Very high recovery (${(recovery*100).toFixed(1)}%). Monitor all scaling indices carefully.`
    });
  }
  
  return warnings;
};

const calculateLSI = (waterAnalysis, temperature) => {
  // Simplified LSI calculation
  const assumedPH = 8.0; // Typical seawater pH
  const tds = Object.values(waterAnalysis.cations).reduce((a,b) => a+b, 0) + 
              Object.values(waterAnalysis.anions).reduce((a,b) => a+b, 0);
  
  const calciumMolar = waterAnalysis.cations.calcium / 40080; // mg/L to mol/L
  const alkalinityMolar = (waterAnalysis.anions.bicarbonate + 2 * waterAnalysis.anions.carbonate) / 50000; // mg/L as CaCO3 to mol/L
  
  const pCa = -Math.log10(calciumMolar);
  const pAlk = -Math.log10(alkalinityMolar);
  const pKs = 8.48 - (0.4 * Math.log10(tds/1000)) + (0.045 * temperature);
  
  const pHs = pKs + pCa + pAlk;
  return assumedPH - pHs;
};

const calculateChemicalDosing = (feedFlow, waterAnalysis, recovery, temperature) => {
  const dosing = JSON.parse(JSON.stringify(inputs.chemicalDosing)); // Deep copy
  const dailyFlow = feedFlow * 24; // m³/day
  
  // Acid dosing calculation
  if (dosing.acidAdjustment.enabled) {
    const alkalinity = waterAnalysis.anions.bicarbonate + 2 * waterAnalysis.anions.carbonate;
    const currentPH = 8.0; // Assume typical seawater pH
    const targetPH = dosing.acidAdjustment.targetPH;
    
    // Simplified acid dosing (mg/L as CaCO3 equivalent)
    const acidDosageAsCaCO3 = alkalinity * (currentPH - targetPH) * 0.8;
    
    // Convert to actual chemical dosage
    const selectedAcid = chemicalDatabase[dosing.acidAdjustment.chemical];
    const acidDosage = (acidDosageAsCaCO3 * selectedAcid.molecularWeight) / (50000 * selectedAcid.bulkConcentration / 100);
    
    dosing.acidAdjustment.dosage = acidDosage;
    dosing.acidAdjustment.cost = (acidDosage * dailyFlow * selectedAcid.bulkPrice) / 1000000; // $/day
  }
  
  // Antiscalant cost calculation
  if (dosing.antiscalant.enabled) {
    const antiscalant = chemicalDatabase[dosing.antiscalant.chemical];
    dosing.antiscalant.cost = (dosing.antiscalant.dosage * dailyFlow * antiscalant.bulkPrice) / 1000000; // $/day
  }
  
  // Coagulant cost calculation
  if (dosing.coagulant.enabled) {
    const coagulant = chemicalDatabase[dosing.coagulant.chemical];
    dosing.coagulant.cost = (dosing.coagulant.dosage * dailyFlow * coagulant.bulkPrice) / 1000000; // $/day
  }
  
  // Dechlorinator cost calculation
  if (dosing.dechlorinator.enabled) {
    const dechlorinator = chemicalDatabase[dosing.dechlorinator.chemical];
    dosing.dechlorinator.cost = (dosing.dechlorinator.dosage * dailyFlow * dechlorinator.bulkPrice) / 1000000; // $/day
  }
  
  // Base adjustment cost calculation
  if (dosing.baseAdjustment.enabled) {
    const base = chemicalDatabase[dosing.baseAdjustment.chemical];
    const baseDosage = 5.0; // Simplified base dosage calculation
    dosing.baseAdjustment.dosage = baseDosage;
    dosing.baseAdjustment.cost = (baseDosage * dailyFlow * base.bulkPrice) / 1000000; // $/day
  }
  
  return dosing;
};

  const calculateTotalPermeateFlow = (
    elements: number,
    A: number,
    area: number,
    TCF: number,
    FF: number,
    feedP: number,
    pressureDrop: number,
    feedOP: number,
    permOP: number,
  ) => {
    const permP = 14.7; // Constant permeate pressure (atmospheric)
    const netDrivingPressure =
      feedP - pressureDrop / 2 - permP - (feedOP - permOP);
    return (A * area * TCF * FF * netDrivingPressure * elements) / 24; // Convert to m³/h
  };

  useEffect(() => {
    let concentrationChart: Chart | null = null;
    let pressureChart: Chart | null = null;

    const initializeGraphs = (elementResults: any[]) => {
      const stages = Array.from(new Set(elementResults.map((el) => el.stage)));

      // Concentration Graph
      const ctxConc = document.getElementById(
        "concentrationGraph",
      ) as HTMLCanvasElement;
      if (ctxConc) {
        concentrationChart?.destroy();
        concentrationChart = new Chart(ctxConc, {
          type: "line",
          data: {
            labels: elementResults.map((_, i) => `Element ${i + 1}`),
            datasets: [
              {
                label: "Feed TDS",
                data: elementResults.map((el) => el.feedTDS),
                borderColor: "rgb(75, 192, 192)",
                tension: 0.1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: "Feed vs Permeate Concentration",
              },
            },
          },
        });
      }

      // Pressure & Recovery Graph
      const ctxPress = document.getElementById(
        "pressureRecoveryGraph",
      ) as HTMLCanvasElement;
      if (ctxPress) {
        pressureChart?.destroy();
        pressureChart = new Chart(ctxPress, {
          type: "line",
          data: {
            labels: elementResults.map((_, i) => `Element ${i + 1}`),
            datasets: [
              {
                label: "Recovery %",
                data: elementResults.map((el) => el.recovery),
                borderColor: "rgb(153, 102, 255)",
                tension: 0.1,
                yAxisID: "y",
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: "Pressure & Recovery Distribution",
              },
            },
          },
        });
      }
    };

    return () => {
      concentrationChart?.destroy();
      pressureChart?.destroy();
    };
  }, []);

  const membraneSpecs = {
    bwro: [
      {
        model: "ZEKINDO ULP-4040",
        flow: 9.5,
        rejection: 99.3,
        pressure: 150,
        type: "ULP",
      },
      {
        model: "ZEKINDO ULP-8040-400",
        flow: 39.7,
        rejection: 99.5,
        pressure: 150,
        type: "ULP",
      },
      {
        model: "ZEKINDO BW-4040",
        flow: 9.1,
        rejection: 99.65,
        pressure: 255,
        type: "BW",
      },
      // Add other BWRO models here
    ],
    swro: [
      {
        model: "ZEKINDO SW-4040",
        flow: 4.5,
        rejection: 99.6,
        pressure: 800,
        type: "SW",
      },
      {
        model: "ZEKINDO SW-400 HR",
        flow: 26,
        rejection: 99.7,
        pressure: 800,
        type: "SW",
      },
      // Add other SWRO models here
    ],
  };

  const [selectedMembrane, setSelectedMembrane] = useState(
    membraneSpecs.swro[1],
  );

  const calculate = () => {
    try {
      setCalculating(true);
      setConvergenceStatus('Calculating...');
      
      // Get element type from selected membrane
      const elementType = inputs.elementType || selectedMembrane.model;
      const selectedMembraneProp = membraneProperties[elementType] || membraneProperties['ZEKINDO SW-400 HR'];
      
      const tcf = calculateTCF(inputs.temperature);
const initialFeedOsmoticPressure = calculateOsmoticPressure(
  inputs.waterAnalysis,
  inputs.temperature
);
      const foulingFactor = inputs.foulingFactor;
      const flowFactor = inputs.flowFactor;
      
      // Calculate total elements in system
      let totalElements = 0;
      let totalVessels = 0;
      let pvPerStage = [];

      // Loop through each stage to calculate total elements and vessels
      for (let i = 0; i < inputs.stages; i++) {
        const vesselsInStage = inputs.stageVessels[i] || 0;
        pvPerStage.push(vesselsInStage);
        totalVessels += vesselsInStage;

        // Add up all elements in this stage
        for (let j = 0; j < vesselsInStage; j++) {
          const elementsInVessel = inputs.vesselElements[i]?.[j] || 0;
          totalElements += elementsInVessel;
        }
      }
      
      // Target recovery as fraction
      const targetRecovery = inputs.recoveryTarget / 100;
      
      // Initial feed pressure guess - adjust based on membrane type and feed TDS
      let feedPressure;
      if (elementType.includes('SW')) {
        // Seawater membranes need higher pressure
        feedPressure = initialFeedOsmoticPressure * 2.2 + 300;
      } else {
        // Brackish water membranes
        feedPressure = initialFeedOsmoticPressure * 2.0 + 80;
      }
      
      // Start with the estimated feed pressure from osmotic pressure calculation
      // Rather than using a user-specified feed pressure input
      
      // Initial increment for binary search
      let pressureIncrement = feedPressure / 4;
      
      // Binary search algorithm to find the right feed pressure
      // that achieves the target recovery
      let iterations = 0;
      let converged = false;
      let bestFeedPressure = feedPressure;
      let bestResults: any = null;
      let bestElementResults: any[] = [];
      let bestDifference = 1.0; // Initialize to 100% difference
      
      const minIterations = 5;
      const recyclePercent = inputs.recyclePercent / 100;
      
      while ((iterations < inputs.iterationLimit && !converged) || iterations < minIterations) {
        iterations++;
        
        // Force more iterations even if we think we've converged
        if (iterations <= minIterations) {
          converged = false;
        }
        
        // Create element array for simulation
        const elements: any[] = [];
        
        // Calculate effective feed flow including recycle
        let effectiveFeedFlow = inputs.feedFlow;
        if (recyclePercent > 0) {
          // Estimate recycle flow based on target recovery and recycle percentage
          // Initially guess the recycle flow
          const estimatedPermeateFlow = inputs.feedFlow * targetRecovery;
          effectiveFeedFlow = inputs.feedFlow + (estimatedPermeateFlow * recyclePercent);
        }
        
        // Set up elements 2D array structure - first by stage, then by PV
        const elementsByStage = [];
        for (let stage = 0; stage < inputs.stages; stage++) {
          const stageElements = [];
          for (let pv = 0; pv < inputs.stageVessels[stage]; pv++) {
            const pvElements = [];
            for (let el = 0; el < (inputs.vesselElements[stage]?.[pv] || 0); el++) {
              const elementObj = {
                stage: stage + 1,
                vessel: pv + 1,
                element: el + 1,
                feedFlow: 0,
                feedPressure: 0,
                feedTDS: 0,
                permeateFlow: 0,
                permeateTDS: 0,
                concentrateFlow: 0,
                flux: 0,
                recovery: 0,
                ndp: 0,
                osmoticPressure: 0,
                polarization: 0
              };
              pvElements.push(elementObj);
              elements.push(elementObj);
            }
            stageElements.push(pvElements);
          }
          elementsByStage.push(stageElements);
        }
        
        // Initialize stage variables for simulation
        let stageFeeds = []; // Feed flows to each stage
        let stageTDS = []; // TDS to each stage
        let stagePressures = []; // Pressures to each stage
        
        // Initialize first stage
        stageFeeds[0] = effectiveFeedFlow;
        stageTDS[0] = inputs.feedTDS;
        stagePressures[0] = feedPressure;
        
        // Simulate system stage by stage
        let totalPermeateFlow = 0;
        let totalPermeateFlowWithoutRecycle = 0;
        let weightedPermeateTDS = 0;
        
        for (let stageIdx = 0; stageIdx < inputs.stages; stageIdx++) {
          const stageFeed = stageFeeds[stageIdx];
          const stageFeedTDS = stageTDS[stageIdx];
          const stageFeedPressure = stagePressures[stageIdx];
          
          // Calculate feed per PV
          const pvCount = pvPerStage[stageIdx];
          if (pvCount <= 0) continue;
          
          const feedPerPV = stageFeed / pvCount;
          
          // Stage tracking variables
          let stagePermeateFlow = 0;
          let stageConcentrateFlow = 0;
          let stageConcentrateTDS = 0;
          let stageOutPressure = stageFeedPressure;
          
          // Process each PV in this stage
          for (let pvIdx = 0; pvIdx < pvCount; pvIdx++) {
            // Initialize PV-level variables
            let pvFeedFlow = feedPerPV;
            let pvFeedTDS = stageFeedTDS;
            let pvFeedPressure = stageFeedPressure;
            
            let pvPermeateFlow = 0;
            let pvWeightedPermeateTDS = 0;
            
            const pvElementCount = inputs.vesselElements[stageIdx]?.[pvIdx] || 0;
            if (pvElementCount <= 0) continue;
            
            // Process each element in sequence
            for (let elIdx = 0; elIdx < pvElementCount; elIdx++) {
              const element = elementsByStage[stageIdx][pvIdx][elIdx];
              
              // Set feed conditions for this element
              element.feedFlow = pvFeedFlow;
              element.feedTDS = pvFeedTDS;
              element.feedPressure = pvFeedPressure;
              
              // Calculate osmotic pressure
// Scale osmotic pressure based on concentration change
const concentrationRatio = pvFeedTDS / inputs.feedTDS;
const feedOsmoticPressure = initialFeedOsmoticPressure * concentrationRatio;
              element.osmoticPressure = feedOsmoticPressure;
              
              // Calculate concentration polarization
              // For the first iteration, use an estimate based on target recovery
              const averageElementRecovery = 1 - Math.pow(1 - targetRecovery, 1/totalElements);
              const polarizationFactor = calculatePolarizationFactor(
                element.recovery > 0 ? element.recovery : averageElementRecovery
              );
              element.polarization = polarizationFactor;
              
              // Calculate effective osmotic pressure with CP
              const effectiveOsmoticPressure = feedOsmoticPressure * polarizationFactor;
              
              // Use constant permeate pressure (atmospheric pressure)
              const permatePressure = 14.7; // psi (atmospheric pressure)
              
              // Calculate net driving pressure
             // REVISION 1: Enhanced NDP calculation with permeate-side osmotic pressure
const permeateOsmoticPressure = calculatePermeateOsmoticPressure(feedOsmoticPressure, selectedMembraneProp.rejectionNominal);

// NDP = Feed Pressure - Feed Osmotic Pressure - Permeate Pressure - Permeate Osmotic Pressure
const ndp = Math.max(0, pvFeedPressure - effectiveOsmoticPressure - permatePressure - permeateOsmoticPressure);
              element.ndp = ndp;
              
              // Calculate water flux through membrane
              const flux = calculateFlux(ndp, selectedMembraneProp.waterPermeability, tcf, foulingFactor);
              element.flux = flux;
              
              // Calculate permeate flow based on flux and membrane area
              const permeateFlowGpd = flux * selectedMembraneProp.area * flowFactor;
              const permeateFlowM3h = permeateFlowGpd * GPD_TO_M3H;
              element.permeateFlow = permeateFlowM3h;
              
              // Calculate recovery for this element
              // FIXED: Realistic element recovery limits
const maxElementRecovery = elementType.includes('SW') ? 0.12 : 0.15; // 12% for SW, 15% for BW
const elementRecovery = Math.min(maxElementRecovery, permeateFlowM3h / pvFeedFlow);
              element.recovery = elementRecovery;
              
              // Calculate concentrate flow
              const concentrateFlowM3h = pvFeedFlow - permeateFlowM3h;
              element.concentrateFlow = concentrateFlowM3h;
              
              // Calculate concentrate TDS
              const concentrateTDS = elementRecovery > 0 ? 
                  pvFeedTDS / (1 - elementRecovery) : pvFeedTDS;
              
              // Calculate permeate TDS
      // REVISION 2: Use enhanced permeate TDS calculation with attachment formula
const permeateTDS = calculatePermeateTDS(
  pvFeedTDS, 
  selectedMembraneProp.rejectionNominal, 
  flux, 
  selectedMembraneProp.saltPermeability,
  tcf,
  selectedMembraneProp.area,        // Element area
  permeateFlowM3h,                  // Permeate flow
  concentrateTDS,                   // Concentrate TDS
  polarizationFactor               // Polarization factor
);
              element.permeateTDS = permeateTDS;
              
              // Add to permeate tracking for this PV
              pvPermeateFlow += permeateFlowM3h;
              pvWeightedPermeateTDS += permeateFlowM3h * permeateTDS;
              
              // Calculate pressure drop through the element
              const pressureDrop = calculateElementPressureDrop(pvFeedFlow);
              
              // Set up feed conditions for next element in PV
              pvFeedFlow = concentrateFlowM3h;
              pvFeedTDS = concentrateTDS;
              pvFeedPressure = Math.max(0, pvFeedPressure - pressureDrop);
              
              // Update lowest pressure in stage if needed
              stageOutPressure = Math.min(stageOutPressure, pvFeedPressure);
            }
            
            // Add PV results to stage totals
            stagePermeateFlow += pvPermeateFlow;
            stageConcentrateFlow += pvFeedFlow; // Last element's concentrate flow
            
            // Weighted average of concentrate TDS from all PVs
            stageConcentrateTDS += pvFeedFlow * pvFeedTDS;
            
            // Add to total permeate tracking
            totalPermeateFlow += pvPermeateFlow;
            weightedPermeateTDS += pvWeightedPermeateTDS;
          }
          
          // Finalize stage concentrate TDS as weighted average
          if (stageConcentrateFlow > 0) {
            stageConcentrateTDS /= stageConcentrateFlow;
          }
          
          // Set up feed for next stage if there is one
          if (stageIdx < inputs.stages - 1) {
            stageFeeds[stageIdx + 1] = stageConcentrateFlow;
            stageTDS[stageIdx + 1] = stageConcentrateTDS;
            stagePressures[stageIdx + 1] = Math.max(0, stageOutPressure - 5); // Assume 5 psi interstage drop
          }
        }
        
        // If recycle is used, adjust total permeate flow
        totalPermeateFlowWithoutRecycle = totalPermeateFlow;
        if (recyclePercent > 0) {
          // When recycling, the net permeate is reduced
          totalPermeateFlow = totalPermeateFlow / (1 + recyclePercent);
        }
        
        // Calculate system recovery
        const actualRecovery = totalPermeateFlow / inputs.feedFlow;
        const recoveryDifference = Math.abs(actualRecovery - targetRecovery);
        
        // Check if this is better than previous iterations
        if (recoveryDifference < bestDifference) {
          bestDifference = recoveryDifference;
          bestFeedPressure = feedPressure;
          bestElementResults = [...elements];
          
          // Calculate weighted average permeate TDS
          const avgPermeateTDS = weightedPermeateTDS / totalPermeateFlowWithoutRecycle;
          
          bestResults = {
            feedFlow: inputs.feedFlow,
            feedTDS: inputs.feedTDS,
            feedPressure,
            permeateFlow: totalPermeateFlow,
            permeateTDS: avgPermeateTDS,
            recovery: actualRecovery * 100,
            averageFlux: (totalPermeateFlow * M3H_TO_GPD) / (totalElements * selectedMembraneProp.area), // FIXED
averageNDP: feedPressure - initialFeedOsmoticPressure * calculatePolarizationFactor(actualRecovery / 2),
limitingRecovery: calculateLimitingRecovery( // FIXED
  initialFeedOsmoticPressure,
  calculatePolarizationFactor(actualRecovery / 2),
  0.997, // Average system rejection
  feedPressure,
  20,    // Average pressure drop estimate
  14.7   // Permeate pressure
) * 100,
averageElementRecovery: calculateAverageElementRecovery(actualRecovery, totalElements) * 100, // FIXED
            concentratePolarization: calculatePolarizationFactor(actualRecovery / totalElements),
            concentrateOsmoticPressure: initialFeedOsmoticPressure / (1 - actualRecovery),
            pressureDrops: [calculateElementPressureDrop(inputs.feedFlow), calculateElementPressureDrop(inputs.feedFlow * 0.7)],
            feedOsmoticPressure: initialFeedOsmoticPressure
          };
        }
        
        // Check for convergence
        const toleranceInPercentagePoints = inputs.convergenceTolerance;
        if (recoveryDifference * 100 < toleranceInPercentagePoints && iterations >= minIterations) {
          converged = true;
          setConvergenceStatus(`Converged in ${iterations} iterations (difference: ${(recoveryDifference*100).toFixed(2)}%)`);
        } else {
          // Binary search adjustment
          if (actualRecovery < targetRecovery) {
            // Need to increase pressure
            feedPressure += pressureIncrement;
          } else {
            // Need to decrease pressure
            feedPressure -= pressureIncrement;
          }
          
          // Reduce the increment for next iteration
          pressureIncrement /= 1.2;
          
          // Ensure pressure increment doesn't get too small too quickly
          if (iterations < 10) {
            pressureIncrement = Math.max(pressureIncrement, 5); // Keep at least 5 psi steps early on
          }
          
          // Sanity check on pressure
          feedPressure = Math.max(initialFeedOsmoticPressure * 1.1, feedPressure);
          feedPressure = Math.min(1500, feedPressure); // Cap at 1500 psi
          
          setConvergenceStatus(`Iteration ${iterations}: Recovery=${(actualRecovery*100).toFixed(2)}% vs Target=${inputs.recoveryTarget}%, Pressure=${feedPressure.toFixed(1)} psi`);
        }
        
        // Safety valve
        if (iterations >= inputs.iterationLimit && !converged) {
          setConvergenceStatus(`Did not converge after ${iterations} iterations. Best difference: ${(bestDifference*100).toFixed(2)}%`);
        }
      }
      
      setIterationCount(iterations);
      
      // Update charts if the canvas elements exist
      const ctxConc = document.getElementById(
        "concentrationGraph",
      ) as HTMLCanvasElement;
      const ctxPress = document.getElementById(
        "pressureRecoveryGraph",
      ) as HTMLCanvasElement;
      
      if (bestElementResults.length > 0) {
        // Format element results for display
        const formattedElementResults = bestElementResults.map(el => ({
          ...el,
          feedFlow: parseFloat(el.feedFlow.toFixed(1)),
          feedTDS: parseFloat(el.feedTDS.toFixed(0)),
          recovery: parseFloat((el.recovery * 100).toFixed(1)),
          flux: parseFloat(el.flux.toFixed(1)),
          permeateFlow: parseFloat(el.permeateFlow.toFixed(2)),
          permeateTDS: parseFloat(el.permeateTDS.toFixed(1)),
          concentrateFlow: parseFloat(el.concentrateFlow.toFixed(1)),
          ndp: parseFloat(el.ndp.toFixed(1)),
          osmoticPressure: parseFloat(el.osmoticPressure.toFixed(1)),
          polarization: parseFloat(el.polarization.toFixed(2))
        }));
        
        // Update charts if the canvas elements exist
        if (ctxConc && ctxPress) {
          // Destroy existing charts before creating new ones
          const existingChartConc = Chart.getChart(ctxConc);
          if (existingChartConc) {
            existingChartConc.destroy();
          }
          const existingChartPress = Chart.getChart(ctxPress);
          if (existingChartPress) {
            existingChartPress.destroy();
          }
          
          // Create concentration chart
          new Chart(ctxConc, {
            type: "line",
            data: {
              labels: formattedElementResults.map((el) => `${el.stage}-${el.vessel}-${el.element}`),
              datasets: [
                {
                  label: "Feed TDS (mg/L)",
                  data: formattedElementResults.map((el) => el.feedTDS),
                  borderColor: "rgb(75, 192, 192)",
                  tension: 0.1,
                },
                {
                  label: "Permeate TDS (mg/L)",
                  data: formattedElementResults.map((el) => el.permeateTDS),
                  borderColor: "rgb(255, 99, 132)",
                  tension: 0.1,
                }
              ],
            },
            options: {
              responsive: true,
              plugins: {
                title: { display: true, text: "Feed vs Permeate Concentration" },
              },
            },
          });

          // Create pressure/recovery chart
          new Chart(ctxPress, {
            type: "line",
            data: {
              labels: formattedElementResults.map((el) => `${el.stage}-${el.vessel}-${el.element}`),
              datasets: [
                {
                  label: "Recovery (%)",
                  data: formattedElementResults.map((el) => el.recovery),
                  borderColor: "rgb(153, 102, 255)",
                  tension: 0.1,
                  yAxisID: 'y',
                },
                {
                  label: "Pressure (psi)",
                  data: formattedElementResults.map((el) => el.feedPressure),
                  borderColor: "rgb(255, 159, 64)",
                  tension: 0.1,
                  yAxisID: 'y1',
                },
                {
                  label: "Flux (GFD)",
                  data: formattedElementResults.map((el) => el.flux),
                  borderColor: "rgb(54, 162, 235)",
                  tension: 0.1,
                  yAxisID: 'y',
                }
              ],
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: "Pressure & Recovery Distribution",
                },
              },
              scales: {
                y: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                },
                y1: {
                  type: 'linear',
                  display: true,
                  position: 'right',
                  grid: {
                    drawOnChartArea: false,
                  },
                },
              },
            },
          });
        }
        // Add this code right before setResults in your calculate function
const warnings = checkScalingPotential(inputs.waterAnalysis, inputs.temperature, actualRecovery);
const calculatedChemicalDosing = calculateChemicalDosing(inputs.feedFlow, inputs.waterAnalysis, actualRecovery, inputs.temperature);

// Calculate total chemical costs
const totalDailyChemicalCost = Object.values(calculatedChemicalDosing).reduce((sum, dosing) => sum + (dosing.cost || 0), 0);

setScalingWarnings(warnings);
setChemicalCosts(calculatedChemicalDosing);
        // Update the results state
        setResults({
          elementResults: formattedElementResults,
          systemResults: {
            recovery: parseFloat(bestResults.recovery.toFixed(1)),
            limitingRecovery: parseFloat(bestResults.limitingRecovery.toFixed(1)),
            averageFlux: parseFloat(bestResults.averageFlux.toFixed(2)),
            totalPermeateFlow: parseFloat(bestResults.permeateFlow.toFixed(1)),
            permeateConcentration: parseFloat(bestResults.permeateTDS.toFixed(1)),
            averageElementRecovery: parseFloat(bestResults.averageElementRecovery.toFixed(1)),
            concentratePolarization: parseFloat(bestResults.concentratePolarization.toFixed(2)),
            concentrateOsmoticPressure: parseFloat(bestResults.concentrateOsmoticPressure.toFixed(1)),
            pressureDrops: bestResults.pressureDrops.map((pd: number) => parseFloat(pd.toFixed(1))),
            feedOsmoticPressure: parseFloat(bestResults.feedOsmoticPressure.toFixed(1)),
            feedPressure: parseFloat(bestFeedPressure.toFixed(1)),
            averageNDP: parseFloat(bestResults.averageNDP.toFixed(1)),
             scalingWarnings: warnings,
    chemicalDosing: calculatedChemicalDosing,
    totalDailyChemicalCost: totalDailyChemicalCost
          },
        });
      }
      
      setCalculating(false);
    } catch (error) {
      console.error("Calculation error:", error);
      setCalculating(false);
      setConvergenceStatus(`Error: ${error}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">
        RO System Design Calculator
      </h2>

      {/* Input Parameters and System Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">
            Input Parameters
          </h3>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Number of Stages
              </label>
              <input
                type="number"
                name="stages"
                value={inputs.stages}
                onChange={(e) => {
                  const newStages = parseInt(e.target.value) || 0;
                  setInputs((prev) => ({
                    ...prev,
                    stages: newStages,
                    stageVessels: Array(newStages).fill(0),
                    vesselElements: Array(newStages).fill([]),
                  }));
                }}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>

            {/* ADDITION 4: Option for uniform elements per vessel */}
<div className="space-y-2 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={inputs.useUniformElements}
      onChange={(e) => setInputs(prev => ({
        ...prev,
        useUniformElements: e.target.checked,
        vesselElements: e.target.checked 
          ? Array(prev.stages).fill(null).map((_, stageIdx) => 
              Array(prev.stageVessels[stageIdx] || 0).fill(prev.elementsPerVessel || 7)
            )
          : prev.vesselElements
      }))}
      className="mr-2"
    />
    <span className="text-sm font-medium text-gray-700">
      Use same number of elements for all vessels
    </span>
  </label>
  
  {inputs.useUniformElements && (
    <div className="ml-6 mt-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Elements per Vessel
      </label>
      <input
        type="number"
        value={inputs.elementsPerVessel}
        onChange={(e) => {
          const elementsPerVessel = parseInt(e.target.value) || 7;
          setInputs(prev => ({
            ...prev,
            elementsPerVessel,
            vesselElements: Array(prev.stages).fill(null).map((_, stageIdx) => 
              Array(prev.stageVessels[stageIdx] || 0).fill(elementsPerVessel)
            )
          }));
        }}
        className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
        min="1"
        max="8"
      />
      <p className="text-xs text-gray-500 mt-1">
        This will set the same number of elements for all vessels in all stages
      </p>
    </div>
  )}
</div>
            
{/* Only show detailed configuration if uniform elements is OFF */}
{!inputs.useUniformElements && (
  <>
            {Array.from({ length: inputs.stages }, (_, stageIndex) => (
              <div
                key={`stage-${stageIndex}`}
                className="border-l-4 border-blue-500 pl-4 my-4"
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Vessels in Stage {stageIndex + 1}
                  </label>
                  <input
                    type="number"
                    value={inputs.stageVessels[stageIndex] || 0}
                    onChange={(e) => {
                      const newVessels = parseInt(e.target.value) || 0;
                      setInputs((prev) => {
                        const newStageVessels = [...prev.stageVessels];
                        newStageVessels[stageIndex] = newVessels;

                        const newVesselElements = [...prev.vesselElements];
                        newVesselElements[stageIndex] =
                          Array(newVessels).fill(0);

                        return {
                          ...prev,
                          stageVessels: newStageVessels,
                          vesselElements: newVesselElements,
                        };
                      });
                    }}
                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>

                <div className="ml-4 mt-2">
                  {Array.from(
                    { length: inputs.stageVessels[stageIndex] || 0 },
                    (_, vesselIndex) => (
                      <div
                        key={`vessel-${stageIndex}-${vesselIndex}`}
                        className="space-y-2 mt-2"
                      >
                        <label className="block text-sm font-medium text-gray-700">
                          Elements in Stage {stageIndex + 1}, Vessel{" "}
                          {vesselIndex + 1}
                        </label>
                        <input
                          type="number"
                          value={
                            inputs.vesselElements[stageIndex]?.[vesselIndex] ||
                            0
                          }
                          onChange={(e) => {
                            const newElements = parseInt(e.target.value) || 0;
                            setInputs((prev) => {
                              const newVesselElements = [
                                ...prev.vesselElements,
                              ];
                              if (!newVesselElements[stageIndex]) {
                                newVesselElements[stageIndex] = [];
                              }
                              newVesselElements[stageIndex][vesselIndex] =
                                newElements;
                              return {
                                ...prev,
                                vesselElements: newVesselElements,
                              };
                            });
                          }}
                          className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))}

    </>
)}

{/* Show summary when uniform elements is ON */}
{inputs.useUniformElements && inputs.stages > 0 && (
  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
    <h5 className="font-medium text-green-800 mb-2">System Configuration Summary</h5>
    <div className="text-sm text-green-700 space-y-1">
      {inputs.stageVessels.map((vessels, stageIdx) => (
        <div key={stageIdx} className="flex justify-between">
          <span>Stage {stageIdx + 1}:</span>
          <span>{vessels} vessels × {inputs.elementsPerVessel} elements = {vessels * inputs.elementsPerVessel} elements</span>
        </div>
      ))}
      <div className="border-t border-green-300 pt-2 mt-2 font-medium">
        <div className="flex justify-between">
          <span>Total:</span>
          <span>{inputs.stageVessels.reduce((a, b) => a + b, 0) * inputs.elementsPerVessel} elements</span>
        </div>
      </div>
    </div>
  </div>
)}

            {/* Other inputs */}
            {[
              "temperature",
              "feedFlow",
              "foulingFactor",
              "feedTDS",
              "recoveryTarget",
              "recyclePercent",
              "flowFactor",
            ].map((key) => {
              const unitMap = {
                "temperature": "°C",
                "feedFlow": "m³/h",
                "foulingFactor": "",
                "feedTDS": "mg/L",
                "recoveryTarget": "%",
                "recyclePercent": "%",
                "flowFactor": "",
              };
              
              return (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {key === "recoveryTarget" ? "Target Recovery" : 
                     key === "recyclePercent" ? "Recycle Percent" :
                     key === "flowFactor" ? "Flow Factor" :
                     key === "temperature" ? "Temperature" :
                     key === "feedFlow" ? "Feed Flow" :
                     key === "feedTDS" ? "Feed TDS" :
                     key === "foulingFactor" ? "Fouling Factor" : key}
                    {unitMap[key] && (
                      <span className="text-gray-500 ml-1">
                        ({unitMap[key]})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    name={key}
                    value={inputs[key]}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    step="any"
                    min={key === "flowFactor" ? "0" : key === "recyclePercent" ? "0" : undefined}
                    max={key === "flowFactor" ? "1" : key === "recyclePercent" ? "100" : undefined}
                  />
                </div>
              );
            })}

            {/* Water Analysis Section */}
<div className="bg-gray-50 p-4 rounded-lg mb-4">
  <h4 className="text-md font-semibold text-blue-700 mb-3">Water Analysis (mg/L)</h4>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* Cations */}
    <div>
      <h5 className="font-medium text-gray-700 mb-2">Cations</h5>
      <div className="space-y-2">
        {Object.keys(inputs.waterAnalysis.cations).map(ion => (
          <div key={ion}>
            <label className="block text-sm text-gray-600 capitalize">
  {ion} ({
  ion === 'sodium' ? 'Na+' : 
  ion === 'calcium' ? 'Ca2+' : 
  ion === 'magnesium' ? 'Mg2+' : 
  ion === 'potassium' ? 'K+' :
  ion === 'ammonium' ? 'NH4+' :
  ion === 'strontium' ? 'Sr2+' :
  ion === 'barium' ? 'Ba2+' : ion
})
            </label>
            <input
              type="number"
              value={inputs.waterAnalysis.cations[ion]}
              onChange={(e) => setInputs(prev => ({
                ...prev,
                waterAnalysis: {
                  ...prev.waterAnalysis,
                  cations: { 
                    ...prev.waterAnalysis.cations, 
                    [ion]: parseFloat(e.target.value) || 0 
                  }
                }
              }))}
              className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
    
    {/* Anions */}
    <div>
      <h5 className="font-medium text-gray-700 mb-2">Anions</h5>
      <div className="space-y-2">
        {Object.keys(inputs.waterAnalysis.anions).map(ion => (
          <div key={ion}>
            <label className="block text-sm text-gray-600 capitalize">
{ion} ({
  ion === 'chloride' ? 'Cl-' : 
  ion === 'sulfate' ? 'SO4 2-' : 
  ion === 'bicarbonate' ? 'HCO3-' : 
  ion === 'carbonate' ? 'CO3 2-' :
  ion === 'fluoride' ? 'F-' :
  ion === 'nitrate' ? 'NO3-' :
  ion === 'phosphate' ? 'PO4 3-' :
  ion === 'bromide' ? 'Br-' : ion
})
            </label>
            <input
              type="number"
              value={inputs.waterAnalysis.anions[ion]}
              onChange={(e) => setInputs(prev => ({
                ...prev,
                waterAnalysis: {
                  ...prev.waterAnalysis,
                  anions: { 
                    ...prev.waterAnalysis.anions, 
                    [ion]: parseFloat(e.target.value) || 0 
                  }
                }
              }))}
              className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
    
    {/* Neutrals */}
    <div>
      <h5 className="font-medium text-gray-700 mb-2">Neutrals</h5>
      <div className="space-y-2">
        {Object.keys(inputs.waterAnalysis.neutrals).map(compound => (
          <div key={compound}>
            <label className="block text-sm text-gray-600 capitalize">
{compound} ({
  compound === 'silica' ? 'SiO2' : 
  compound === 'boron' ? 'B' :
  compound === 'carbonDioxide' ? 'CO2' : compound
})
            </label>
            <input
              type="number"
              value={inputs.waterAnalysis.neutrals[compound]}
              onChange={(e) => setInputs(prev => ({
                ...prev,
                waterAnalysis: {
                  ...prev.waterAnalysis,
                  neutrals: { 
                    ...prev.waterAnalysis.neutrals, 
                    [compound]: parseFloat(e.target.value) || 0 
                  }
                }
              }))}
              className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  </div>
</div>
            {/* Element Type Selection */}
            {/* Chemical Dosing Section - Add this after Water Analysis */}
<div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
  <h4 className="text-md font-semibold text-blue-700 mb-3">Chemical Dosing & Pretreatment</h4>
  
  {/* Acid Adjustment */}
  <div className="border rounded p-3 mb-3 bg-white">
    <label className="flex items-center mb-2">
      <input 
        type="checkbox" 
        checked={inputs.chemicalDosing.acidAdjustment.enabled}
        onChange={(e) => setInputs(prev => ({
          ...prev,
          chemicalDosing: {
            ...prev.chemicalDosing,
            acidAdjustment: { ...prev.chemicalDosing.acidAdjustment, enabled: e.target.checked }
          }
        }))}
        className="mr-2"
      />
      <span className="font-medium text-gray-700">Acid Adjustment (pH Control)</span>
    </label>
    
    {inputs.chemicalDosing.acidAdjustment.enabled && (
      <div className="grid grid-cols-3 gap-2 ml-6">
        <div>
          <label className="block text-sm text-gray-600">Chemical:</label>
          <select 
            value={inputs.chemicalDosing.acidAdjustment.chemical}
            onChange={(e) => setInputs(prev => ({
              ...prev,
              chemicalDosing: {
                ...prev.chemicalDosing,
                acidAdjustment: { ...prev.chemicalDosing.acidAdjustment, chemical: e.target.value }
              }
            }))}
            className="w-full p-1 border rounded text-sm"
          >
            <option value="HCl">HCl (32%)</option>
            <option value="H2SO4">H2SO4 (98%)</option>
            <option value="C6H8O7">Citric Acid</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Target pH:</label>
          <input 
            type="number" 
            step="0.1" 
            min="5" 
            max="8" 
            value={inputs.chemicalDosing.acidAdjustment.targetPH}
            onChange={(e) => setInputs(prev => ({
              ...prev,
              chemicalDosing: {
                ...prev.chemicalDosing,
                acidAdjustment: { ...prev.chemicalDosing.acidAdjustment, targetPH: parseFloat(e.target.value) || 6.5 }
              }
            }))}
            className="w-full p-1 border rounded text-sm" 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Dosage (mg/L):</label>
          <input 
            type="number" 
            value={inputs.chemicalDosing.acidAdjustment.dosage.toFixed(1)}
            readOnly
            className="w-full p-1 border rounded text-sm bg-gray-100" 
          />
        </div>
      </div>
    )}
  </div>
  
  {/* Antiscalant */}
  <div className="border rounded p-3 mb-3 bg-white">
    <label className="flex items-center mb-2">
      <input 
        type="checkbox"
        checked={inputs.chemicalDosing.antiscalant.enabled}
        onChange={(e) => setInputs(prev => ({
          ...prev,
          chemicalDosing: {
            ...prev.chemicalDosing,
            antiscalant: { ...prev.chemicalDosing.antiscalant, enabled: e.target.checked }
          }
        }))}
        className="mr-2"
      />
      <span className="font-medium text-gray-700">Antiscalant</span>
    </label>
    
    {inputs.chemicalDosing.antiscalant.enabled && (
      <div className="grid grid-cols-2 gap-2 ml-6">
        <div>
          <label className="block text-sm text-gray-600">Chemical:</label>
          <select 
            value={inputs.chemicalDosing.antiscalant.chemical}
            onChange={(e) => setInputs(prev => ({
              ...prev,
              chemicalDosing: {
                ...prev.chemicalDosing,
                antiscalant: { ...prev.chemicalDosing.antiscalant, chemical: e.target.value }
              }
            }))}
            className="w-full p-1 border rounded text-sm"
          >
            <option value="Na6P6O18">Sodium Hexametaphosphate</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Dosage (mg/L):</label>
          <input 
            type="number" 
            step="0.1"
            value={inputs.chemicalDosing.antiscalant.dosage}
            onChange={(e) => setInputs(prev => ({
              ...prev,
              chemicalDosing: {
                ...prev.chemicalDosing,
                antiscalant: { ...prev.chemicalDosing.antiscalant, dosage: parseFloat(e.target.value) || 3.0 }
              }
            }))}
            className="w-full p-1 border rounded text-sm" 
          />
        </div>
      </div>
    )}
  </div>
  
  {/* Coagulant */}
  <div className="border rounded p-3 mb-3 bg-white">
    <label className="flex items-center mb-2">
      <input 
        type="checkbox"
        checked={inputs.chemicalDosing.coagulant.enabled}
        onChange={(e) => setInputs(prev => ({
          ...prev,
          chemicalDosing: {
            ...prev.chemicalDosing,
            coagulant: { ...prev.chemicalDosing.coagulant, enabled: e.target.checked }
          }
        }))}
        className="mr-2"
      />
      <span className="font-medium text-gray-700">Coagulant</span>
    </label>
    
    {inputs.chemicalDosing.coagulant.enabled && (
      <div className="grid grid-cols-2 gap-2 ml-6">
        <div>
          <label className="block text-sm text-gray-600">Chemical:</label>
          <select 
            value={inputs.chemicalDosing.coagulant.chemical}
            onChange={(e) => setInputs(prev => ({
              ...prev,
              chemicalDosing: {
                ...prev.chemicalDosing,
                coagulant: { ...prev.chemicalDosing.coagulant, chemical: e.target.value }
              }
            }))}
            className="w-full p-1 border rounded text-sm"
          >
            <option value="FeCl3">Ferric Chloride</option>
            <option value="PACl">Polyaluminum Chloride</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Dosage (mg/L):</label>
          <input 
            type="number" 
            step="0.1"
            value={inputs.chemicalDosing.coagulant.dosage}
            onChange={(e) => setInputs(prev => ({
              ...prev,
              chemicalDosing: {
                ...prev.chemicalDosing,
                coagulant: { ...prev.chemicalDosing.coagulant, dosage: parseFloat(e.target.value) || 5.0 }
              }
            }))}
            className="w-full p-1 border rounded text-sm" 
          />
        </div>
      </div>
    )}
  </div>
  
  {/* Dechlorinator */}
  <div className="border rounded p-3 mb-3 bg-white">
    <label className="flex items-center mb-2">
      <input 
        type="checkbox"
        checked={inputs.chemicalDosing.dechlorinator.enabled}
        onChange={(e) => setInputs(prev => ({
          ...prev,
          chemicalDosing: {
            ...prev.chemicalDosing,
            dechlorinator: { ...prev.chemicalDosing.dechlorinator, enabled: e.target.checked }
          }
        }))}
        className="mr-2"
      />
      <span className="font-medium text-gray-700">Dechlorinator</span>
    </label>
    
    {inputs.chemicalDosing.dechlorinator.enabled && (
      <div className="grid grid-cols-2 gap-2 ml-6">
        <div>
          <label className="block text-sm text-gray-600">Chemical:</label>
          <select 
            value={inputs.chemicalDosing.dechlorinator.chemical}
            onChange={(e) => setInputs(prev => ({
              ...prev,
              chemicalDosing: {
                ...prev.chemicalDosing,
                dechlorinator: { ...prev.chemicalDosing.dechlorinator, chemical: e.target.value }
              }
            }))}
            className="w-full p-1 border rounded text-sm"
          >
            <option value="Na2S2O5">Sodium Metabisulfite</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Dosage (mg/L):</label>
          <input 
            type="number" 
            step="0.1"
            value={inputs.chemicalDosing.dechlorinator.dosage}
            onChange={(e) => setInputs(prev => ({
              ...prev,
              chemicalDosing: {
                ...prev.chemicalDosing,
                dechlorinator: { ...prev.chemicalDosing.dechlorinator, dosage: parseFloat(e.target.value) || 2.0 }
              }
            }))}
            className="w-full p-1 border rounded text-sm" 
          />
        </div>
      </div>
    )}
  </div>
</div>
            {/* Scaling Warnings Section */}
{scalingWarnings.length > 0 && (
  <div className="bg-red-50 p-4 rounded-lg mb-4 border border-red-200">
    <h4 className="text-md font-semibold text-red-700 mb-3 flex items-center">
      <span className="mr-2">⚠️</span>
      Scaling & Fouling Warnings
    </h4>
    {scalingWarnings.map((warning, idx) => (
      <div key={idx} className={`p-3 rounded mb-2 border-l-4 ${
        warning.severity === 'critical' ? 'bg-red-100 border-red-500 text-red-800' :
        warning.severity === 'high' ? 'bg-orange-100 border-orange-500 text-orange-800' :
        'bg-yellow-100 border-yellow-500 text-yellow-800'
      }`}>
        <div className="flex items-start">
          <span className="font-semibold mr-2">
            {warning.severity === 'critical' ? '🔴' : warning.severity === 'high' ? '🟠' : '🟡'}
          </span>
          <div>
            <span className="font-medium">{warning.compound} {warning.type}:</span>
            <div className="text-sm mt-1">{warning.message}</div>
          </div>
        </div>
      </div>
    ))}
  </div>
)}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Element Type
              </label>
              <select
                name="elementType"
                value={inputs.elementType}
                onChange={(e) => {
                  setInputs(prev => ({
                    ...prev,
                    elementType: e.target.value
                  }))
                }}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.keys(membraneProperties).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Selected membrane area: {membraneProperties[inputs.elementType]?.area || 400} ft²
              </div>
            </div>
            
            {/* Advanced calculation settings */}
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Advanced Settings</span>
                <details className="ml-auto">
                  <summary className="text-xs text-blue-500 cursor-pointer">Show</summary>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Max Iterations
                      </label>
                      <input
                        type="number"
                        name="iterationLimit"
                        value={inputs.iterationLimit}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Convergence Tolerance
                      </label>
                      <input
                        type="number"
                        name="convergenceTolerance"
                        value={inputs.convergenceTolerance}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        step="0.001"
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <button
              onClick={calculate}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
              disabled={calculating}
            >
              {calculating ? 'Calculating...' : 'Calculate System Performance'}
            </button>
            <button
              onClick={resetCalculator}
              className="flex-1 bg-gray-400 text-white py-3 px-4 rounded-md hover:bg-gray-500 transition-colors font-medium"
              disabled={calculating}
            >
              Reset Calculator
            </button>
          </div>
          
          {convergenceStatus && (
            <div className="mt-3 p-2 bg-gray-50 rounded border text-sm text-gray-600">
              <p className="font-medium">Calculation Status:</p>
              <p>{convergenceStatus}</p>
              {iterationCount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Completed in {iterationCount} iterations
                </p>
              )}
            </div>
          )}
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">
            System Overview
          </h3>
          <div className="space-y-3">
            {/* Fixed system parameters in the order specified */}
            <div className="p-3 bg-white rounded-md flex justify-between items-center">
              <span className="font-medium text-gray-700">Feed Flow</span>
              <span className="text-gray-900">
                {inputs.feedFlow.toFixed(1)} <span className="text-gray-500 ml-1">m³/h</span>
              </span>
            </div>
            <div className="p-3 bg-white rounded-md flex justify-between items-center">
              <span className="font-medium text-gray-700">Feed TDS</span>
              <span className="text-gray-900">
                {inputs.feedTDS.toFixed(0)} <span className="text-gray-500 ml-1">mg/L</span>
              </span>
            </div>
            <div className="p-3 bg-white rounded-md flex justify-between items-center">
              <span className="font-medium text-gray-700">Feed Pressure</span>
              <span className="text-gray-900">
                {results.systemResults.feedPressure || 0} <span className="text-gray-500 ml-1">psi</span>
              </span>
            </div>
            <div className="p-3 bg-white rounded-md flex justify-between items-center">
              <span className="font-medium text-gray-700">System Recovery</span>
              <span className="text-gray-900">
                {results.systemResults.recovery.toFixed(1)} <span className="text-gray-500 ml-1">%</span>
              </span>
            </div>
            <div className="p-3 bg-white rounded-md flex justify-between items-center">
              <span className="font-medium text-gray-700">Permeate Flow</span>
              <span className="text-gray-900">
                {results.systemResults.totalPermeateFlow.toFixed(1)} <span className="text-gray-500 ml-1">m³/h</span>
              </span>
            </div>
            <div className="p-3 bg-white rounded-md flex justify-between items-center">
              <span className="font-medium text-gray-700">Permeate TDS</span>
              <span className="text-gray-900">
                {results.systemResults.permeateConcentration.toFixed(1)} <span className="text-gray-500 ml-1">mg/L</span>
              </span>
            </div>
            <div className="p-3 bg-white rounded-md flex justify-between items-center">
              <span className="font-medium text-gray-700">Average Flux</span>
              <span className="text-gray-900">
                {results.systemResults.averageFlux.toFixed(1)} <span className="text-gray-500 ml-1">GFD</span>
              </span>
            </div>
            <div className="p-3 bg-white rounded-md flex justify-between items-center">
              <span className="font-medium text-gray-700">Average NDP</span>
              <span className="text-gray-900">
                {results.systemResults.averageNDP?.toFixed(1) || 0} <span className="text-gray-500 ml-1">psi</span>
              </span>
            </div>

            {/* Add these new entries in System Overview after Average NDP */}
<div className="p-3 bg-white rounded-md flex justify-between items-center">
  <span className="font-medium text-gray-700">Daily Chemical Cost</span>
  <span className="text-gray-900">
    ${(Object.values(chemicalCosts).reduce((sum, cost) => sum + (cost || 0), 0)).toFixed(2)} <span className="text-gray-500 ml-1">/day</span>
  </span>
</div>

<div className="p-3 bg-white rounded-md flex justify-between items-center">
  <span className="font-medium text-gray-700">Annual Chemical Cost</span>
  <span className="text-gray-900">
    ${(Object.values(chemicalCosts).reduce((sum, cost) => sum + (cost || 0), 0) * 365).toFixed(0)} <span className="text-gray-500 ml-1">/year</span>
  </span>
</div>
            
            {/* Additional parameters that might be useful */}
            <details className="bg-white rounded-md p-3">
              <summary className="font-medium text-gray-700 cursor-pointer">Additional Parameters</summary>
              <div className="mt-3 space-y-3 pl-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Limiting Recovery</span>
                  <span className="text-gray-900">
                    {results.systemResults.limitingRecovery.toFixed(1)} <span className="text-gray-500 ml-1">%</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Average Element Recovery</span>
                  <span className="text-gray-900">
                    {results.systemResults.averageElementRecovery.toFixed(1)} <span className="text-gray-500 ml-1">%</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Concentration Polarization</span>
                  <span className="text-gray-900">
                    {results.systemResults.concentratePolarization.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Concentrate Osmotic Pressure</span>
                  <span className="text-gray-900">
                    {results.systemResults.concentrateOsmoticPressure.toFixed(1)} <span className="text-gray-500 ml-1">psi</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Feed Osmotic Pressure</span>
                  <span className="text-gray-900">
                    {results.systemResults.feedOsmoticPressure.toFixed(1)} <span className="text-gray-500 ml-1">psi</span>
                  </span>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8">
        {/* Performance Graphs */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">
            Performance Graphs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg h-80">
              <canvas id="concentrationGraph"></canvas>
            </div>
            <div className="bg-white p-4 rounded-lg h-80">
              <canvas id="pressureRecoveryGraph"></canvas>
            </div>
          </div>
        </div>

        {/* Element Details */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">
            Element Details
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  {[
                    "Stage",
                    "PV",
                    "Element",
                    "Feed Flow (m³/h)",
                    "Feed Pressure (psi)",
                    "Feed TDS (mg/L)",
                    "Recovery (%)",
                    "Flux (LMH)",
                    "Permeate Flow (m³/h)",
                    "Permeate TDS (mg/L)",
                    "NDP (psi)",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.elementResults.map((el, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.stage}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.vessel}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.element}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.feedFlow}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.feedPressure ? el.feedPressure.toFixed(1) : '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.feedTDS}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.recovery}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{(el.flux * GPD_FT2_TO_LMH).toFixed(1) || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.permeateFlow || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.permeateTDS || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.ndp || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROCalculator;
