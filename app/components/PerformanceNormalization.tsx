
'use client';

import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';

interface NormalizationData {
  operatingConditions: {
    feedPressure: number;
    pressureDrop: number;
    permeatePressure: number;
    feedTDS: number;
    temperature: number;
    permeateFlow: number;
    recovery: number;
  };
  baselineConditions: {
    feedPressure: number;
    pressureDrop: number;
    permeatePressure: number;
    feedTDS: number;
    temperature: number;
    permeateFlow: number;
    recovery: number;
  };
}

const calculateTCF = (temperature: number): number => {
  if (temperature >= 25) {
    return Math.exp(2640 * (1/298 - 1/(273 + temperature)));
  }
  return Math.exp(3020 * (1/298 - 1/(273 + temperature)));
};

const calculateOsmoticPressure = (tds: number, temperature: number): number => {
  if (tds < 20000) {
    return (tds * (temperature + 320)) / 491000;
  }
  return (tds * 1.12 * (273 + temperature)) / 58500;
};

const calculateFeedConcentrate = (feedTDS: number, recovery: number): number => {
  return feedTDS * (Math.log(1/(1-recovery))/recovery);
};

const PerformanceNormalization = () => {
  const [data, setData] = useState<NormalizationData>({
    operatingConditions: {
      feedPressure: 800,
      pressureDrop: 20,
      permeatePressure: 0,
      feedTDS: 35000,
      temperature: 25,
      permeateFlow: 100,
      recovery: 0.45
    },
    baselineConditions: {
      feedPressure: 800,
      pressureDrop: 20,
      permeatePressure: 0,
      feedTDS: 35000,
      temperature: 25,
      permeateFlow: 100,
      recovery: 0.45
    }
  });

  const [normalizedFlow, setNormalizedFlow] = useState<number>(0);
  const [deviationPercent, setDeviationPercent] = useState<number>(0);

  const calculateNormalizedFlow = () => {
    const op = data.operatingConditions;
    const bl = data.baselineConditions;

    const opTCF = calculateTCF(op.temperature);
    const blTCF = calculateTCF(bl.temperature);

    const opFC = calculateFeedConcentrate(op.feedTDS, op.recovery);
    const blFC = calculateFeedConcentrate(bl.feedTDS, bl.recovery);

    const opOP = calculateOsmoticPressure(opFC, op.temperature);
    const blOP = calculateOsmoticPressure(blFC, bl.temperature);

    const opNDP = op.feedPressure - op.pressureDrop/2 - op.permeatePressure - opOP;
    const blNDP = bl.feedPressure - bl.pressureDrop/2 - bl.permeatePressure - blOP;

    const normalizedFlow = ((opNDP / blNDP) * (opTCF / blTCF)) * bl.permeateFlow;
    const deviation = ((normalizedFlow - op.permeateFlow) / op.permeateFlow) * 100;

    setNormalizedFlow(normalizedFlow);
    setDeviationPercent(deviation);
  };

  useEffect(() => {
    calculateNormalizedFlow();
  }, [data]);

  const handleInputChange = (category: 'operatingConditions' | 'baselineConditions', field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: numValue
      }
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Performance Normalization</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Operating Conditions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">Operating Conditions</h3>
          <div className="space-y-4">
            {Object.entries(data.operatingConditions).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key.split(/(?=[A-Z])/).join(' ')}
                </label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleInputChange('operatingConditions', key, e.target.value)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Baseline Conditions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">Baseline Conditions</h3>
          <div className="space-y-4">
            {Object.entries(data.baselineConditions).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key.split(/(?=[A-Z])/).join(' ')}
                </label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleInputChange('baselineConditions', key, e.target.value)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-700 mb-4">Normalization Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg">
            <div className="text-sm text-gray-500">Normalized Permeate Flow</div>
            <div className="text-2xl font-bold text-blue-600">{normalizedFlow.toFixed(2)} m³/h</div>
          </div>
          <div className="p-4 bg-white rounded-lg">
            <div className="text-sm text-gray-500">Deviation from Baseline</div>
            <div className={`text-2xl font-bold ${Math.abs(deviationPercent) > 15 ? 'text-red-600' : 'text-green-600'}`}>
              {deviationPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceNormalization;
