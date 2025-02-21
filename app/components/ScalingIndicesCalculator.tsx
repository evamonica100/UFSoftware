"use client";

import React, { useState } from 'react';

interface Inputs {
  tds: string;
  temp: string;
  caH: string;
  mAlk: string;
  pH: string;
  // Advanced mode inputs
  calcium: string;
  magnesium: string;
  sodium: string;
  potassium: string;
  iron: string;
  manganese: string;
  ammonium: string;
  chloride: string;
  sulfate: string;
  bicarbonate: string;
  carbonate: string;
  nitrate: string;
  phosphate: string;
  fluoride: string;
  silica: string;
  boron: string;
  carbonDioxide: string;
}

const ScalingIndicesCalculator = () => {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [inputs, setInputs] = useState<Inputs>({
    tds: '',
    temp: '',
    caH: '',
    mAlk: '',
    pH: '',
    calcium: '',
    magnesium: '',
    sodium: '',
    potassium: '',
    iron: '',
    manganese: '',
    ammonium: '',
    chloride: '',
    sulfate: '',
    bicarbonate: '',
    carbonate: '',
    nitrate: '',
    phosphate: '',
    fluoride: '',
    silica: '',
    boron: '',
    carbonDioxide: ''
  });

  const [results, setResults] = useState<{
    rsi: number;
    lsi: number;
    psi: number;
    chargeBalance?: number;
    carbonateEquilibrium?: {
      dissolvedCO2: number;
      alkalinity: number;
    };
  } | null>(null);

  const [errors, setErrors] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showWaterAnalysis, setShowWaterAnalysis] = useState(false);

  // Convert ion concentration to CaCO3 equivalent
  // (mg/L of ion × (50.0 / MW)) where 50.0 is the equivalent weight of CaCO3
  // and MW is the molecular weight of the ion
  const convertToCaCO3 = (concentration: number, molecularWeight: number) => {
    return concentration * (50.0 / molecularWeight);
  };

  const calculateTDS = () => {
    const ions = {
      calcium: 40.08,
      magnesium: 24.305,
      sodium: 22.99,
      potassium: 39.098,
      iron: 55.845,
      manganese: 54.938,
      ammonium: 18.04,
      chloride: 35.45,
      sulfate: 96.06,
      bicarbonate: 61.017,
      carbonate: 60.009,
      nitrate: 62.004,
      phosphate: 94.971,
      fluoride: 18.998
    };

    return Object.entries(ions).reduce((sum, [ion, weight]) => {
      const concentration = parseFloat(inputs[ion as keyof Inputs] || '0');
      return sum + convertToCaCO3(concentration, weight);
    }, 0);
  };

  const adjustIon = (ion: string) => {
    const newInputs = { ...inputs };
    const currentChargeDifference = calculateTotalCations() - calculateTotalAnions();

    // Calculate required adjustment based on ion valence
    const getValence = (ion: string) => {
      switch(ion) {
        case 'sodium': return 1;
        case 'calcium': return 2;
        case 'ammonium': return 1;
        case 'chloride': return -1;
        case 'sulfate': return -2;
        default: return 0;
      }
    };

    const getMolecularWeight = (ion: string) => {
      switch(ion) {
        case 'sodium': return 22.99;
        case 'calcium': return 40.08;
        case 'ammonium': return 18.04;
        case 'chloride': return 35.45;
        case 'sulfate': return 96.06;
        default: return 0;
      }
    };

    const valence = getValence(ion);
    const molWeight = getMolecularWeight(ion);

    // Calculate required amount in meq/L then convert to mg/L
    let requiredAmount = 0;
    if (valence > 0) {
      // For cations
      requiredAmount = Math.abs(currentChargeDifference) * molWeight / valence;
    } else {
      // For anions
      requiredAmount = Math.abs(currentChargeDifference) * molWeight / Math.abs(valence);
    }

    // Add the calculated amount
    const currentValue = parseFloat(newInputs[ion as keyof Inputs] || '0');
    newInputs[ion as keyof Inputs] = (currentValue + requiredAmount).toString();
    setInputs(newInputs);
  };

  const validateInputs = () => {
    const newErrors: string[] = [];

    // Basic validation with suggestions
    if (!inputs.pH) {
      newErrors.push('pH is required');
    } else if (parseFloat(inputs.pH) < 0 || parseFloat(inputs.pH) > 14) {
      newErrors.push('pH must be between 0 and 14. Typical cooling water pH range is 7-9');
    }
    if (!inputs.temp || parseFloat(inputs.temp) < 0 || parseFloat(inputs.temp) > 100) {
      newErrors.push('Temperature must be between 0°C and 100°C');
    }

    if (!isAdvancedMode) {
      // Quick mode validations
      if (!inputs.tds) {
        newErrors.push('Total Dissolved Solids (TDS) is required');
      } else if (parseFloat(inputs.tds) < 0) {
        newErrors.push('TDS must be a positive number');
      } else if (parseFloat(inputs.tds) > 40000) {
        newErrors.push('TDS exceeds typical range for cooling water (0-40,000 ppm)');
      }

      if (!inputs.caH) {
        newErrors.push('Calcium Hardness is required');
      } else if (parseFloat(inputs.caH) < 0) {
        newErrors.push('Calcium Hardness must be a positive number');
      } else if (parseFloat(inputs.caH) > 1000) {
        newErrors.push('Calcium Hardness exceeds typical range (0-1,000 ppm as CaCO₃)');
      }

      if (!inputs.mAlk) {
        newErrors.push('M-Alkalinity is required');
      } else if (parseFloat(inputs.mAlk) < 0) {
        newErrors.push('M-Alkalinity must be a positive number');
      } else if (parseFloat(inputs.mAlk) > 1000) {
        newErrors.push('M-Alkalinity exceeds typical range (0-1,000 ppm as CaCO₃)');
      }
    }

    if (isAdvancedMode) {
      // Advanced mode validations
      const ions = ['calcium', 'magnesium', 'sodium', 'chloride', 'sulfate', 'bicarbonate', 'carbonate', 'nitrate', 'phosphate', 'fluoride', 'silica', 'boron', 'carbonDioxide'];
      ions.forEach(ion => {
        if (inputs[ion as keyof Inputs] && parseFloat(inputs[ion as keyof Inputs]) < 0) {
          newErrors.push(`${ion.charAt(0).toUpperCase() + ion.slice(1)} concentration must be positive`);
        }
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const calculateTotalCations = () => {
    const calcium = parseFloat(inputs.calcium) || 0;
    const magnesium = parseFloat(inputs.magnesium) || 0;
    const sodium = parseFloat(inputs.sodium) || 0;
    const potassium = parseFloat(inputs.potassium) || 0;
    const iron = parseFloat(inputs.iron) || 0;
    const manganese = parseFloat(inputs.manganese) || 0;
    const ammonium = parseFloat(inputs.ammonium) || 0;

    return (calcium / 40.08 * 2) + (magnesium / 24.305 * 2) + (sodium / 22.99) + (potassium / 39.098) + (iron / 55.845 * 2) + (manganese / 54.938 * 2) + (ammonium / 18.04);
  };

  const calculateTotalAnions = () => {
    const chloride = parseFloat(inputs.chloride) || 0;
    const sulfate = parseFloat(inputs.sulfate) || 0;
    const bicarbonate = parseFloat(inputs.bicarbonate) || 0;
    const carbonate = parseFloat(inputs.carbonate) || 0;
    const nitrate = parseFloat(inputs.nitrate) || 0;
    const phosphate = parseFloat(inputs.phosphate) || 0;
    const fluoride = parseFloat(inputs.fluoride) || 0;

    return (chloride / 35.45) + (sulfate / 96.06 * 2) + (bicarbonate / 61.017) + (carbonate / 60.009 * 2) + (nitrate / 62.004) + (phosphate / 94.971 * 3) + (fluoride / 18.998);
  };

  const calculateLarsonSkoldIndex = () => {
    const cl = (parseFloat(inputs.chloride) || 0) / 35.45;
    const so4 = (parseFloat(inputs.sulfate) || 0) / (96.06/2);
    const hco3 = (parseFloat(inputs.bicarbonate) || 0) / 61.017;
    const co3 = (parseFloat(inputs.carbonate) || 0) / (60.009/2);
    return (cl + so4) / (hco3 + co3);
  };

  const calculateCarbonateEquilibrium = () => {
    const temp = parseFloat(inputs.temp);
    const pH = parseFloat(inputs.pH);
    const bicarb = parseFloat(inputs.bicarbonate);
    const carb = parseFloat(inputs.carbonate);

    // Henry's law constant for CO2 (temperature dependent)
    const kH = 0.034 * Math.exp(-2400 * (1/(temp + 273.15) - 1/298.15));

    // Dissolved CO2 calculation
    const dissolvedCO2 = kH * (bicarb / (10 ** (pH - 6.3)));

    // Total alkalinity calculation
    const alkalinity = bicarb + 2 * carb + parseFloat(inputs.phosphate) * 2;

    return { dissolvedCO2, alkalinity };
  };

  const calculateIndices = () => {
    setErrors([]);
    if (!validateInputs()) return;

    try {
      const { pH, temp, tds: inputTds, caH, mAlk } = inputs;
      const pHa = parseFloat(pH);
      const tempNum = parseFloat(temp);

      // Calculate values based on mode
      let caHNum = 0;
      let mAlkNum = 0;
      let tds = 0;

      if (isAdvancedMode) {
        caHNum = convertToCaCO3(parseFloat(inputs.calcium || '0'), 40.08);
        mAlkNum = convertToCaCO3(parseFloat(inputs.bicarbonate || '0'), 61.017) + convertToCaCO3(parseFloat(inputs.carbonate || '0'), 60.009);
        tds = calculateTDS();
      } else {
        caHNum = parseFloat(caH || '0');
        mAlkNum = parseFloat(mAlk || '0');
        tds = parseFloat(inputTds || '0');
      }

      // Calculate temperature correction factor
      const tempK = tempNum + 273.15;
      const A = (Math.log10(tds) - 1) / 10;
      const B = -13.12 * Math.log10(tempK) + 34.55;
      const C = Math.log10(caHNum) - 0.4;
      const D = Math.log10(mAlkNum);

      // Calculate pHs (pH of saturation)
      const pHs = (9.3 + A + B) - (C + D);

      // Calculate indices
      const lsi = pHa - pHs;
      const rsi = 2 * pHs - pHa;
      const pHeq = 1.465 * Math.log10(mAlkNum) + 4.54;
      const psi = 2 * pHs - pHeq;

      const result: any = { rsi, lsi, psi };

      if (isAdvancedMode) {
        result.chargeBalance = (calculateTotalCations() - calculateTotalAnions()) / (calculateTotalCations() + calculateTotalAnions()) * 100;
        result.carbonateEquilibrium = calculateCarbonateEquilibrium();
      }

      setResults(result);
      setShowResults(true); // Show results after calculation
    } catch (error) {
      setErrors(['Calculation error. Please check all inputs are valid numbers.']);
    }
  };

  const resetCalculator = () => {
    setInputs({
      tds: '',
      temp: '',
      caH: '',
      mAlk: '',
      pH: '',
      calcium: '',
      magnesium: '',
      sodium: '',
      potassium: '',
      iron: '',
      manganese: '',
      ammonium: '',
      chloride: '',
      sulfate: '',
      bicarbonate: '',
      carbonate: '',
      nitrate: '',
      phosphate: '',
      fluoride: '',
      silica: '',
      boron: '',
      carbonDioxide: ''
    });
    setResults(null);
    setErrors([]);
    setShowResults(false); // Hide results after reset
  };

  const getWaterCondition = (index: string, value: number) => {
    switch (index) {
      case 'LSI':
        return value > 0 ? 'Scaling potential (CaCO₃ precipitation)' : 'Corrosive water (CaCO₃ dissolves)';
      case 'RSI':
        if (value < 5.5) return 'High scale forming';
        if (value < 6.2) return 'Low scale forming';
        if (value < 6.8) return 'No difficulties';
        if (value < 8.5) return 'Low corrosive';
        return 'High corrosive';
      case 'PSI':
        return value < 6 ? 'High scaling potential' : 'Low scaling or corrosion potential';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInputs = { ...inputs, [e.target.name]: e.target.value };
    setInputs(newInputs);
  };

  return (
    <div className="bg-gray-100 p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-blue-800">Scale Indices Calculator</h1>
        <div className="flex items-center space-x-2 whitespace-nowrap">
          <span className="text-sm text-gray-600">Quick Mode</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isAdvancedMode}
              onChange={(e) => setIsAdvancedMode(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm text-gray-600">Advanced Mode</span>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Validation Errors:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-md shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
            <input
              type="number"
              name="temp"
              value={inputs.temp}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">pH</label>
            <input
              type="number"
              name="pH"
              value={inputs.pH}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          {!isAdvancedMode && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Dissolved Solids (TDS) in ppm</label>
                <input
                  type="number"
                  name="tds"
                  value={inputs.tds}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Calcium Hardness (CaH)</label>
                <input
                  type="number"
                  name="caH"
                  value={inputs.caH}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">M-Alkalinity (M-Alk)</label>
                <input
                  type="number"
                  name="mAlk"
                  value={inputs.mAlk}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
            </>
          )}
        </div>

        {isAdvancedMode && (
          <>
            <h2 className="text-xl font-semibold mb-4 mt-6 text-blue-700">Cations (mg/L)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ca²⁺ (Calcium)</label>
                <input
                  type="number"
                  name="calcium"
                  value={inputs.calcium}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mg²⁺ (Magnesium)</label>
                <input
                  type="number"
                  name="magnesium"
                  value={inputs.magnesium}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Na⁺ (Sodium)</label>
                <input
                  type="number"
                  name="sodium"
                  value={inputs.sodium}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">K⁺ (Potassium)</label>
                <input
                  type="number"
                  name="potassium"
                  value={inputs.potassium}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fe²⁺ (Iron)</label>
                <input
                  type="number"
                  name="iron"
                  value={inputs.iron}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mn²⁺ (Manganese)</label>
                <input
                  type="number"
                  name="manganese"
                  value={inputs.manganese}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">NH₄⁺ (Ammonium)</label>
                <input
                  type="number"
                  name="ammonium"
                  value={inputs.ammonium}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4 mt-6 text-blue-700">Anions (mg/L)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cl⁻ (Chloride)</label>
                <input
                  type="number"
                  name="chloride"
                  value={inputs.chloride}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">SO₄²⁻ (Sulfate)</label>
                <input
                  type="number"
                  name="sulfate"
                  value={inputs.sulfate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">HCO₃⁻ (Bicarbonate)</label>
                <input
                  type="number"
                  name="bicarbonate"
                  value={inputs.bicarbonate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CO₃²⁻ (Carbonate)</label>
                <input
                  type="number"
                  name="carbonate"
                  value={inputs.carbonate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">NO₃⁻ (Nitrate)</label>
                <input
                  type="number"
                  name="nitrate"
                  value={inputs.nitrate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PO₄³⁻ (Phosphate)</label>
                <input
                  type="number"
                  name="phosphate"
                  value={inputs.phosphate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">F⁻ (Fluoride)</label>
                <input
                  type="number"
                  name="fluoride"
                  value={inputs.fluoride}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4 mt-6 text-blue-700">Neutrals (mg/L)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">SiO₂ (Silica)</label>
                <input
                  type="number"
                  name="silica"
                  value={inputs.silica}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">B (Boron)</label>
                <input
                  type="number"
                  name="boron"
                  value={inputs.boron}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CO₂ (Carbon Dioxide)</label>
                <input
                  type="number"
                  name="carbonDioxide"
                  value={inputs.carbonDioxide}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  calculateIndices();
                  setShowWaterAnalysis(true);
                  setShowResults(false);
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Analyze Water Chemistry
              </button>
            </div>

            {showWaterAnalysis && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-blue-700">Water Analysis</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">Total Cations: {calculateTotalCations().toFixed(2)} meq/L</p>
                    <p className="text-sm font-medium">Total Anions: {calculateTotalAnions().toFixed(2)} meq/L</p>
                    <p className="text-sm font-medium">Charge Imbalance: {((calculateTotalCations() - calculateTotalAnions()) / (calculateTotalCations() + calculateTotalAnions()) * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Dissolved Solutes: {(calculateTotalCations() + calculateTotalAnions()).toFixed(2)} mg/L</p>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Charge Balance Adjustment</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium mb-1">Cations:</p>
                      <div className="flex space-x-2">
                        <button onClick={() => adjustIon('sodium')} className="px-2 py-1 bg-blue-600 text-white text-sm rounded">Add Na⁺</button>
                        <button onClick={() => adjustIon('calcium')} className="px-2 py-1 bg-blue-600 text-white text-sm rounded">Add Ca²⁺</button>
                        <button onClick={() => adjustIon('ammonium')} className="px-2 py-1 bg-blue-600 text-white text-sm rounded">Add NH₄⁺</button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Anions:</p>
                      <div className="flex space-x-2">
                        <button onClick={() => adjustIon('chloride')} className="px-2 py-1 bg-green-600 text-white text-sm rounded">Add Cl⁻</button>
                        <button onClick={() => adjustIon('sulfate')} className="px-2 py-1 bg-green-600 text-white text-sm rounded">Add SO₄²⁻</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={resetCalculator}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Reset
          </button>
          <button
            onClick={calculateIndices}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Calculate Scale Indices
          </button>
        </div>
      </div>

      {showResults && results && ( //Conditional rendering of results
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">RESULTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-blue-800">Langelier Saturation Index (LSI)</h3>
              <p className="text-2xl font-bold mt-2">{results.lsi.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-2">{getWaterCondition('LSI', results.lsi)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-blue-800">Ryznar Stability Index (RSI)</h3>
              <p className="text-2xl font-bold mt-2">{results.rsi.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-2">{getWaterCondition('RSI', results.rsi)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-blue-800">Puckorius Scaling Index (PSI)</h3>
              <p className="text-2xl font-bold mt-2">{results.psi.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-2">{getWaterCondition('PSI', results.psi)}</p>
            </div>
          </div>

          {isAdvancedMode && results.chargeBalance !== undefined && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Advanced Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-gray-800">Charge Balance</h4>
                  <p className="text-xl font-bold mt-2">{results.chargeBalance.toFixed(2)}%</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {Math.abs(results.chargeBalance) <= 5
                      ? 'Acceptable charge balance'
                      : 'Charge imbalance detected - Check ion concentrations'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-gray-800">Larson-Skold Index</h4>
                  <p className="text-xl font-bold mt-2">{calculateLarsonSkoldIndex().toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {calculateLarsonSkoldIndex() < 0.8
                      ? "Low corrosion rate"
                      : calculateLarsonSkoldIndex() < 1.2
                        ? "Moderate corrosion rate"
                        : calculateLarsonSkoldIndex() < 2.5
                          ? "High corrosion rate - significant localized corrosion"
                          : "Severe corrosion rate - very aggressive water"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <h4 className="font-bold text-gray-800 mb-4">Saturation Levels</h4>
                <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="px-4 py-2 text-left border-b">Scale Type</th>
                      <th className="px-4 py-2 text-left border-b">Saturation Level (IAP/Ksp)</th>
                      <th className="px-4 py-2 text-left border-b">Acceptable Range</th>
                      <th className="px-4 py-2 text-left border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border-b">Calcium Carbonate</td>
                      <td className="px-4 py-2 border-b">{(Math.pow(10, results.lsi)).toFixed(2)}</td>
                      <td className="px-4 py-2 border-b">1.2 - 1.5</td>
                      <td className="px-4 py-2 border-b">{Math.pow(10, results.lsi) < 1.2 ? 'Low' : Math.pow(10, results.lsi) > 1.5 ? 'High' : 'Acceptable'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">Calcium Sulfate</td>
                      <td className="px-4 py-2 border-b">{(parseFloat(inputs.sulfate || '0') / 100).toFixed(2)}</td>
                      <td className="px-4 py-2 border-b">{'<1.0'}</td>
                      <td className="px-4 py-2 border-b">{parseFloat(inputs.sulfate || '0') / 100 < 1.0 ? 'Acceptable' : 'High'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">Silica</td>
                      <td className="px-4 py-2 border-b">{(parseFloat(inputs.silica || '0') / 120).toFixed(2)}</td>
                      <td className="px-4 py-2 border-b">1.1 - 1.2</td>
                      <td className="px-4 py-2 border-b">
                        {parseFloat(inputs.silica || '0') / 120 < 1.1 ? 'Low' : 
                         parseFloat(inputs.silica || '0') / 120 > 1.2 ? 'High' : 'Acceptable'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Iron Carbonate</td>
                      <td className="px-4 py-2">{(parseFloat(inputs.iron || '0') / 150).toFixed(2)}</td>
                      <td className="px-4 py-2">{'<1.2'}</td>
                      <td className="px-4 py-2">{parseFloat(inputs.iron || '0') / 150 < 1.2 ? 'Acceptable' : 'High'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScalingIndicesCalculator;