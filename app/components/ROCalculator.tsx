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
  crossFlowVelocity: 0.2,
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
},
// ADD these new scaling parameters after waterAnalysis
scalingAnalysis: {
  feedPH: 8.1,
  antiscalantDose: 0,
  antiscalantType: 'phosphonate',
  acidType: 'H2SO4',
  targetPH: 6.5,
  enableScalingLimits: true,
  maxLSI: 0.5,
  maxLSIWithAntiscalant: 2.0,
  maxGypsumSaturation: 2.5,
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
           scalingAnalysis: {
        lsi: { lsi: 0, pHSaturation: 0 },
        gypsum: { saturationRatio: 0 },
        silica: { saturationRatio: 0 },
        concentrationFactor: 1,
        adjustedPH: 0,
        acidDose: 0,
        warnings: [],
        recommendations: [],
        limitingRecoveryScaling: 95,
        overallScalingRisk: 'LOW'
      },
    },
  });
  
  const [calculating, setCalculating] = useState(false);
  const [iterationCount, setIterationCount] = useState(0);
  const [convergenceStatus, setConvergenceStatus] = useState('');
  
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
       diameter: 4,
      waterPermeability: 0.125, // gfd/psi at 25°C
      saltPermeability: 0.00005, // gfd
      rejectionNominal: 0.997, // fraction
      maxFlux: 22, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'SW30HRLE-440i': {
      area: 440,
       diameter: 4,
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
       diameter: 4,
      waterPermeability: 0.13, // gfd/psi at 25°C (derived from specs)
      saltPermeability: 0.00007, // gfd (estimated based on rejection)
      rejectionNominal: 0.9965, // fraction (from specs)
      maxFlux: 24, // gfd (estimated)
      maxFeedFlowRate: 16, // gpm (standard for 4" element)
      maxPressureDrop: 15 // psi (standard)
    },
    'ZEKINDO BW-365': {
      area: 365, // ft²
      diameter: 8, 
      waterPermeability: 0.128, // gfd/psi (derived from specs)
      saltPermeability: 0.00007, // gfd
      rejectionNominal: 0.9965, // fraction
      maxFlux: 24, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'ZEKINDO BW-400': {
      area: 400, // ft²
      diameter: 8, 
      waterPermeability: 0.129, // gfd/psi
      saltPermeability: 0.00006, // gfd
      rejectionNominal: 0.997, // fraction
      maxFlux: 24, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'ZEKINDO BW-400 FR': {
      area: 400, // ft²
      diameter: 8, 
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
  diameter: 8, 
  waterPermeability: 0.0189,
  saltPermeability: 0.0000847,
  rejectionNominal: 0.996,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15,
  maxRecoveryPerElement: 0.12
},
'ZEKINDO SW-400 HR': {
  area: 400,
  diameter: 8, 
  waterPermeability: 0.0227,
  saltPermeability: 0.0000847,
  rejectionNominal: 0.997,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15,
  maxRecoveryPerElement: 0.12
},
'ZEKINDO SW-440 HR': {
  area: 440,
  diameter: 8, 
  waterPermeability: 0.0224,
  saltPermeability: 0.0000924,
  rejectionNominal: 0.997,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15,
  maxRecoveryPerElement: 0.12
},
'ZEKINDO SW-4040 HRLE': {
  area: 82,
  diameter: 8, 
  waterPermeability: 0.0232,
  saltPermeability: 0.0000978,
  rejectionNominal: 0.996,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15,
  maxRecoveryPerElement: 0.12
},
'ZEKINDO SW-400 HRLE': {
  area: 400,
  diameter: 8, 
  waterPermeability: 0.0246,
  saltPermeability: 0.0001038,
  rejectionNominal: 0.997,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15,
  maxRecoveryPerElement: 0.12
},
'ZEKINDO SW-440 HRLE': {
  area: 440,
  diameter: 8, 
  waterPermeability: 0.0245,
  saltPermeability: 0.0001035,
  rejectionNominal: 0.997,
  maxFlux: 16,
  maxFeedFlowRate: 16,
  maxPressureDrop: 15,
  maxRecoveryPerElement: 0.12
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
  // Enhanced ion data with activity coefficients
  const ionData = {
    // Cations [molecular weight, activity coefficient]
    sodium: { mw: 22.99, gamma: 0.78 },
    calcium: { mw: 40.08, gamma: 0.27 },
    magnesium: { mw: 24.31, gamma: 0.24 },
    potassium: { mw: 39.10, gamma: 0.77 },
    ammonium: { mw: 18.04, gamma: 0.78 },
    strontium: { mw: 87.62, gamma: 0.27 },
    barium: { mw: 137.33, gamma: 0.25 },
    // Anions
    chloride: { mw: 35.45, gamma: 0.76 },
    sulfate: { mw: 96.06, gamma: 0.12 },
    bicarbonate: { mw: 61.02, gamma: 0.67 },
    carbonate: { mw: 60.01, gamma: 0.20 },
    fluoride: { mw: 18.998, gamma: 0.75 },
    nitrate: { mw: 62.004, gamma: 0.74 },
    phosphate: { mw: 94.97, gamma: 0.09 },
    bromide: { mw: 79.904, gamma: 0.76 }
  };
  
  let totalOsmoticCoeff = 0;
  
  // Calculate total molality with activity corrections
  ['cations', 'anions'].forEach(ionType => {
    Object.keys(waterAnalysis[ionType]).forEach(ion => {
      const concentration = waterAnalysis[ionType][ion]; // mg/L
      if (concentration > 0 && ionData[ion]) {
        const molality = (concentration / 1000) / ionData[ion].mw; // mol/kg
        totalOsmoticCoeff += molality * ionData[ion].gamma;
      }
    });
  });
  
  // Enhanced Van't Hoff equation with osmotic coefficient
  const osmoticallyActive = totalOsmoticCoeff * 1.2; // Osmotic coefficient ~1.2 for seawater
  return 1.12 * (273 + temperature) * osmoticallyActive;
};
  
  // Helper function to calculate concentration polarization factor
const calculatePolarizationFactor = (recovery, flux, crossFlowVelocity = 0.2, temperature = 25, feedTDS = 32000) => {
  // Enhanced polarization calculation
  const kinematicViscosity = 1.0e-6 * Math.exp(1.1709 * (20 - temperature) / (temperature + 273));
  const diffusivity = 1.5e-9 * (293 / (273 + temperature)) * Math.pow(1000 / (1000 + feedTDS), 0.1);
  
  const hydraulicDiameter = 0.002; // 2 mm typical for spiral wound
  const reynoldsNumber = crossFlowVelocity * hydraulicDiameter / kinematicViscosity;
  const schmidtNumber = kinematicViscosity / diffusivity;
  const sherwoodNumber = 0.04 * Math.pow(reynoldsNumber, 0.75) * Math.pow(schmidtNumber, 0.33);
  
  const massTransferCoeff = sherwoodNumber * diffusivity / hydraulicDiameter;
  const waterFluxMs = flux * 1.157e-8; // Convert GFD to m/s
  const dimensionlessFlux = waterFluxMs / massTransferCoeff;
  
  return Math.exp(Math.min(dimensionlessFlux, 2.0)); // Cap at e^2 ≈ 7.4
};

  // Calculate pressure drop in element based on flow rate
const calculateElementPressureDrop = (flowRate: number, elementDiameter: number = 8) => {
  // Convert m³/h to gpm for calculation
  const flowGpm = flowRate * M3H_TO_GPM;
  
  let pressureDrop;
  
  if (elementDiameter === 4) {
    // 4-inch elements: IntHsPsiDrp = 6.7 + 7.52E-06 * f^4 + 0.0005 * f^3 + 0.00625 * f^2 + 0.553 * f + 1.73
    pressureDrop = 6.7 + 
                   7.52e-6 * Math.pow(flowGpm, 4) + 
                   0.0005 * Math.pow(flowGpm, 3) + 
                   0.00625 * Math.pow(flowGpm, 2) + 
                   0.553 * flowGpm + 
                   1.73;
  } else {
    // 8-inch elements: IntHsPsiDrp = -3.305E-07 * f^4 + 0.000396 * f^3 + 0.0227 * f^2 + 0.00172 * f + 1.14
    pressureDrop = -3.305e-7 * Math.pow(flowGpm, 4) + 
                   0.000396 * Math.pow(flowGpm, 3) + 
                   0.0227 * Math.pow(flowGpm, 2) + 
                   0.00172 * flowGpm + 
                   1.14;
  }
  
  return Math.max(0, pressureDrop); // Ensure non-negative
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
  // Use WAVE/Fortran approach: mass balance with salt permeability
  if (flux > 0 && elementArea > 0 && saltPermeability > 0) {
    // Salt flux through membrane = saltPermeability * area * TCF * driving force
    const effectiveFeedTDS = feedTDS * (polarizationFactor || 1.0);
    const saltFlux = saltPermeability * elementArea * tcf * effectiveFeedTDS; // mg/day
    const waterFlux = flux * elementArea; // gfd
    
    if (waterFlux > 0) {
      const permeateTDS = (saltFlux / waterFlux) * 8.34; // Convert to mg/L
      return Math.max(50, Math.min(permeateTDS, feedTDS * 0.5)); // More realistic limits
    }
  }
  
  // Fallback to rejection method but with less optimistic rejection
  const effectiveRejection = elementRejection * 0.95; // Reduce rejection by 5% to match WAVE
  const effectiveFeedTDS = feedTDS * (polarizationFactor || 1.0);
  const permeateTDS = effectiveFeedTDS * (1 - effectiveRejection);
  
  return Math.max(50, Math.min(permeateTDS, feedTDS * 0.5)); // Higher minimum, lower maximum
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
  // ADD these functions after calculateAverageElementRecovery

// Calculate Total Dissolved Solids from water analysis
const calculateTDSFromAnalysis = (waterAnalysis) => {
  let totalTDS = 0;
  
  // Sum all cations
  Object.values(waterAnalysis.cations).forEach((value: number) => {
    totalTDS += (value as number) || 0;
  });
  
  // Sum all anions
  Object.values(waterAnalysis.anions).forEach((value: number) => {
    totalTDS += (value as number) || 0;
  });
  
  // Sum neutrals
  Object.values(waterAnalysis.neutrals).forEach((value: number) => {
    totalTDS += (value as number) || 0;
  });
  
  return totalTDS;
};

// Calculate Langelier Saturation Index (LSI)
const calculateLSI = (waterAnalysis, temperature, pH, concentrationFactor = 1) => {
  // Get concentrated ion levels
  const calcium = (waterAnalysis.cations.calcium || 0) * concentrationFactor;
  const bicarbonate = (waterAnalysis.anions.bicarbonate || 0) * concentrationFactor;
  const tds = calculateTDSFromAnalysis(waterAnalysis) * concentrationFactor;
  
  // LSI calculation based on the BASIC program
  const a = 0.1 * Math.log10(tds) - 0.1;
  const tempK = (temperature - 32) * 5 / 9 + 273;
  const b = -13.12 * Math.log10(tempK) + 34.55;
  
  // Minimum values as in the program
  const calciumMin = Math.max(calcium, 3);
  const bicarbonateMin = Math.max(bicarbonate, 1);
  
  const c = Math.log10(calciumMin) - 0.4;
  const d = Math.log10(bicarbonateMin);
  
  const pHSat = 9.3 + a + b - c - d;
  const lsi = pH - pHSat;
  
  return {
    lsi: lsi,
    pHSaturation: pHSat,
    calcium: calciumMin,
    bicarbonate: bicarbonateMin,
    tds: tds
  };
};

// Calculate Gypsum (Calcium Sulfate) Saturation
const calculateGypsumSaturation = (waterAnalysis, temperature, concentrationFactor = 1) => {
  const calcium = (waterAnalysis.cations.calcium || 0) * concentrationFactor; // mg/L
  const sulfate = (waterAnalysis.anions.sulfate || 0) * concentrationFactor; // mg/L
  
  // Convert to molality (mol/kg)
  const calciumMolality = (calcium / 1000) / 40.08; // Ca MW = 40.08
  const sulfateMolality = (sulfate / 1000) / 96.06; // SO4 MW = 96.06
  
  // Gypsum solubility product (temperature dependent)
  // Ksp decreases with temperature for gypsum
  const ksp25 = 2.4e-5; // at 25°C
  const temperatureEffect = Math.exp(-0.02 * (temperature - 25));
  const ksp = ksp25 * temperatureEffect;
  
  // Saturation ratio
  const ionProduct = calciumMolality * sulfateMolality;
  const saturationRatio = ionProduct / ksp;
  
  return {
    saturationRatio: saturationRatio,
    ionProduct: ionProduct,
    ksp: ksp,
    calcium: calcium,
    sulfate: sulfate
  };
};

// Calculate Silica Scaling Potential
const calculateSilicaScaling = (waterAnalysis, temperature, concentrationFactor = 1) => {
  const silica = (waterAnalysis.neutrals.silica || 0) * concentrationFactor;
  
  // Silica solubility (temperature dependent)
  const silicaSolubility = 130 + 4 * (temperature - 25); // mg/L as SiO2
  const saturationRatio = silica / silicaSolubility;
  
  return {
    silicaConcentration: silica,
    silicaSolubility: silicaSolubility,
    saturationRatio: saturationRatio
  };
};

// Calculate required acid dose for pH adjustment
const calculateAcidDose = (waterAnalysis, currentPH, targetPH, acidType = 'H2SO4') => {
  const alkalinity = waterAnalysis.anions.bicarbonate || 0; // mg/L as HCO3-
  const alkalinityMeq = alkalinity / 61.02; // Convert to meq/L
  
  const pHDifference = currentPH - targetPH;
  
  if (pHDifference <= 0) return 0; // No acid needed
  
  // Estimate acid requirement (simplified)
  const acidRequired = alkalinityMeq * pHDifference * 0.5; // meq/L
  
  let acidDose = 0;
  if (acidType === 'H2SO4') {
    acidDose = acidRequired * 49.04; // mg/L as H2SO4
  } else if (acidType === 'HCl') {
    acidDose = acidRequired * 36.46; // mg/L as HCl
  }
  
  return Math.max(0, acidDose);
};

// Main scaling analysis function
const calculateScalingPotential = (waterAnalysis, scalingParams, recovery, temperature) => {
  // Calculate concentration factor
  const concentrationFactor = 1 / (1 - recovery / 100);
  
  // Adjust pH if acid dosing is specified
  let adjustedPH = scalingParams.feedPH;
  let acidDose = 0;
  
  if (scalingParams.acidType !== 'none' && scalingParams.targetPH < scalingParams.feedPH) {
    acidDose = calculateAcidDose(waterAnalysis, scalingParams.feedPH, scalingParams.targetPH, scalingParams.acidType);
    adjustedPH = scalingParams.targetPH;
  }
  
  // Calculate scaling indices
  const lsiData = calculateLSI(waterAnalysis, temperature, adjustedPH, concentrationFactor);
  const gypsumData = calculateGypsumSaturation(waterAnalysis, temperature, concentrationFactor);
  const silicaData = calculateSilicaScaling(waterAnalysis, temperature, concentrationFactor);
  
  // Determine scaling warnings and recommendations
  const warnings = [];
  const recommendations = [];
  
  // LSI warnings
  if (lsiData.lsi > scalingParams.maxLSI && scalingParams.antiscalantDose === 0) {
    warnings.push(`High LSI (${lsiData.lsi.toFixed(2)}) - Calcium carbonate scaling risk`);
    recommendations.push('Consider acid addition to reduce pH');
    recommendations.push('Consider antiscalant dosing (2-4 mg/L)');
  } else if (lsiData.lsi > scalingParams.maxLSIWithAntiscalant && scalingParams.antiscalantDose > 0) {
    warnings.push(`Very high LSI (${lsiData.lsi.toFixed(2)}) - Severe scaling risk even with antiscalant`);
    recommendations.push('Reduce system recovery');
    recommendations.push('Increase acid dosing');
  }
  
  // Gypsum warnings
  if (gypsumData.saturationRatio > scalingParams.maxGypsumSaturation) {
    warnings.push(`High gypsum saturation (${gypsumData.saturationRatio.toFixed(2)}x) - Calcium sulfate scaling risk`);
    recommendations.push('Reduce system recovery to limit concentration');
    recommendations.push('Consider gypsum-specific antiscalant');
  }
  
// Enhanced Silica warnings - Replace existing silica warning section
  if (silicaData.saturationRatio > 1.2) {
    warnings.push(`Very high silica concentration (${silicaData.silicaConcentration.toFixed(0)} mg/L) - Severe silica scaling risk`);
    recommendations.push('Immediate recovery reduction required');
    recommendations.push('Consider silica-specific antiscalant');
    recommendations.push('Monitor membrane differential pressure closely');
  } else if (silicaData.saturationRatio > 0.8) {
    warnings.push(`High silica concentration (${silicaData.silicaConcentration.toFixed(0)} mg/L) - Silica scaling risk`);
    recommendations.push('Limit recovery to prevent silica precipitation');
    recommendations.push('Consider temperature reduction if possible');
  } else if (silicaData.saturationRatio > 0.6) {
    // Add medium risk warning
    recommendations.push(`Monitor silica levels: ${silicaData.silicaConcentration.toFixed(0)} mg/L (solubility: ${silicaData.silicaSolubility.toFixed(0)} mg/L)`);
  }
  
  // Calculate limiting recovery based on scaling
  let limitingRecoveryScaling = 95; // Start with 95% as maximum
  
  // Limit based on LSI
  if (lsiData.lsi > scalingParams.maxLSI) {
    const maxConcentrationFactor = Math.pow(10, (scalingParams.maxLSI + lsiData.pHSaturation - adjustedPH) / 0.5);
    limitingRecoveryScaling = Math.min(limitingRecoveryScaling, (1 - 1/maxConcentrationFactor) * 100);
  }
  
  // Limit based on gypsum
  if (gypsumData.saturationRatio > 1) {
    const maxConcentrationFactorGypsum = scalingParams.maxGypsumSaturation / gypsumData.saturationRatio * concentrationFactor;
    limitingRecoveryScaling = Math.min(limitingRecoveryScaling, (1 - 1/maxConcentrationFactorGypsum) * 100);
  }
  
  return {
    lsi: lsiData,
    gypsum: gypsumData,
    silica: silicaData,
    concentrationFactor: concentrationFactor,
    adjustedPH: adjustedPH,
    acidDose: acidDose,
    warnings: warnings,
    recommendations: recommendations,
    limitingRecoveryScaling: Math.max(50, limitingRecoveryScaling), // Minimum 50%
    overallScalingRisk: warnings.length > 0 ? 'HIGH' : gypsumData.saturationRatio > 1.5 || lsiData.lsi > 0.2 ? 'MEDIUM' : 'LOW'
  };
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
      crossFlowVelocity: 0,
      elementType: '',
// ADDITION 4: Add uniform elements option to reset
useUniformElements: true,
elementsPerVessel: 7,
// ADDITION 6: Updated water analysis with new ions
waterAnalysis: {
  cations: { sodium: 0, calcium: 0, magnesium: 0, potassium: 0, ammonium: 0, strontium: 0, barium: 0 },
  anions: { chloride: 0, sulfate: 0, bicarbonate: 0, carbonate: 0, fluoride: 0, nitrate: 0, phosphate: 0, bromide: 0 },
  neutrals: { silica: 0, boron: 0, carbonDioxide: 0 }
},
      // ADD this missing scaling analysis reset section
scalingAnalysis: {
  feedPH: 0,
  antiscalantDose: 0,
  antiscalantType: 'phosphonate',
  acidType: 'H2SO4',
  targetPH: 6.5,
  enableScalingLimits: true,
  maxLSI: 0.5,
  maxLSIWithAntiscalant: 2.0,
  maxGypsumSaturation: 2.5,
}
    });

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
          // ADD scaling analysis reset
  scalingAnalysis: {
    lsi: { lsi: 0, pHSaturation: 0 },
    gypsum: { saturationRatio: 0 },
    silica: { saturationRatio: 0 },
    concentrationFactor: 1,
    adjustedPH: 0,
    acidDose: 0,
    warnings: [],
    recommendations: [],
    limitingRecoveryScaling: 95,
    overallScalingRisk: 'LOW'
  },
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
      
// Initial feed pressure guess - use typical operating pressures like WAVE
let feedPressure;
if (elementType.includes('SW')) {
  // Seawater membranes: typical WAVE pressure
  feedPressure = 850; // ~58 bar, typical SWRO pressure
} else {
  // Brackish water membranes: typical WAVE pressure
  feedPressure = 250; // ~17 bar, typical BWRO pressure
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

// Calculate initial NDP and flux first
const initialEffectiveOsmoticPressure = feedOsmoticPressure * 1.2; // Use default polarization
const permatePressure = 14.7; // psi (atmospheric pressure)
const permeateOsmoticPressure = calculatePermeateOsmoticPressure(feedOsmoticPressure, selectedMembraneProp.rejectionNominal);
const initialNdp = Math.max(0, pvFeedPressure - initialEffectiveOsmoticPressure - permatePressure - permeateOsmoticPressure);
const flux = calculateFlux(initialNdp, selectedMembraneProp.waterPermeability, tcf, foulingFactor);

// Now calculate polarization factor with flux
const polarizationFactor = calculatePolarizationFactor(
  element.recovery > 0 ? element.recovery : averageElementRecovery,
  flux || 10, // Now flux is defined
  inputs.crossFlowVelocity || 0.2,
  inputs.temperature,
  pvFeedTDS
);
element.polarization = polarizationFactor;

// Calculate effective osmotic pressure with CP
const effectiveOsmoticPressure = feedOsmoticPressure * polarizationFactor;

// Calculate final NDP with correct polarization
const ndp = Math.max(0, pvFeedPressure - effectiveOsmoticPressure - permatePressure - permeateOsmoticPressure);
element.ndp = ndp;
element.flux = flux;
              
              // Calculate permeate flow based on flux and membrane area
              const permeateFlowGpd = flux * selectedMembraneProp.area * flowFactor;
              const permeateFlowM3h = permeateFlowGpd * GPD_TO_M3H;
              element.permeateFlow = permeateFlowM3h;
              
              // Calculate recovery for this element
// Enhanced element recovery limits with membrane-specific limits
const membraneMaxRecovery = selectedMembraneProp.maxRecoveryPerElement || 0.12;
const calculatedRecovery = pvFeedFlow > 0 ? permeateFlowM3h / pvFeedFlow : 0;
const elementRecovery = Math.min(membraneMaxRecovery, calculatedRecovery);
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
averageNDP: feedPressure - initialFeedOsmoticPressure * calculatePolarizationFactor(
  actualRecovery / 2,
  bestResults?.averageFlux || 15, // Use calculated flux or default
  inputs.crossFlowVelocity || 0.2,
  inputs.temperature,
  inputs.feedTDS
),
limitingRecovery: calculateLimitingRecovery( // FIXED
  initialFeedOsmoticPressure,
  calculatePolarizationFactor(
  actualRecovery / 2,
  bestResults?.averageFlux || 15, // Use calculated flux or default
  inputs.crossFlowVelocity || 0.2,
  inputs.temperature,
  inputs.feedTDS
),
  0.997, // Average system rejection
  feedPressure,
  20,    // Average pressure drop estimate
  14.7   // Permeate pressure
) * 100,
averageElementRecovery: calculateAverageElementRecovery(actualRecovery, totalElements) * 100, // FIXED
            concentratePolarization: calculatePolarizationFactor(
  actualRecovery / totalElements,
  bestResults?.averageFlux || 15, // Use calculated flux or default
  inputs.crossFlowVelocity || 0.2,
  inputs.temperature,
  inputs.feedTDS
),
            concentrateOsmoticPressure: initialFeedOsmoticPressure / (1 - actualRecovery),
            pressureDrops: [calculateElementPressureDrop(inputs.feedFlow, selectedMembraneProp.diameter), calculateElementPressureDrop(inputs.feedFlow * 0.7, selectedMembraneProp.diameter)],
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

          // Calculate scaling potential
        const scalingResults = calculateScalingPotential(
          inputs.waterAnalysis,
          inputs.scalingAnalysis,
          bestResults.recovery,
          inputs.temperature
        );
        
        // Add scaling results to bestResults
        bestResults.scalingAnalysis = scalingResults;
        
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
             // ADD scaling analysis results
            scalingAnalysis: bestResults.scalingAnalysis || {
              lsi: { lsi: 0, pHSaturation: 0 },
              gypsum: { saturationRatio: 0 },
              silica: { saturationRatio: 0 },
              concentrationFactor: 1,
              adjustedPH: 0,
              acidDose: 0,
              warnings: [],
              recommendations: [],
              limitingRecoveryScaling: 95,
              overallScalingRisk: 'LOW'
            },
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
  "crossFlowVelocity",
            ].map((key) => {
              const unitMap = {
                "temperature": "°C",
                "feedFlow": "m³/h",
                "foulingFactor": "",
                "feedTDS": "mg/L",
                "recoveryTarget": "%",
                "recyclePercent": "%",
                "flowFactor": "",
                "crossFlowVelocity": "m/s",
              };
              
              return (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {key === "recoveryTarget" ? "Target Recovery" : 
                     key === "recyclePercent" ? "Recycle Percent" :
                     key === "flowFactor" ? "Flow Factor" :
                    key === "crossFlowVelocity" ? "Cross-Flow Velocity" :
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
            {/* ADD this section after Water Analysis */}
            
            {/* Scaling Analysis Section */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="text-md font-semibold text-blue-700 mb-3">Scaling Analysis Parameters</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Feed Conditions */}
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Feed Water Conditions</h5>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm text-gray-600">Feed pH</label>
                      <input
                        type="number"
                        step="0.1"
                        value={inputs.scalingAnalysis.feedPH}
                        onChange={(e) => setInputs(prev => ({
                          ...prev,
                          scalingAnalysis: {
                            ...prev.scalingAnalysis,
                            feedPH: parseFloat(e.target.value) || 8.1
                          }
                        }))}
                        className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Chemical Dosing */}
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Chemical Treatment</h5>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm text-gray-600">Antiscalant Dose (mg/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={inputs.scalingAnalysis.antiscalantDose}
                        onChange={(e) => setInputs(prev => ({
                          ...prev,
                          scalingAnalysis: {
                            ...prev.scalingAnalysis,
                            antiscalantDose: parseFloat(e.target.value) || 0
                          }
                        }))}
                        className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600">Acid Type</label>
                      <select
                        value={inputs.scalingAnalysis.acidType}
                        onChange={(e) => setInputs(prev => ({
                          ...prev,
                          scalingAnalysis: {
                            ...prev.scalingAnalysis,
                            acidType: e.target.value
                          }
                        }))}
                        className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="none">No Acid</option>
                        <option value="H2SO4">Sulfuric Acid (H₂SO₄)</option>
                        <option value="HCl">Hydrochloric Acid (HCl)</option>
                      </select>
                    </div>
                    
                    {inputs.scalingAnalysis.acidType !== 'none' && (
                      <div>
                        <label className="block text-sm text-gray-600">Target pH</label>
                        <input
                          type="number"
                          step="0.1"
                          value={inputs.scalingAnalysis.targetPH}
                          onChange={(e) => setInputs(prev => ({
                            ...prev,
                            scalingAnalysis: {
                              ...prev.scalingAnalysis,
                              targetPH: parseFloat(e.target.value) || 6.5
                            }
                          }))}
                          className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Element Type Selection */}
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

      {/* ADD this section after System Overview */}
        
        {/* Scaling Analysis Results */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">
            Scaling Analysis Results
          </h3>
          
          {/* Overall Scaling Risk */}
          <div className={`p-3 rounded-md mb-4 ${
            results.systemResults.scalingAnalysis?.overallScalingRisk === 'HIGH' ? 'bg-red-100 border border-red-300' :
            results.systemResults.scalingAnalysis?.overallScalingRisk === 'MEDIUM' ? 'bg-yellow-100 border border-yellow-300' :
            'bg-green-100 border border-green-300'
          }`}>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Overall Scaling Risk</span>
              <span className={`font-bold ${
                results.systemResults.scalingAnalysis?.overallScalingRisk === 'HIGH' ? 'text-red-700' :
                results.systemResults.scalingAnalysis?.overallScalingRisk === 'MEDIUM' ? 'text-yellow-700' :
                'text-green-700'
              }`}>
                {results.systemResults.scalingAnalysis?.overallScalingRisk || 'LOW'}
              </span>
            </div>
          </div>
          
{/* Enhanced Scaling Indices - Replace the existing grid with this */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* LSI */}
            <div className="p-3 bg-white rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Langelier Saturation Index</div>
              <div className="text-lg font-bold text-gray-900">
                {results.systemResults.scalingAnalysis?.lsi?.lsi?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-500">
                pH Sat: {results.systemResults.scalingAnalysis?.lsi?.pHSaturation?.toFixed(2) || '0.00'}
              </div>
              <div className={`text-xs mt-1 ${
                (results.systemResults.scalingAnalysis?.lsi?.lsi || 0) > 0.5 ? 'text-red-600' :
                (results.systemResults.scalingAnalysis?.lsi?.lsi || 0) > 0.2 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {(results.systemResults.scalingAnalysis?.lsi?.lsi || 0) > 0.5 ? 'High Risk' :
                 (results.systemResults.scalingAnalysis?.lsi?.lsi || 0) > 0.2 ? 'Medium Risk' : 'Low Risk'}
              </div>
            </div>
            
            {/* Gypsum */}
            <div className="p-3 bg-white rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Gypsum Saturation</div>
              <div className="text-lg font-bold text-gray-900">
                {results.systemResults.scalingAnalysis?.gypsum?.saturationRatio?.toFixed(2) || '0.00'}x
              </div>
              <div className="text-xs text-gray-500">Relative to solubility</div>
              <div className={`text-xs mt-1 ${
                (results.systemResults.scalingAnalysis?.gypsum?.saturationRatio || 0) > 2.5 ? 'text-red-600' :
                (results.systemResults.scalingAnalysis?.gypsum?.saturationRatio || 0) > 1.5 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {(results.systemResults.scalingAnalysis?.gypsum?.saturationRatio || 0) > 2.5 ? 'High Risk' :
                 (results.systemResults.scalingAnalysis?.gypsum?.saturationRatio || 0) > 1.5 ? 'Medium Risk' : 'Low Risk'}
              </div>
            </div>
            
            {/* NEW: Silica Scaling */}
            <div className="p-3 bg-white rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Silica Scaling</div>
              <div className="text-lg font-bold text-gray-900">
                {results.systemResults.scalingAnalysis?.silica?.saturationRatio?.toFixed(2) || '0.00'}x
              </div>
              <div className="text-xs text-gray-500">
                {results.systemResults.scalingAnalysis?.silica?.silicaConcentration?.toFixed(0) || '0'} mg/L
              </div>
              <div className={`text-xs mt-1 ${
                (results.systemResults.scalingAnalysis?.silica?.saturationRatio || 0) > 1.2 ? 'text-red-600' :
                (results.systemResults.scalingAnalysis?.silica?.saturationRatio || 0) > 0.8 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {(results.systemResults.scalingAnalysis?.silica?.saturationRatio || 0) > 1.2 ? 'High Risk' :
                 (results.systemResults.scalingAnalysis?.silica?.saturationRatio || 0) > 0.8 ? 'Medium Risk' : 'Low Risk'}
              </div>
            </div>
            
            {/* Concentration Factor */}
            <div className="p-3 bg-white rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Concentration Factor</div>
              <div className="text-lg font-bold text-gray-900">
                {results.systemResults.scalingAnalysis?.concentrationFactor?.toFixed(2) || '1.00'}x
              </div>
              <div className="text-xs text-gray-500">Ion concentration increase</div>
              <div className="text-xs text-gray-600 mt-1">
                {((1 - 1/results.systemResults.scalingAnalysis?.concentrationFactor) * 100).toFixed(1)}% Recovery
              </div>
            </div>
          </div>

          {/* NEW: Detailed Ion Concentrations - Add this after scaling indices */}
          <div className="mb-4">
            <details className="bg-white rounded-md border border-gray-200">
              <summary className="p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
                📊 Detailed Ion Concentrations in Concentrate
              </summary>
              <div className="p-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Key Scaling Ions */}
                  <div>
                    <h6 className="font-medium text-gray-700 mb-3">Key Scaling Ions</h6>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Calcium (Ca²⁺):</span>
                        <span className="font-medium">
                          {((inputs.waterAnalysis.cations.calcium || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sulfate (SO₄²⁻):</span>
                        <span className="font-medium">
                          {((inputs.waterAnalysis.anions.sulfate || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bicarbonate (HCO₃⁻):</span>
                        <span className="font-medium">
                          {((inputs.waterAnalysis.anions.bicarbonate || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Silica (SiO₂):</span>
                        <span className="font-medium">
                          {((inputs.waterAnalysis.neutrals.silica || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Other Cations */}
                  <div>
                    <h6 className="font-medium text-gray-700 mb-3">Other Cations</h6>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sodium (Na⁺):</span>
                        <span className="font-medium">
                          {((inputs.waterAnalysis.cations.sodium || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Magnesium (Mg²⁺):</span>
                        <span className="font-medium">
                          {((inputs.waterAnalysis.cations.magnesium || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Potassium (K⁺):</span>
                        <span className="font-medium">
                          {((inputs.waterAnalysis.cations.potassium || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                      {(inputs.waterAnalysis.cations.barium || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Barium (Ba²⁺):</span>
                          <span className="font-medium text-red-600">
                            {((inputs.waterAnalysis.cations.barium || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(1)} mg/L
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Other Anions */}
                  <div>
                    <h6 className="font-medium text-gray-700 mb-3">Other Anions</h6>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Chloride (Cl⁻):</span>
                        <span className="font-medium">
                          {((inputs.waterAnalysis.anions.chloride || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carbonate (CO₃²⁻):</span>
                        <span className="font-medium">
                          {((inputs.waterAnalysis.anions.carbonate || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                      {(inputs.waterAnalysis.anions.fluoride || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Fluoride (F⁻):</span>
                          <span className="font-medium">
                            {((inputs.waterAnalysis.anions.fluoride || 0) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(1)} mg/L
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-gray-200 pt-2 font-medium">
                        <span>Total TDS:</span>
                        <span>
                          {(calculateTDSFromAnalysis(inputs.waterAnalysis) * (results.systemResults.scalingAnalysis?.concentrationFactor || 1)).toFixed(0)} mg/L
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
          
          {/* Treatment Requirements */}
          {results.systemResults.scalingAnalysis?.acidDose > 0 && (
            <div className="p-3 bg-blue-50 rounded-md mb-4">
              <div className="text-sm font-medium text-blue-700 mb-1">Required Acid Dose</div>
              <div className="text-lg font-bold text-blue-900">
                {results.systemResults.scalingAnalysis.acidDose.toFixed(1)} mg/L
              </div>
              <div className="text-xs text-blue-600">
                {inputs.scalingAnalysis.acidType} to achieve pH {inputs.scalingAnalysis.targetPH}
              </div>
            </div>
          )}
          
          {/* Warnings */}
          {results.systemResults.scalingAnalysis?.warnings?.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-red-700 mb-2">⚠️ Scaling Warnings</h5>
              <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
                {results.systemResults.scalingAnalysis.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Recommendations */}
          {results.systemResults.scalingAnalysis?.recommendations?.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-blue-700 mb-2">💡 Recommendations</h5>
              <ul className="text-sm text-blue-600 space-y-1 list-disc list-inside">
                {results.systemResults.scalingAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Scaling Limiting Recovery */}
          <div className="p-3 bg-orange-50 rounded-md border border-orange-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-orange-700">Maximum Recovery (Scaling Limited)</span>
              <span className="font-bold text-orange-900">
                {results.systemResults.scalingAnalysis?.limitingRecoveryScaling?.toFixed(1) || '95.0'}%
              </span>
            </div>
            <div className="text-xs text-orange-600 mt-1">
              Recovery limit based on scaling potential
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

        {/* NEW: Detailed Recovery Limitations - Add after existing scaling limiting recovery */}
          <details className="bg-orange-50 rounded-md border border-orange-200 mb-4">
            <summary className="p-3 font-medium text-orange-700 cursor-pointer hover:bg-orange-100">
              📈 Recovery Limitations by Scale Type
            </summary>
            <div className="p-4 border-t border-orange-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h6 className="font-medium text-orange-800 mb-2">LSI-Limited Recovery</h6>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Current LSI:</span>
                      <span className="font-medium">{results.systemResults.scalingAnalysis?.lsi?.lsi?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Safe LSI:</span>
                      <span className="font-medium">{inputs.scalingAnalysis?.maxLSI || 0.5}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>LSI-Limited:</span>
                      <span className={
                        (results.systemResults.scalingAnalysis?.lsi?.lsi || 0) > (inputs.scalingAnalysis?.maxLSI || 0.5) ? 'text-red-600' : 'text-green-600'
                      }>
                        {results.systemResults.scalingAnalysis?.lsi?.lsi > inputs.scalingAnalysis?.maxLSI ? 
                          `${((1 - Math.pow(10, (inputs.scalingAnalysis.maxLSI + results.systemResults.scalingAnalysis.lsi.pHSaturation - inputs.scalingAnalysis.feedPH) / 0.5)) * 100).toFixed(1)}%` :
                          '✓ No Limit'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h6 className="font-medium text-orange-800 mb-2">Gypsum-Limited Recovery</h6>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Current Ratio:</span>
                      <span className="font-medium">{results.systemResults.scalingAnalysis?.gypsum?.saturationRatio?.toFixed(2) || '0.00'}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Safe Ratio:</span>
                      <span className="font-medium">{inputs.scalingAnalysis?.maxGypsumSaturation || 2.5}x</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Gypsum-Limited:</span>
                      <span className={
                        (results.systemResults.scalingAnalysis?.gypsum?.saturationRatio || 0) > (inputs.scalingAnalysis?.maxGypsumSaturation || 2.5) ? 'text-red-600' : 'text-green-600'
                      }>
                        {results.systemResults.scalingAnalysis?.gypsum?.saturationRatio > inputs.scalingAnalysis?.maxGypsumSaturation ? 
                          `${((1 - (inputs.scalingAnalysis.maxGypsumSaturation / results.systemResults.scalingAnalysis.gypsum.saturationRatio)) * 100).toFixed(1)}%` :
                          '✓ No Limit'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h6 className="font-medium text-orange-800 mb-2">Silica-Limited Recovery</h6>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Current Ratio:</span>
                      <span className="font-medium">{results.systemResults.scalingAnalysis?.silica?.saturationRatio?.toFixed(2) || '0.00'}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Silica Conc:</span>
                      <span className="font-medium">{results.systemResults.scalingAnalysis?.silica?.silicaConcentration?.toFixed(0) || '0'} mg/L</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Silica-Limited:</span>
                      <span className={
                        (results.systemResults.scalingAnalysis?.silica?.saturationRatio || 0) > 1.0 ? 'text-red-600' : 'text-green-600'
                      }>
                        {results.systemResults.scalingAnalysis?.silica?.saturationRatio > 1.0 ? 
                          `${((1 - (1.0 / results.systemResults.scalingAnalysis.silica.saturationRatio)) * 100).toFixed(1)}%` :
                          '✓ No Limit'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </details>
        
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
