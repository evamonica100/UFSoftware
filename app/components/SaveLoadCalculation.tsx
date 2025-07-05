// components/SaveLoadCalculation.tsx - Component to save/load calculations
'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  getProjects, 
  addCalculation, 
  updateCalculation,
  quickSave,
  Project,
  ROCalculation 
} from '../../lib/projectManager';
import { isAuthenticated } from '../../lib/auth';

interface SaveLoadCalculationProps {
  calculationData: Partial<ROCalculation>;
  onLoad: (calculation: ROCalculation) => void;
  onSave?: (calculation: ROCalculation) => void;
}

export default function SaveLoadCalculation({ 
  calculationData, 
  onLoad, 
  onSave 
}: SaveLoadCalculationProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [calculationName, setCalculationName] = useState('');
  const [calculationDescription, setCalculationDescription] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated()) {
      loadProjects();
    }
  }, []);

  const loadProjects = () => {
    try {
      const userProjects = getProjects();
      setProjects(userProjects);
      if (userProjects.length > 0 && !selectedProject) {
        setSelectedProject(userProjects[0].id);
      }
    } catch (err) {
      setError('Failed to load projects');
    }
  };

  const handleSave = async () => {
    if (!calculationName.trim()) {
      setError('Please enter a calculation name');
      return;
    }

    if (!selectedProject) {
      setError('Please select a project');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const calculation = await addCalculation(selectedProject, {
        name: calculationName,
        description: calculationDescription,
        ...calculationData
      });

      setSuccess('Calculation saved successfully!');
      setCalculationName('');
      setCalculationDescription('');
      setShowSave(false);
      
      if (onSave) {
        onSave(calculation);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save calculation');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSave = async () => {
    setLoading(true);
    setError('');

    try {
      const calculation = await quickSave(calculationData);
      setSuccess('Calculation quick-saved successfully!');
      
      if (onSave) {
        onSave(calculation);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to quick-save calculation');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = (calculation: ROCalculation) => {
    onLoad(calculation);
    setShowLoad(false);
    setSuccess('Calculation loaded successfully!');
  };

  if (!isAuthenticated()) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Please log in to save and load calculations
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Save/Load Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Save & Load Calculations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleQuickSave}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Saving...' : 'Quick Save'}
            </Button>
            
            <Button 
              onClick={() => setShowSave(!showSave)}
              disabled={loading}
            >
              Save As...
            </Button>
            
            <Button 
              onClick={() => setShowLoad(!showLoad)}
              variant="outline"
            >
              Load Calculation
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              variant="ghost"
            >
              View Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Form */}
      {showSave && (
        <Card>
          <CardHeader>
            <CardTitle>Save Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calculation Name *
                </label>
                <Input
                  value={calculationName}
                  onChange={(e) => setCalculationName(e.target.value)}
                  placeholder="Enter calculation name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={calculationDescription}
                  onChange={(e) => setCalculationDescription(e.target.value)}
                  placeholder="Enter description (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project *
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.calculations.length} calculations)
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Calculation'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSave(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Load List */}
      {showLoad && (
        <Card>
          <CardHeader>
            <CardTitle>Load Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.length === 0 ? (
                <p className="text-gray-600">No saved calculations found.</p>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{project.name}</h4>
                    
                    {project.calculations.length === 0 ? (
                      <p className="text-gray-500 text-sm">No calculations in this project</p>
                    ) : (
                      <div className="space-y-2">
                        {project.calculations.map((calc) => (
                          <div 
                            key={calc.id}
                            className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100"
                          >
                            <div>
                              <div className="font-medium text-sm">{calc.name}</div>
                              {calc.description && (
                                <div className="text-xs text-gray-600">{calc.description}</div>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(calc.updatedAt).toLocaleString()}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleLoad(calc)}
                            >
                              Load
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              
              <Button 
                variant="outline" 
                onClick={() => setShowLoad(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hook for easy integration into existing components
export function useSaveLoad() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const saveCalculation = async (
    projectId: string, 
    calculationData: Omit<ROCalculation, "id" | "createdAt" | "updatedAt">
  ) => {
    setIsSaving(true);
    try {
      const calculation = await addCalculation(projectId, calculationData);
      return calculation;
    } finally {
      setIsSaving(false);
    }
  };

  const quickSaveCalculation = async (calculationData: Partial<ROCalculation>) => {
    setIsSaving(true);
    try {
      const calculation = await quickSave(calculationData);
      return calculation;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveCalculation,
    quickSaveCalculation,
    isSaving,
    isLoading
  };
}
