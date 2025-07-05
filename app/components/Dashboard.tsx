// components/Dashboard.tsx - User dashboard for managing projects
'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  getProjects, 
  createProject, 
  deleteProject, 
  exportProject, 
  importProject, 
  searchCalculations,
  Project,
  ROCalculation 
} from '../../lib/projectManager';
import { getCurrentUser, logout } from '../../lib/auth';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ROCalculation[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    try {
      const userProjects = getProjects();
      setProjects(userProjects);
    } catch (err) {
      setError('Failed to load projects');
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createProject(newProjectName, newProjectDescription);
      setSuccess('Project created successfully!');
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateProject(false);
      loadProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await deleteProject(projectId);
      setSuccess('Project deleted successfully!');
      loadProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  const handleExportProject = (projectId: string) => {
    try {
      const projectData = exportProject(projectId);
      const blob = new Blob([projectData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ro-project-${projectId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Project exported successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to export project');
    }
  };

  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await importProject(content);
        setSuccess('Project imported successfully!');
        loadProjects();
      } catch (err: any) {
        setError(err.message || 'Failed to import project');
      }
    };
    reader.readAsText(file);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = searchCalculations(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                RO Membrane Calculator Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {currentUser?.email} from {currentUser?.company}
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="h-16"
                >
                  <div className="text-center">
                    <div className="text-lg font-semibold">New Calculation</div>
                    <div className="text-sm opacity-80">Start calculating</div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowCreateProject(!showCreateProject)}
                  className="h-16"
                >
                  <div className="text-center">
                    <div className="text-lg font-semibold">New Project</div>
                    <div className="text-sm opacity-80">Create project</div>
                  </div>
                </Button>
                
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportProject}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" className="w-full h-16 pointer-events-none">
                    <div className="text-center">
                      <div className="text-lg font-semibold">Import Project</div>
                      <div className="text-sm opacity-80">Upload JSON file</div>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Project Form */}
          {showCreateProject && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <Input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Input
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Enter project description (optional)"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleCreateProject} disabled={loading}>
                      {loading ? 'Creating...' : 'Create Project'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateProject(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Projects List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Projects ({projects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No projects yet. Create your first project to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          {project.description && (
                            <p className="text-gray-600 text-sm">{project.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportProject(project.id)}
                          >
                            Export
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{project.calculations.length} calculations</span>
                        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                      
                      {project.calculations.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium text-gray-700 mb-2">Recent Calculations:</p>
                          <div className="space-y-1">
                            {project.calculations.slice(-3).map((calc) => (
                              <div key={calc.id} className="text-sm text-gray-600 flex justify-between">
                                <span>{calc.name}</span>
                                <span>{new Date(calc.updatedAt).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Search Calculations</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search calculations..."
              />
              
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Found {searchResults.length} results:
                  </p>
                  {searchResults.slice(0, 5).map((calc) => (
                    <div key={calc.id} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="font-medium">{calc.name}</div>
                      {calc.description && (
                        <div className="text-gray-600 text-xs">{calc.description}</div>
                      )}
                    </div>
                  ))}
                  {searchResults.length > 5 && (
                    <p className="text-xs text-gray-500">
                      ...and {searchResults.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Projects:</span>
                  <span className="font-semibold">{projects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Calculations:</span>
                  <span className="font-semibold">
                    {projects.reduce((sum, p) => sum + p.calculations.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="font-semibold">
                    {currentUser?.createdAt ? 
                      new Date(currentUser.createdAt).toLocaleDateString() : 
                      'N/A'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Create projects to organize your calculations</p>
                <p>• Use the search to quickly find saved calculations</p>
                <p>• Export projects to backup your work</p>
                <p>• All data is saved automatically in your browser</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
