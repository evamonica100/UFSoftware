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
    elementArea: 400,
    temperature: 28,
    feedPressure: 600,
    permatePressure: 14.7,
    feedFlow: 150,
    foulingFactor: 0.8,
    feedTDS: 32000,
    saltRejection: 0.998,
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
    },
  });

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

  const calculateTCF = (T: number) => {
    if (T >= 25) {
      return Math.exp(2640 * (1 / 298 - 1 / (273 + T)));
    }
    return Math.exp(3020 * (1 / 298 - 1 / (273 + T)));
  };

  const calculateOsmoticPressure = (tds: number, T: number) => {
    return 1.12 * (273 + T) * (tds / 58500);
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
      elementArea: 400,
      temperature: 28,
      feedPressure: 600,
      permatePressure: 14.7,
      feedFlow: 150,
      foulingFactor: 0.8,
      feedTDS: 32000,
      saltRejection: 0.998,
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
      },
    });

    // Reset membrane selection
    setSelectedMembrane(membraneSpecs.bwro[0]);

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
    membraneSpecs.bwro[0],
  );

  const calculate = () => {
    try {
      // Initialize the graphs with new data
      const ctxConc = document.getElementById(
        "concentrationGraph",
      ) as HTMLCanvasElement;
      const ctxPress = document.getElementById(
        "pressureRecoveryGraph",
      ) as HTMLCanvasElement;
      const TCF = calculateTCF(inputs.temperature);
      const feedOsmoticPressure = calculateOsmoticPressure(
        inputs.feedTDS,
        inputs.temperature,
      );

      // Calculate total elements based on the dynamic inputs provided by user
      let totalElements = 0;
      let totalVessels = 0;

      // Loop through each stage to calculate total elements and vessels
      for (let i = 0; i < inputs.stages; i++) {
        const vesselsInStage = inputs.stageVessels[i] || 0;
        totalVessels += vesselsInStage;

        // Add up all elements in this stage
        for (let j = 0; j < vesselsInStage; j++) {
          const elementsInVessel = inputs.vesselElements[i]?.[j] || 0;
          totalElements += elementsInVessel;
        }
      }

      // Now calculate with the correct totals
      const pressureDrop = calculatePressureDrop(inputs.feedFlow, true);
      const totalPermeateFlow = calculateTotalPermeateFlow(
        totalElements,
        1,
        inputs.elementArea,
        TCF,
        inputs.foulingFactor,
        inputs.feedPressure,
        pressureDrop,
        inputs.permatePressure,
        feedOsmoticPressure,
        0,
      );

      // Calculate recovery
      const recovery = Math.min(totalPermeateFlow / inputs.feedFlow, 0.85); // Cap at 85%

      // Calculate average element recovery
      const averageElementRecovery = calculateAverageElementRecovery(
        recovery,
        totalElements,
      );

      // Use average element recovery to calculate concentration polarization
      const polarization = calculatePolarization(averageElementRecovery);

      const limitingRecovery = calculateLimitingRecovery(
        feedOsmoticPressure,
        polarization,
        inputs.saltRejection,
        inputs.feedPressure,
        pressureDrop,
        inputs.permatePressure,
      );

      // Generate element results
      const elementResults = [];
      let currentFlow = inputs.feedFlow;
      let currentTDS = inputs.feedTDS;

      // Process each stage dynamically based on user inputs
      for (let stage = 1; stage <= inputs.stages; stage++) {
        const stageIndex = stage - 1;
        const vessels = inputs.stageVessels[stageIndex] || 0;
        let flowPerVessel = currentFlow / vessels;

        for (let vessel = 1; vessel <= vessels; vessel++) {
          const vesselIndex = vessel - 1;
          let elementFeedFlow = flowPerVessel;
          let elementFeedTDS = currentTDS;
          let elementFeedPressure = inputs.feedPressure;

          // Get the correct number of elements for this specific vessel
          const elementsInVessel =
            inputs.vesselElements[stageIndex]?.[vesselIndex] || 0;

          for (let element = 1; element <= elementsInVessel; element++) {
            // Calculate pressure drop from previous elements
            if (stage > 1 || vessel > 1 || element > 1) {
              // This is a simplified approach - for a more accurate model, track each element's position
              const previousElementsCount = elementResults.length;
              elementFeedPressure =
                inputs.feedPressure - previousElementsCount * 3; // 3 psi per element
            }

            // Calculate element-specific parameters
            const feedOP = calculateOsmoticPressure(
              elementFeedTDS,
              inputs.temperature,
            );
            const elementTCF = calculateTCF(inputs.temperature);

            // Calculate element pressure drop - higher for first elements due to higher flow
            const positionFactorPressureDrop = 1 - (element - 1) * 0.1; // First elements have higher pressure drop
            const elementPressureDrop = 3 * positionFactorPressureDrop; // Base pressure drop of 3 psi per element

            // Calculate salt passage
            const saltPassage = 1 - inputs.saltRejection;

            // Calculate permeate TDS and osmotic pressure
            const permeateTDS = elementFeedTDS * saltPassage;
            const permeateOP = calculateOsmoticPressure(
              permeateTDS,
              inputs.temperature,
            );

            // Calculate net driving pressure
            const netDrivingPressure =
              elementFeedPressure -
              elementPressureDrop / 2 -
              inputs.permatePressure -
              (feedOP - permeateOP);

            // Calculate permeate flow using membrane transport equation
            const waterPermeabilityCoeff = 0.1; // Example value for A coefficient (would normally be membrane-specific)
            const elementPermeateFlow =
              (waterPermeabilityCoeff *
                inputs.elementArea *
                elementTCF *
                inputs.foulingFactor *
                netDrivingPressure) /
              24;

            // Calculate element recovery from the calculated flow
            const elementRecovery = Math.min(
              elementPermeateFlow / elementFeedFlow,
              0.3,
            ); // Cap at 30% per element

            // Calculate concentration polarization
            const elementCP = Math.exp(0.7 * elementRecovery);

            // Calculate concentrate TDS
            const elementConcTDS = elementFeedTDS / (1 - elementRecovery);

            // Calculate concentrate osmotic pressure
            const elementOsmoticP =
              feedOP * (elementConcTDS / elementFeedTDS) * elementCP;

            // Update feed pressure for next element
            elementFeedPressure -= elementPressureDrop;

            // Store the element results
            elementResults.push({
              stage,
              vessel,
              element,
              feedFlow: elementFeedFlow,
              feedTDS: elementFeedTDS, // Added for the charts
              recovery: elementRecovery * 100,
              polarization: elementCP,
              osmoticPressure: elementOsmoticP,
            });

            // Update for next element
            elementFeedFlow -= elementPermeateFlow;
            elementFeedTDS = elementConcTDS;
          }

          if (vessel === vessels) {
            currentFlow = elementFeedFlow * vessels;
            currentTDS = elementFeedTDS;
          }
        }
      }

      // Update charts if the canvas elements exist
      if (ctxConc && ctxPress) {
        // Create concentration chart
        new Chart(ctxConc, {
          type: "line",
          data: {
            labels: elementResults.map((_, i) => `Element ${i + 1}`),
            datasets: [
              {
                label: "Feed TDS (mg/L)",
                data: elementResults.map((el) => el.feedTDS),
                borderColor: "rgb(75, 192, 192)",
                tension: 0.1,
              },
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
            labels: elementResults.map((_, i) => `Element ${i + 1}`),
            datasets: [
              {
                label: "Recovery (%)",
                data: elementResults.map((el) => el.recovery),
                borderColor: "rgb(153, 102, 255)",
                tension: 0.1,
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

      // Update the results state
      setResults({
        elementResults,
        systemResults: {
          recovery: recovery * 100,
          limitingRecovery: limitingRecovery * 100,
          averageFlux: totalPermeateFlow / (totalElements * inputs.elementArea),
          totalPermeateFlow,
          permeateConcentration: inputs.feedTDS * (1 - inputs.saltRejection),
          averageElementRecovery: averageElementRecovery * 100,
          concentratePolarization: polarization,
          concentrateOsmoticPressure: feedOsmoticPressure / (1 - recovery),
          pressureDrops: [pressureDrop, pressureDrop * 1.2],
          feedOsmoticPressure,
        },
      });
    } catch (error) {
      console.error("Calculation error:", error);
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
              "elementArea",
              "temperature",
              "feedPressure",
              "permatePressure",
              "feedFlow",
              "foulingFactor",
              "feedTDS",
              "saltRejection",
            ].map((key) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {inputLabels[key].label}
                  {inputLabels[key].unit && (
                    <span className="text-gray-500 ml-1">
                      ({inputLabels[key].unit})
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
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-6">
            <button
              onClick={calculate}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Calculate System Performance
            </button>
            <button
              onClick={resetCalculator}
              className="flex-1 bg-gray-400 text-white py-3 px-4 rounded-md hover:bg-gray-500 transition-colors font-medium"
            >
              Reset Calculator
            </button>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">
            System Results
          </h3>
          <div className="space-y-3">
            {Object.entries(results.systemResults).map(
              ([key, value]) =>
                key !== "pressureDrops" &&
                resultLabels[key] && (
                  <div
                    key={key}
                    className="p-3 bg-white rounded-md flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-700">
                      {resultLabels[key].label}
                    </span>
                    <span className="text-gray-900">
                      {typeof value === "number" ? value.toFixed(1) : value}
                      {resultLabels[key].unit && (
                        <span className="text-gray-500 ml-1">
                          {resultLabels[key].unit}
                        </span>
                      )}
                    </span>
                  </div>
                ),
            )}
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
                    "Vessel",
                    "Element",
                    "Feed Flow (m³/h)",
                    "Recovery (%)",
                    "CP Factor",
                    "Osmotic P (psi)",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.elementResults.map((el, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap">{el.stage}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{el.vessel}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {el.element}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {el.feedFlow.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {el.recovery.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {el.polarization.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {el.osmoticPressure.toFixed(1)}
                    </td>
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
