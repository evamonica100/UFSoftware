"use client";

import React, { useState, useEffect } from "react";
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

interface FeedWaterAnalysis {
  Q_demand_net: number;
  temperature: number;
  pH: number;
  tds: number;
  tss: number;
  turbidity: number;
  sdi15: number;
  toc: number;
}

interface DesignCriteria {
  flux25_target: number;
  temp_correction_theta: number;
  recovery_target: number;
  n_trains_online: number;
  n_trains_redundant: number;
  safety_factor_area: number;
  module_type: string;
}

interface BackwashSettings {
  interval_min: number;
  J_BW: number;
  t_AS_s: number;
  t_GD_s: number;
  t_BWTop_s: number;
  t_BWBot_s: number;
  t_FF_s: number;
}

interface CEBSettings {
  enabled: boolean;
  frequency_h: number;
  soak_min: number;
  chemical_type: string;
  target_concentration: number;
  target_pH: number;
}

interface CIPSettings {
  frequency_days: number;
  alkali_pH: number;
  acid_pH: number;
  temperature: number;
  recycle_temp: number;
}

interface HydraulicSettings {
  max_inlet_pressure: number;
  max_TMP_run: number;
  max_TMP_BW: number;
  air_pressure_range: number;
  idle_switch_s: number;
  valve_stagger_s: number;
}

interface ModuleSpec {
  area_m2: number;
  vol_module_L: number;
  max_inlet_bar: number;
  max_TMP_bar: number;
  max_TMP_BW_bar: number;
  air_scour_Nm3h: number;
  CIP_flow_m3h_per_mod: number;
  length_mm: number;
  diameter_mm: number;
  weight_kg: number;
}

interface UFResults {
  // Basic calculations
  J_T: number;
  A_req: number;
  n_mod_per_train: number;
  total_modules: number;
  Q_gross: number;
  concentration_factor: number;
  
  // Availability calculations
  f_avail: number;
  f_BW: number;
  f_CEB: number;
  f_CIP: number;
  
  // Flux rates
  instantaneous_flux: number;
  average_flux: number;
  net_flux: number;
  
  // Backwash calculations
  Q_BW: number;
  V_cycle: number;
  V_BW_tank: number;
  V_CIP_tank: number;
  
  // Equipment sizing
  feed_pump_flow: number;
  feed_pump_head: number;
  backwash_pump_flow: number;
  cip_pump_flow: number;
  air_blower_flow: number;
  
  // Chemical consumption
  ceb_chemical_consumption: number;
  bw_water_consumption: number;
  
  // Water quality predictions
  expected_turbidity: number;
  expected_toc_removal: number;
  expected_sdi: number;
  
  // Validation warnings
  warnings: string[];
  errors: string[];
}

