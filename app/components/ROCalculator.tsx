"use client";

import React, { useState, useEffect } from "react";
import Chart from "chart.js/auto";

const ROCalculator = () => {
  const [inputs, setInputs] = useState({
    stages: 2,
    stageVessels: [6, 3], // Array of vessels per stage
    vesselElements: [
      [7, 7, 7, 7, 7, 7],
      [7, 7, 7],
    ], // Array of arrays containing elements per vessel
    temperature: 28,
    permatePressure: 14.7,
    feedFlow: 150,
    foulingFactor: 0.8,
    feedTDS: 32000,
    recoveryTarget: 75, // Target recovery percentage
    iterationLimit: 50, // Maximum iterations for solver
    convergenceTolerance: 0.001, // Convergence tolerance
    recyclePercent: 0, // Recycle percentage
    flowFactor: 0.85, // Flow factor for membrane
    elementType: 'ZEKINDO SW-400 HR', // Default element type
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
      area: 82, // ft²
      waterPermeability: 0.0181, // gfd/psi at 25°C (derived from specs)
      saltPermeability: 0.000045, // gfd (estimated based on rejection)
      rejectionNominal: 0.996, // fraction (from specs)
      maxFlux: 16, // gfd (typical for SW)
      maxFeedFlowRate: 16, // gpm (standard for 4" element)
      maxPressureDrop: 15 // psi (standard)
    },
    'ZEKINDO SW-400 HR': {
      area: 400, // ft²
      waterPermeability: 0.0215, // gfd/psi
      saltPermeability: 0.000035, // gfd
      rejectionNominal: 0.997, // fraction
      maxFlux: 16, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'ZEKINDO SW-440 HR': {
      area: 440, // ft²
      waterPermeability: 0.0212, // gfd/psi
      saltPermeability: 0.000035, // gfd
      rejectionNominal: 0.997, // fraction
      maxFlux: 16, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'ZEKINDO SW-4040 HRLE': {
      area: 82, // ft²
      waterPermeability: 0.0222, // gfd/psi
      saltPermeability: 0.000045, // gfd
      rejectionNominal: 0.996, // fraction
      maxFlux: 16, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'ZEKINDO SW-400 HRLE': {
      area: 400, // ft²
      waterPermeability: 0.0234, // gfd/psi
      saltPermeability: 0.000035, // gfd
      rejectionNominal: 0.997, // fraction
      maxFlux: 16, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
    },
    'ZEKINDO SW-440 HRLE': {
      area: 440, // ft²
      waterPermeability: 0.0232, // gfd/psi
      saltPermeability: 0.000035, // gfd
      rejectionNominal: 0.997, // fraction
      maxFlux: 16, // gfd
      maxFeedFlowRate: 16, // gpm
      maxPressureDrop: 15 // psi
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

  // Calculate feedwater osmotic pressure
  const calculateOsmoticPressure = (tds: number, T: number) => {
    // Simplified calculation based on TDS
    // πf̄ = 1.12 (273 + T) ∑mj
    // Approximate ∑mj from TDS
    const sumMj = tds / 58000; // Approximate conversion from TDS to molar concentration
    return 1.12 * (273 + T) * sumMj;
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

  // Calculate permeate TDS based on feed TDS, rejection, and flux
  const calculatePermeateTDS = (feedTDS: number, elementRejection: number, flux: number, saltPermeability: number, tcf: number) => {
    // Simple salt passage model
    // Cp = B * Cf * TCF / flux
    // Where B is salt permeability, Cf is feed concentration
    const effectiveSaltPermeability = saltPermeability * tcf;
    // Salt passage increases at lower flux (modified model)
    const effectiveRejection = Math.max(0, elementRejection * (1 - 0.05 * Math.exp(-flux/5)));
    return feedTDS * (1 - effectiveRejection);
  };
  const resetCalculator = () => {
    // Reset inputs to default values
    setInputs({
      stages: 2,
      stageVessels: [6, 3], // Array of vessels per stage
      vesselElements: [
        [7, 7, 7, 7, 7, 7],
        [7, 7, 7],
      ], // Array of arrays containing elements per vessel
      temperature: 28,
      permatePressure: 14.7,
      feedFlow: 150,
      foulingFactor: 0.8,
      feedTDS: 32000,
      recoveryTarget: 75,
      iterationLimit: 50,
      convergenceTolerance: 0.001,
      recyclePercent: 0,
      flowFactor: 0.85,
      elementType: 'ZEKINDO SW-400 HR',
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
      },
    });

    // Reset membrane selection
    setSelectedMembrane(membraneSpecs.swro[1]);

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
  };
  const calculatePolarization = (averageElementRecovery: number) => {
    return Math.exp(0.7 * averageElementRecovery); // Updated calculation based on average element recovery
  };

  const calculatePressureDrop = (flow: number, isFirstStage: boolean) => {
    return isFirstStage ? 20 : 15; // Simplified calculation
  };

  const calculateLimitingRecovery = (
    feedOP: number,
    CP: number,
    SR: number,
    feedP: number,
    pressureDrop: number,
    permP: number,
  ) => {
    return 0.85; // Simplified calculation
  };

  const calculateTotalPermeateFlow = (
    elements: number,
    A: number,
    area: number,
    TCF: number,
    FF: number,
    feedP: number,
    pressureDrop: number,
    permP: number,
    feedOP: number,
    permOP: number,
  ) => {
    const netDrivingPressure =
      feedP - pressureDrop / 2 - permP - (feedOP - permOP);
    return (A * area * TCF * FF * netDrivingPressure * elements) / 24; // Convert to m³/h
  };

  // Updated calculation for average element recovery using the formula: 1 - (1-Y)^(1/n)
  const calculateAverageElementRecovery = (
    systemRecovery: number,
    elements: number,
  ) => {
    return 1 - Math.pow(1 - systemRecovery, 1 / elements);
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
        inputs.feedTDS,
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
              const feedOsmoticPressure = calculateOsmoticPressure(pvFeedTDS, inputs.temperature);
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
              
              // Calculate net driving pressure
              const ndp = Math.max(0, pvFeedPressure - effectiveOsmoticPressure - inputs.permatePressure);
              element.ndp = ndp;
              
              // Calculate water flux through membrane
              const flux = calculateFlux(ndp, selectedMembraneProp.waterPermeability, tcf, foulingFactor);
              element.flux = flux;
              
              // Calculate permeate flow based on flux and membrane area
              const permeateFlowGpd = flux * selectedMembraneProp.area * flowFactor;
              const permeateFlowM3h = permeateFlowGpd * GPD_TO_M3H;
              element.permeateFlow = permeateFlowM3h;
              
              // Calculate recovery for this element
              const elementRecovery = Math.min(0.2, permeateFlowM3h / pvFeedFlow); // Cap at 20% per element for safety
              element.recovery = elementRecovery;
              
              // Calculate concentrate flow
              const concentrateFlowM3h = pvFeedFlow - permeateFlowM3h;
              element.concentrateFlow = concentrateFlowM3h;
              
              // Calculate concentrate TDS
              const concentrateTDS = elementRecovery > 0 ? 
                  pvFeedTDS / (1 - elementRecovery) : pvFeedTDS;
              
              // Calculate permeate TDS
              const permeateTDS = calculatePermeateTDS(
                pvFeedTDS, 
                selectedMembraneProp.rejectionNominal, 
                flux, 
                selectedMembraneProp.saltPermeability,
                tcf
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
            averageFlux: totalPermeateFlow / (totalElements * selectedMembraneProp.area * FT2_TO_M2) / (1 - recyclePercent),
            averageNDP: feedPressure - initialFeedOsmoticPressure * calculatePolarizationFactor(actualRecovery / 2),
            limitingRecovery: Math.min(85, actualRecovery * 100 + 5),
            averageElementRecovery: (1 - Math.pow(1 - actualRecovery, 1 / totalElements)) * 100,
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

      {/* Membrane Specifications Section */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-semibold text-blue-700 mb-4">
          Zekindo Membrane Specifications
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Model
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Flow (m³/d)
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Rejection (%)
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Pressure (psi)
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Select
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(selectedMembrane.type === "SW"
                ? membraneSpecs.swro
                : membraneSpecs.bwro
              ).map((membrane) => (
                <tr
                  key={membrane.model}
                  className={
                    selectedMembrane.model === membrane.model
                      ? "bg-blue-50"
                      : ""
                  }
                >
                  <td className="px-4 py-2">{membrane.model}</td>
                  <td className="px-4 py-2">{membrane.flow}</td>
                  <td className="px-4 py-2">{membrane.rejection}</td>
                  <td className="px-4 py-2">{membrane.pressure}</td>
                  <td className="px-4 py-2">
                    <input
                      type="radio"
                      name="membraneModel"
                      checked={selectedMembrane.model === membrane.model}
                      onChange={() => setSelectedMembrane(membrane)}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <select
            className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            onChange={(e) => {
              const type = e.target.value;
              const specs =
                type === "swro" ? membraneSpecs.swro : membraneSpecs.bwro;
              setSelectedMembrane(specs[0]);
            }}
          >
            <option value="bwro">Brackish Water RO (BWRO)</option>
            <option value="swro">Sea Water RO (SWRO)</option>
          </select>
        </div>
      </div>

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

            {/* Other inputs */}
            {[
              "temperature",
              "permatePressure",
              "feedFlow",
              "foulingFactor",
              "feedTDS",
              "recoveryTarget",
              "recyclePercent",
              "flowFactor",
            ].map((key) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {inputLabels[key]?.label || 
                    (key === "recoveryTarget" ? "Target Recovery" : 
                     key === "recyclePercent" ? "Recycle Percent" :
                     key === "flowFactor" ? "Flow Factor" : key)}
                  {inputLabels[key]?.unit || 
                    (key === "recoveryTarget" || key === "recyclePercent" ? "%" : "") && (
                    <span className="text-gray-500 ml-1">
                      ({inputLabels[key]?.unit || 
                    (key === "recoveryTarget" || key === "recyclePercent" ? "%" : "")})
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
            ))}
            
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
                    <td className="px-3 py-2 whitespace-nowrap text-sm">{el.feedPressure || '-'}</td>
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
