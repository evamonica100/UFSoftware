
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Project {
  id: string;
  name: string;
  location: string;
  capacity: number;
  status: 'active' | 'completed' | 'archived';
  date: string;
}

export default function ProjectDetails() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProject, setNewProject] = useState({
    name: '',
    location: '',
    capacity: '',
  });

  const handleCreateProject = () => {
    const project: Project = {
      id: Date.now().toString(),
      name: newProject.name,
      location: newProject.location,
      capacity: Number(newProject.capacity),
      status: 'active',
      date: new Date().toISOString().split('T')[0]
    };
    
    setProjects([...projects, project]);
    setShowNewProject(false);
    setNewProject({ name: '', location: '', capacity: '' });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-800">Project Details</h2>
        <Button onClick={() => setShowNewProject(!showNewProject)}>
          {showNewProject ? 'Cancel' : 'New Project'}
        </Button>
      </div>

      {showNewProject ? (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name</label>
            <Input
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <Input
              value={newProject.location}
              onChange={(e) => setNewProject({...newProject, location: e.target.value})}
              placeholder="Enter location"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Design Capacity (m³/day)</label>
            <Input
              type="number"
              value={newProject.capacity}
              onChange={(e) => setNewProject({...newProject, capacity: e.target.value})}
              placeholder="Enter design capacity"
            />
          </div>
          <Button onClick={handleCreateProject}>Create Project</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity (m³/day)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-gray-200">
                  <td className="px-6 py-4">{project.name}</td>
                  <td className="px-6 py-4">{project.location}</td>
                  <td className="px-6 py-4">{project.capacity}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      project.status === 'active' ? 'bg-green-100 text-green-800' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{project.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