const UFDesignSoftware = () => {
  // Module database
  const moduleDatabase: Record<string, ModuleSpec> = {
    "8060-PVDF": {
      area_m2: 73,
      vol_module_L: 40,
      max_inlet_bar: 6.25,
      max_TMP_bar: 2.1,
      max_TMP_BW_bar: 2.5,
      air_scour_Nm3h: 12,
      CIP_flow_m3h_per_mod: 1.0,
      length_mm: 1742.5,
      diameter_mm: 172.5,
      weight_kg: 73
    },
    "8080-PVDF": {
      area_m2: 73,
      vol_module_L: 50,
      max_inlet_bar: 6.25,
      max_TMP_bar: 2.1,
      max_TMP_BW_bar: 2.5,
      air_scour_Nm3h: 12,
      CIP_flow_m3h_per_mod: 1.0,
      length_mm: 2242.5,
      diameter_mm: 172.5,
      weight_kg: 73
    },
    "2860-PVDF": {
      area_m2: 180,
      vol_module_L: 45,
      max_inlet_bar: 6.25,
      max_TMP_bar: 2.1,
      max_TMP_BW_bar: 2.5,
      air_scour_Nm3h: 12,
      CIP_flow_m3h_per_mod: 1.5,
      length_mm: 1860,
      diameter_mm: 180,
      weight_kg: 180
    },
    "2880-PVDF": {
      area_m2: 180,
      vol_module_L: 60,
      max_inlet_bar: 6.25,
      max_TMP_bar: 2.1,
      max_TMP_BW_bar: 2.5,
      air_scour_Nm3h: 12,
      CIP_flow_m3h_per_mod: 1.5,
      length_mm: 2360,
      diameter_mm: 180,
      weight_kg: 180
    }
  };

  // State management
  const [feedWater, setFeedWater] = useState<FeedWaterAnalysis>({
    Q_demand_net: 39.0,
    temperature: 25,
    pH: 6.8,
    tds: 34152,
    tss: 2.0,
    turbidity: 0.5,
    sdi15: 3.0,
    toc: 1.5
  });

  const [designCriteria, setDesignCriteria] = useState<DesignCriteria>({
    flux25_target: 100,
    temp_correction_theta: 1.025,
    recovery_target: 98,
    n_trains_online: 1,
    n_trains_redundant: 0,
    safety_factor_area: 1.2,
    module_type: "2880-PVDF"
  });

  const [backwashSettings, setBackwashSettings] = useState<BackwashSettings>({
    interval_min: 90,
    J_BW: 100,
    t_AS_s: 20,
    t_GD_s: 30,
    t_BWTop_s: 30,
    t_BWBot_s: 30,
    t_FF_s: 45
  });

  const [cebSettings, setCebSettings] = useState<CEBSettings>({
    enabled: true,
    frequency_h: 168,
    soak_min: 10,
    chemical_type: "NaOCl",
    target_concentration: 350,
    target_pH: 11
  });

  const [cipSettings, setCipSettings] = useState<CIPSettings>({
    frequency_days: 90,
    alkali_pH: 12,
    acid_pH: 2,
    temperature: 35,
    recycle_temp: 35
  });

  const [hydraulicSettings, setHydraulicSettings] = useState<HydraulicSettings>({
    max_inlet_pressure: 6.25,
    max_TMP_run: 2.1,
    max_TMP_BW: 2.5,
    air_pressure_range: 0.75,
    idle_switch_s: 6,
    valve_stagger_s: 1
  });

  const [results, setResults] = useState<UFResults | null>(null);

  // Main calculation function
  const calculateUFDesign = (): UFResults => {
    const selectedModule = moduleDatabase[designCriteria.module_type];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validation
    if (designCriteria.flux25_target < 40 || designCriteria.flux25_target > 110) {
      warnings.push(`Flux target ${designCriteria.flux25_target} LMH is outside recommended range (40-110 LMH)`);
    }

    // 1. Temperature correction
    const J_T = designCriteria.flux25_target * Math.pow(designCriteria.temp_correction_theta, (feedWater.temperature - 25));

    // 2. Initial area calculation with iterative availability
    let f_avail = 0.98; // Initial guess
    let A_req = 0;
    let n_mod_per_train = 0;
    let iterations = 0;

    while (iterations < 5) {
      const A_need = (feedWater.Q_demand_net / f_avail) / (J_T / 1000);
      A_req = A_need * designCriteria.safety_factor_area;
      n_mod_per_train = Math.ceil(A_req / selectedModule.area_m2);

      // Calculate availability factors
      const t_np = backwashSettings.t_AS_s + backwashSettings.t_GD_s + 
                   backwashSettings.t_BWTop_s + backwashSettings.t_BWBot_s + 
                   backwashSettings.t_FF_s;
      const f_BW = (backwashSettings.interval_min * 60) / (backwashSettings.interval_min * 60 + t_np);
      
      const ceb_duration_h = cebSettings.enabled ? (t_np / 3600 + cebSettings.soak_min / 60) : 0;
      const f_CEB = cebSettings.enabled ? (1 - ceb_duration_h / cebSettings.frequency_h) : 1;
      
      const cip_duration_h = 5; // Typical CIP duration
      const f_CIP = 1 - cip_duration_h / (cipSettings.frequency_days * 24);
      
      const f_avail_new = f_BW * f_CEB * f_CIP;
      
      if (Math.abs(f_avail_new - f_avail) < 0.005) break;
      f_avail = f_avail_new;
      iterations++;
    }

    const Q_gross = feedWater.Q_demand_net / f_avail;
    const total_modules = n_mod_per_train * (designCriteria.n_trains_online + designCriteria.n_trains_redundant);

    // 3. Flux calculations
    const instantaneous_flux = J_T;
    const average_flux = J_T * f_avail;
    const net_flux = average_flux * (designCriteria.recovery_target / 100);

    // 4. Backwash calculations
    const A_train = n_mod_per_train * selectedModule.area_m2;
    const Q_BW = (backwashSettings.J_BW * A_train) / 1000; // m³/h
    
    const V_AS = n_mod_per_train * selectedModule.vol_module_L * 0.15 / 1000; // 15% displacement
    const V_BWtop = Q_BW * backwashSettings.t_BWTop_s / 3600;
    const V_BWbot = Q_BW * backwashSettings.t_BWBot_s / 3600;
    const V_FF = Q_gross * 0.8 * backwashSettings.t_FF_s / 3600; // 80% of feed flow
    const V_cycle = V_AS + V_BWtop + V_BWbot + V_FF;
    const V_BW_tank = V_cycle * 1.3; // 30% safety factor

    // 5. CIP tank sizing
    const vol_modules = (n_mod_per_train * selectedModule.vol_module_L) / 1000;
    const vol_piping = vol_modules * 0.2; // Estimate 20% of module volume
    const V_CIP_tank = vol_modules + vol_piping + 0.5; // 0.5 m³ NPSH allowance

    // 6. Equipment sizing
    const feed_pump_flow = Q_gross;
    const feed_pump_head = 15 + 5 + 8; // Static + losses + TMP (rough estimate)
    const backwash_pump_flow = Q_BW;
    const cip_pump_flow = n_mod_per_train * selectedModule.CIP_flow_m3h_per_mod;
    const air_blower_flow = n_mod_per_train * selectedModule.air_scour_Nm3h;

    // 7. Chemical consumption
    const V_CEB = vol_modules + vol_piping; // Volume to be soaked
    const ceb_chemical_mass = cebSettings.target_concentration * V_CEB * 1000; // mg
    const ceb_chemical_consumption = ceb_chemical_mass / 1000000; // kg per event

    const bw_cycles_per_hour = 60 / backwashSettings.interval_min;
    const bw_water_consumption = V_cycle * bw_cycles_per_hour; // m³/h

    // 8. Water quality predictions
    const expected_turbidity = Math.max(0.1, feedWater.turbidity * 0.01); // 99% removal
    const expected_toc_removal = Math.min(15, Math.max(5, feedWater.toc * 0.1)); // 5-15% removal
    const expected_sdi = Math.min(2.5, feedWater.sdi15 * 0.8); // Improvement

    // 9. Concentration factor (for reference)
    const concentration_factor = 1 / (1 - designCriteria.recovery_target / 100);

    // 10. Additional validations
    if (Q_BW * 3600 / A_train > 120) {
      warnings.push("Backwash flux exceeds 120 LMH recommendation");
    }
    
    if (air_blower_flow > 200) {
      warnings.push("High air scour requirement may need multiple blowers");
    }

    if (n_mod_per_train > 12) {
      warnings.push("Consider splitting into multiple trains for better operability");
    }

    return {
      J_T,
      A_req,
      n_mod_per_train,
      total_modules,
      Q_gross,
      concentration_factor,
      f_avail,
      f_BW: f_avail, // Simplified for display
      f_CEB: 1,
      f_CIP: 1,
      instantaneous_flux,
      average_flux,
      net_flux,
      Q_BW,
      V_cycle,
      V_BW_tank,
      V_CIP_tank,
      feed_pump_flow,
      feed_pump_head,
      backwash_pump_flow,
      cip_pump_flow,
      air_blower_flow,
      ceb_chemical_consumption,
      bw_water_consumption,
      expected_turbidity,
      expected_toc_removal,
      expected_sdi,
      warnings,
      errors
    };
  };

  const handleCalculate = () => {
    const calculatedResults = calculateUFDesign();
    setResults(calculatedResults);
    localStorage.setItem("ufDesignResults", JSON.stringify(calculatedResults));
    localStorage.setItem("feedWater", JSON.stringify(feedWater));
    localStorage.setItem("designCriteria", JSON.stringify(designCriteria));
  };

  const exportToExcel = () => {
    if (!results) {
      alert("Please calculate results first");
      return;
    }

    const wb = XLSX.utils.book_new();

    // System Overview
    const systemOverview = [
      ["UF System Design Summary", "", ""],
      ["Design Capacity", feedWater.Q_demand_net, "m³/h"],
      ["Module Type", designCriteria.module_type, ""],
      ["Number of Trains", designCriteria.n_trains_online, ""],
      ["Modules per Train", results.n_mod_per_train, ""],
      ["Total Modules", results.total_modules, ""],
      ["Operating Flux", results.instantaneous_flux.toFixed(1), "LMH"],
      ["Recovery Rate", designCriteria.recovery_target, "%"],
      ["System Availability", (results.f_avail * 100).toFixed(1), "%"],
      ["", "", ""],
      ["Feed Water Quality", "", ""],
      ["Temperature", feedWater.temperature, "°C"],
      ["pH", feedWater.pH, ""],
      ["Turbidity", feedWater.turbidity, "NTU"],
      ["TSS", feedWater.tss, "mg/L"],
      ["TDS", feedWater.tds, "mg/L"],
      ["SDI15", feedWater.sdi15, ""],
      ["TOC", feedWater.toc, "mg/L"],
    ];

    // Equipment Sizing
    const equipmentSizing = [
      ["Equipment Sizing", "Capacity", "Unit"],
      ["Feed Pump Flow", results.feed_pump_flow.toFixed(1), "m³/h"],
      ["Feed Pump Head", results.feed_pump_head.toFixed(1), "m"],
      ["Backwash Pump Flow", results.backwash_pump_flow.toFixed(1), "m³/h"],
      ["CIP Pump Flow", results.cip_pump_flow.toFixed(1), "m³/h"],
      ["Air Blower", results.air_blower_flow.toFixed(0), "Nm³/h"],
      ["BW/Filtrate Tank", results.V_BW_tank.toFixed(1), "m³"],
      ["CIP Tank", results.V_CIP_tank.toFixed(1), "m³"],
      ["", "", ""],
      ["Operating Cycles", "", ""],
      ["Filtration Duration", backwashSettings.interval_min, "min"],
      ["Backwash Duration", ((backwashSettings.t_AS_s + backwashSettings.t_GD_s + backwashSettings.t_BWTop_s + backwashSettings.t_BWBot_s + backwashSettings.t_FF_s) / 60).toFixed(1), "min"],
      ["CEB Frequency", cebSettings.frequency_h, "hours"],
      ["CIP Frequency", cipSettings.frequency_days, "days"],
    ];

    // Performance Predictions
    const performance = [
      ["Performance Predictions", "Feed", "Product"],
      ["Turbidity (NTU)", feedWater.turbidity, results.expected_turbidity.toFixed(2)],
      ["SDI15", feedWater.sdi15, results.expected_sdi.toFixed(1)],
      ["TOC (mg/L)", feedWater.toc, (feedWater.toc - results.expected_toc_removal).toFixed(1)],
      ["", "", ""],
      ["Utility Consumption", "Value", "Unit"],
      ["Backwash Water", results.bw_water_consumption.toFixed(1), "m³/h"],
      ["CEB Chemical", results.ceb_chemical_consumption.toFixed(2), "kg/event"],
      ["Air for Scour", results.air_blower_flow.toFixed(0), "Nm³/h"],
    ];

    const systemWs = XLSX.utils.aoa_to_sheet(systemOverview);
    const equipmentWs = XLSX.utils.aoa_to_sheet(equipmentSizing);
    const performanceWs = XLSX.utils.aoa_to_sheet(performance);

    XLSX.utils.book_append_sheet(wb, systemWs, "System Overview");
    XLSX.utils.book_append_sheet(wb, equipmentWs, "Equipment Sizing");
    XLSX.utils.book_append_sheet(wb, performanceWs, "Performance");

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'UF_System_Design.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Load saved data on component mount
  useEffect(() => {
    const savedFeedWater = localStorage.getItem("feedWater");
    const savedDesignCriteria = localStorage.getItem("designCriteria");
    const savedResults = localStorage.getItem("ufDesignResults");

    if (savedFeedWater) {
      setFeedWater(JSON.parse(savedFeedWater));
    }
    if (savedDesignCriteria) {
      setDesignCriteria(JSON.parse(savedDesignCriteria));
    }
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">
        UF System Design Software
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Feed Water & Project Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">Feed Water & Project Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Net Product Demand (m³/h)</label>
                <input
                  type="number"
                  value={feedWater.Q_demand_net}
                  onChange={(e) => setFeedWater(prev => ({ ...prev, Q_demand_net: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  value={feedWater.temperature}
                  onChange={(e) => setFeedWater(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">pH</label>
                <input
                  type="number"
                  step="0.1"
                  value={feedWater.pH}
                  onChange={(e) => setFeedWater(prev => ({ ...prev, pH: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TDS (mg/L)</label>
                <input
                  type="number"
                  value={feedWater.tds}
                  onChange={(e) => setFeedWater(prev => ({ ...prev, tds: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TSS (mg/L)</label>
                <input
                  type="number"
                  value={feedWater.tss}
                  onChange={(e) => setFeedWater(prev => ({ ...prev, tss: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turbidity (NTU)</label>
                <input
                  type="number"
                  step="0.1"
                  value={feedWater.turbidity}
                  onChange={(e) => setFeedWater(prev => ({ ...prev, turbidity: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SDI15</label>
                <input
                  type="number"
                  step="0.1"
                  value={feedWater.sdi15}
                  onChange={(e) => setFeedWater(prev => ({ ...prev, sdi15: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TOC (mg/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={feedWater.toc}
                  onChange={(e) => setFeedWater(prev => ({ ...prev, toc: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Design Criteria */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">Design Criteria</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Flux @ 25°C (LMH)</label>
                <input
                  type="number"
                  value={designCriteria.flux25_target}
                  onChange={(e) => setDesignCriteria(prev => ({ ...prev, flux25_target: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
                <span className="text-xs text-gray-500">Range: 40-110 LMH</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module Type</label>
                <select
                  value={designCriteria.module_type}
                  onChange={(e) => setDesignCriteria(prev => ({ ...prev, module_type: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  {Object.keys(moduleDatabase).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recovery Target (%)</label>
                <input
                  type="number"
                  value={designCriteria.recovery_target}
                  onChange={(e) => setDesignCriteria(prev => ({ ...prev, recovery_target: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Online Trains</label>
                <input
                  type="number"
                  value={designCriteria.n_trains_online}
                  onChange={(e) => setDesignCriteria(prev => ({ ...prev, n_trains_online: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Redundant Trains</label>
                <input
                  type="number"
                  value={designCriteria.n_trains_redundant}
                  onChange={(e) => setDesignCriteria(prev => ({ ...prev, n_trains_redundant: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Safety Factor</label>
                <input
                  type="number"
                  step="0.1"
                  value={designCriteria.safety_factor_area}
                  onChange={(e) => setDesignCriteria(prev => ({ ...prev, safety_factor_area: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
                <span className="text-xs text-gray-500">Typical: 1.1-1.3</span>
              </div>
            </div>
          </div>

          {/* Backwash Settings */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">Backwash Program</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interval (min)</label>
                <input
                  type="number"
                  value={backwashSettings.interval_min}
                  onChange={(e) => setBackwashSettings(prev => ({ ...prev, interval_min: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BW Flux (LMH)</label>
                <input
                  type="number"
                  value={backwashSettings.J_BW}
                  onChange={(e) => setBackwashSettings(prev => ({ ...prev, J_BW: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
                <span className="text-xs text-gray-500">Range: 100-120 LMH</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Air Scour (s)</label>
                <input
                  type="number"
                  value={backwashSettings.t_AS_s}
                  onChange={(e) => setBackwashSettings(prev => ({ ...prev, t_AS_s: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gravity Drain (s)</label>
                <input
                  type="number"
                  value={backwashSettings.t_GD_s}
                  onChange={(e) => setBackwashSettings(prev => ({ ...prev, t_GD_s: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BW Top (s)</label>
                <input
                  type="number"
                  value={backwashSettings.t_BWTop_s}
                  onChange={(e) => setBackwashSettings(prev => ({ ...prev, t_BWTop_s: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BW Bottom (s)</label>
                <input
                  type="number"
                  value={backwashSettings.t_BWBot_s}
                  onChange={(e) => setBackwashSettings(prev => ({ ...prev, t_BWBot_s: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forward Flush (s)</label>
                <input
                  type="number"
                  value={backwashSettings.t_FF_s}
                  onChange={(e) => setBackwashSettings(prev => ({ ...prev, t_FF_s: Number(e.target.value) }))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* CEB Settings */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-700 mb-4">CEB Program</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={cebSettings.enabled}
                    onChange={(e) => setCebSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable CEB</span>
                </label>
              </div>
              {cebSettings.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (hours)</label>
                    <input
                      type="number"
                      value={cebSettings.frequency_h}
                      onChange={(e) => setCebSettings(prev => ({ ...prev, frequency_h: Number(e.target.value) }))}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soak Time (min)</label>
                    <input
                      type="number"
                      value={cebSettings.soak_min}
                      onChange={(e) => setCebSettings(prev => ({ ...prev, soak_min: Number(e.target.value) }))}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chemical Type</label>
                    <select
                      value={cebSettings.chemical_type}
                      onChange={(e) => setCebSettings(prev => ({ ...prev, chemical_type: e.target.value }))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="NaOCl">Sodium Hypochlorite</option>
                      <option value="HCl">Hydrochloric Acid</option>
                      <option value="NaOH">Sodium Hydroxide</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {cebSettings.chemical_type === 'NaOCl' ? 'Concentration (mg/L)' : 'Target pH'}
                    </label>
                    <input
                      type="number"
                      value={cebSettings.chemical_type === 'NaOCl' ? cebSettings.target_concentration : cebSettings.target_pH}
                      onChange={(e) => {
                        if (cebSettings.chemical_type === 'NaOCl') {
                          setCebSettings(prev => ({ ...prev, target_concentration: Number(e.target.value) }));
                        } else {
                          setCebSettings(prev => ({ ...prev, target_pH: Number(e.target.value) }));
                        }
                      }}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleCalculate}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Calculate UF Design
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
              {/* System Overview */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">UF System Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Module Type</div>
                    <div className="text-xl font-bold text-blue-800">{designCriteria.module_type}</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Total Modules</div>
                    <div className="text-xl font-bold text-blue-800">{results.total_modules}</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Modules per Train</div>
                    <div className="text-xl font-bold text-blue-800">{results.n_mod_per_train}</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">System Recovery</div>
                    <div className="text-xl font-bold text-green-600">{designCriteria.recovery_target}%</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Operating Flux</div>
                    <div className="text-xl font-bold text-blue-800">{results.instantaneous_flux.toFixed(1)} LMH</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">System Availability</div>
                    <div className="text-xl font-bold text-green-600">{(results.f_avail * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Operating Conditions Chart */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Operating Conditions</h3>
                <Bar
                  data={{
                    labels: ['Filtration', 'Air Scour', 'Gravity Drain', 'BW Top', 'BW Bottom', 'Forward Flush'],
                    datasets: [
                      {
                        label: 'Duration (seconds)',
                        data: [
                          backwashSettings.interval_min * 60,
                          backwashSettings.t_AS_s,
                          backwashSettings.t_GD_s,
                          backwashSettings.t_BWTop_s,
                          backwashSettings.t_BWBot_s,
                          backwashSettings.t_FF_s
                        ],
                        backgroundColor: [
                          'rgba(54, 162, 235, 0.8)',
                          'rgba(255, 99, 132, 0.8)',
                          'rgba(255, 206, 86, 0.8)',
                          'rgba(75, 192, 192, 0.8)',
                          'rgba(153, 102, 255, 0.8)',
                          'rgba(255, 159, 64, 0.8)'
                        ],
                        borderColor: [
                          'rgba(54, 162, 235, 1)',
                          'rgba(255, 99, 132, 1)',
                          'rgba(255, 206, 86, 1)',
                          'rgba(75, 192, 192, 1)',
                          'rgba(153, 102, 255, 1)',
                          'rgba(255, 159, 64, 1)'
                        ],
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
                            const minutes = (context.parsed.y / 60).toFixed(1);
                            return `${context.parsed.y}s (${minutes} min)`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Duration (seconds)'
                        }
                      }
                    }
                  }}
                />
              </div>

              {/* Equipment Sizing */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Equipment Sizing</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded border text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Equipment</th>
                        <th className="px-3 py-2 text-center">Capacity</th>
                        <th className="px-3 py-2 text-center">Unit</th>
                        <th className="px-3 py-2 text-center">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">Feed Pump</td>
                        <td className="px-3 py-2 text-center">{results.feed_pump_flow.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">m³/h</td>
                        <td className="px-3 py-2 text-center">Head: {results.feed_pump_head.toFixed(1)} m</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">Backwash Pump</td>
                        <td className="px-3 py-2 text-center">{results.backwash_pump_flow.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">m³/h</td>
                        <td className="px-3 py-2 text-center">Flux: {backwashSettings.J_BW} LMH</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">CIP Pump</td>
                        <td className="px-3 py-2 text-center">{results.cip_pump_flow.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">m³/h</td>
                        <td className="px-3 py-2 text-center">Per train</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">Air Blower</td>
                        <td className="px-3 py-2 text-center">{results.air_blower_flow.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">Nm³/h</td>
                        <td className="px-3 py-2 text-center">Per train</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">BW/Filtrate Tank</td>
                        <td className="px-3 py-2 text-center">{results.V_BW_tank.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">m³</td>
                        <td className="px-3 py-2 text-center">Per train</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">CIP Tank</td>
                        <td className="px-3 py-2 text-center">{results.V_CIP_tank.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">m³</td>
                        <td className="px-3 py-2 text-center">Per train</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Water Quality Predictions */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Water Quality Predictions</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded border text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Parameter</th>
                        <th className="px-3 py-2 text-center">Feed</th>
                        <th className="px-3 py-2 text-center">Expected Product</th>
                        <th className="px-3 py-2 text-center">Removal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">Turbidity (NTU)</td>
                        <td className="px-3 py-2 text-center">{feedWater.turbidity}</td>
                        <td className="px-3 py-2 text-center">{results.expected_turbidity.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            &gt;99%
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">SDI15</td>
                        <td className="px-3 py-2 text-center">{feedWater.sdi15}</td>
                        <td className="px-3 py-2 text-center">{results.expected_sdi.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Improved
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">TOC (mg/L)</td>
                        <td className="px-3 py-2 text-center">{feedWater.toc}</td>
                        <td className="px-3 py-2 text-center">{(feedWater.toc - results.expected_toc_removal).toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            {((results.expected_toc_removal / feedWater.toc) * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-medium">TSS (mg/L)</td>
                        <td className="px-3 py-2 text-center">{feedWater.tss}</td>
                        <td className="px-3 py-2 text-center">&lt;0.1</td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            &gt;99%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Utility Consumption */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Utility Consumption</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Backwash Water</div>
                    <div className="text-xl font-bold text-blue-800">{results.bw_water_consumption.toFixed(1)} m³/h</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">CEB Chemical</div>
                    <div className="text-xl font-bold text-blue-800">{results.ceb_chemical_consumption.toFixed(2)} kg/event</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Air for Scour</div>
                    <div className="text-xl font-bold text-blue-800">{results.air_blower_flow.toFixed(0)} Nm³/h</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-600">Daily BW Consumption</div>
                    <div className="text-xl font-bold text-blue-800">{(results.bw_water_consumption * 24).toFixed(0)} m³/day</div>
                  </div>
                </div>
              </div>

              {/* Warnings and Recommendations */}
              {(results.warnings.length > 0 || results.errors.length > 0) && (
                <div className="bg-white border-l-4 border-yellow-500 p-4 rounded">
                  <h3 className="text-lg font-semibold text-yellow-700 mb-3">System Recommendations</h3>
                  <div className="space-y-2 text-sm">
                    {results.errors.map((error, index) => (
                      <div key={`error-${index}`} className="p-3 bg-red-50 border border-red-200 rounded">
                        <strong className="text-red-800">❌ Error:</strong>
                        <p className="text-red-700">{error}</p>
                      </div>
                    ))}
                    
                    {results.warnings.map((warning, index) => (
                      <div key={`warning-${index}`} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <strong className="text-yellow-800">⚠️ Warning:</strong>
                        <p className="text-yellow-700">{warning}</p>
                      </div>
                    ))}

                    {/* Positive recommendations */}
                    {results.warnings.length === 0 && results.errors.length === 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <strong className="text-green-800">✅ System Design Validated:</strong>
                        <p className="text-green-700">All parameters are within acceptable design limits. The UF system configuration is suitable for the given feed water conditions.</p>
                      </div>
                    )}

                    {results.f_avail > 0.95 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <strong className="text-green-800">✅ High Availability:</strong>
                        <p className="text-green-700">System availability of {(results.f_avail * 100).toFixed(1)}% indicates efficient operation with minimal downtime.</p>
                      </div>
                    )}

                    {designCriteria.flux25_target >= 40 && designCriteria.flux25_target <= 110 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <strong className="text-green-800">✅ Optimal Flux:</strong>
                        <p className="text-green-700">Operating flux of {results.instantaneous_flux.toFixed(1)} LMH is within the recommended range for stable operation.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {!results && (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <div className="text-gray-500 text-lg mb-2">No Results Yet</div>
              <p className="text-gray-400">Enter your feed water parameters and design criteria, then click "Calculate UF Design" to see the system specifications.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UFDesignSoftware;
