// lib/projectManager.ts - Save and manage RO calculations with SSR support
import { getCurrentUser } from './auth';

export interface ROCalculation {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  
  // RO Membrane Calculation Data
  operatingData?: {
    feedFlow: number;
    feedPressure: number;
    temperature: number;
    recovery: number;
    feedTDS: number;
    feedPH: number;
    feedConductivity: number;
  };
  
  performanceData?: {
    permeateFlow: number;
    permeateTDS: number;
    permeateQuality: number;
    saltRejection: number;
    specificFlux: number;
    energyConsumption: number;
  };
  
  cleaningData?: {
    cleaningFrequency: number;
    cleaningDuration: number;
    cleaningChemicals: string[];
    cleaningCost: number;
  };
  
  scalingIndices?: {
    lsi: number;
    rsi: number;
    sdi: number;
    scalingRisk: 'Low' | 'Medium' | 'High';
    recommendations: string[];
  };
  
  // Custom fields for additional data
  customFields?: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  calculations: ROCalculation[];
  tags?: string[];
}

class ProjectManager {
  private projects: Project[] = [];

  constructor() {
    this.loadProjects();
  }

  private loadProjects(): void {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('ro_calc_projects');
        if (stored) {
          this.projects = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      this.projects = [];
    }
  }

  private saveProjects(): void {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('ro_calc_projects', JSON.stringify(this.projects));
      }
    } catch (error) {
      console.error('Error saving projects:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getCurrentUserId(): string {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  // Project Management
  createProject(name: string, description?: string): Promise<Project> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
          reject(new Error('Project creation not available during server-side rendering'));
          return;
        }

        const userId = this.getCurrentUserId();
        
        const project: Project = {
          id: this.generateId(),
          name,
          description,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          calculations: []
        };

        this.projects.push(project);
        this.saveProjects();
        resolve(project);
      } catch (error) {
        reject(error);
      }
    });
  }

  getProjects(): Project[] {
    try {
      // Return empty array during SSR
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return [];
      }

      const userId = this.getCurrentUserId();
      return this.projects.filter(p => p.userId === userId);
    } catch (error) {
      return [];
    }
  }

  getProject(projectId: string): Project | null {
    try {
      // Return null during SSR
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null;
      }

      const userId = this.getCurrentUserId();
      return this.projects.find(p => p.id === projectId && p.userId === userId) || null;
    } catch (error) {
      return null;
    }
  }

  updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
          reject(new Error('Project update not available during server-side rendering'));
          return;
        }

        const userId = this.getCurrentUserId();
        const projectIndex = this.projects.findIndex(p => p.id === projectId && p.userId === userId);
        
        if (projectIndex === -1) {
          reject(new Error('Project not found'));
          return;
        }

        this.projects[projectIndex] = {
          ...this.projects[projectIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };

        this.saveProjects();
        resolve(this.projects[projectIndex]);
      } catch (error) {
        reject(error);
      }
    });
  }

  deleteProject(projectId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
          reject(new Error('Project deletion not available during server-side rendering'));
          return;
        }

        const userId = this.getCurrentUserId();
        const projectIndex = this.projects.findIndex(p => p.id === projectId && p.userId === userId);
        
        if (projectIndex === -1) {
          reject(new Error('Project not found'));
          return;
        }

        this.projects.splice(projectIndex, 1);
        this.saveProjects();
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Calculation Management
  addCalculation(projectId: string, calculation: Omit<ROCalculation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ROCalculation> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
          reject(new Error('Calculation save not available during server-side rendering'));
          return;
        }

        const userId = this.getCurrentUserId();
        const projectIndex = this.projects.findIndex(p => p.id === projectId && p.userId === userId);
        
        if (projectIndex === -1) {
          reject(new Error('Project not found'));
          return;
        }

        const newCalculation: ROCalculation = {
          ...calculation,
          id: this.generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        this.projects[projectIndex].calculations.push(newCalculation);
        this.projects[projectIndex].updatedAt = new Date().toISOString();
        
        this.saveProjects();
        resolve(newCalculation);
      } catch (error) {
        reject(error);
      }
    });
  }

  updateCalculation(projectId: string, calculationId: string, updates: Partial<ROCalculation>): Promise<ROCalculation> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
          reject(new Error('Calculation update not available during server-side rendering'));
          return;
        }

        const userId = this.getCurrentUserId();
        const projectIndex = this.projects.findIndex(p => p.id === projectId && p.userId === userId);
        
        if (projectIndex === -1) {
          reject(new Error('Project not found'));
          return;
        }

        const calcIndex = this.projects[projectIndex].calculations.findIndex(c => c.id === calculationId);
        
        if (calcIndex === -1) {
          reject(new Error('Calculation not found'));
          return;
        }

        this.projects[projectIndex].calculations[calcIndex] = {
          ...this.projects[projectIndex].calculations[calcIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };

        this.projects[projectIndex].updatedAt = new Date().toISOString();
        
        this.saveProjects();
        resolve(this.projects[projectIndex].calculations[calcIndex]);
      } catch (error) {
        reject(error);
      }
    });
  }

  deleteCalculation(projectId: string, calculationId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
          reject(new Error('Calculation deletion not available during server-side rendering'));
          return;
        }

        const userId = this.getCurrentUserId();
        const projectIndex = this.projects.findIndex(p => p.id === projectId && p.userId === userId);
        
        if (projectIndex === -1) {
          reject(new Error('Project not found'));
          return;
        }

        const calcIndex = this.projects[projectIndex].calculations.findIndex(c => c.id === calculationId);
        
        if (calcIndex === -1) {
          reject(new Error('Calculation not found'));
          return;
        }

        this.projects[projectIndex].calculations.splice(calcIndex, 1);
        this.projects[projectIndex].updatedAt = new Date().toISOString();
        
        this.saveProjects();
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Quick save for current calculation
  quickSave(calculationData: Partial<ROCalculation>): Promise<ROCalculation> {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
          reject(new Error('Quick save not available during server-side rendering'));
          return;
        }

        const projects = this.getProjects();
        let quickSaveProject = projects.find(p => p.name === 'Quick Saves');
        
        if (!quickSaveProject) {
          quickSaveProject = await this.createProject('Quick Saves', 'Auto-saved calculations');
        }

        const calculation = await this.addCalculation(quickSaveProject.id, {
          name: `Quick Save ${new Date().toLocaleString()}`,
          description: 'Auto-saved calculation',
          ...calculationData
        });

        resolve(calculation);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Export/Import functionality
  exportProject(projectId: string): string {
    const project = this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    return JSON.stringify(project, null, 2);
  }

  importProject(projectData: string): Promise<Project> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
          reject(new Error('Project import not available during server-side rendering'));
          return;
        }

        const project = JSON.parse(projectData);
        
        // Generate new IDs to avoid conflicts
        const newProject: Project = {
          ...project,
          id: this.generateId(),
          userId: this.getCurrentUserId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          calculations: project.calculations.map((calc: any) => ({
            ...calc,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))
        };

        this.projects.push(newProject);
        this.saveProjects();
        resolve(newProject);
      } catch (error) {
        reject(new Error('Invalid project data'));
      }
    });
  }

  // Search functionality
  searchCalculations(query: string): ROCalculation[] {
    try {
      // Return empty array during SSR
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return [];
      }

      const userId = this.getCurrentUserId();
      const userProjects = this.projects.filter(p => p.userId === userId);
      
      const allCalculations: ROCalculation[] = [];
      userProjects.forEach(project => {
        allCalculations.push(...project.calculations);
      });

      return allCalculations.filter(calc => 
        calc.name.toLowerCase().includes(query.toLowerCase()) ||
        calc.description?.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      return [];
    }
  }
}

export const projectManager = new ProjectManager();

// Helper functions for components
export const createProject = (name: string, description?: string) => 
  projectManager.createProject(name, description);

export const getProjects = () => projectManager.getProjects();

export const getProject = (projectId: string) => 
  projectManager.getProject(projectId);

export const updateProject = (projectId: string, updates: Partial<Project>) => 
  projectManager.updateProject(projectId, updates);

export const deleteProject = (projectId: string) => 
  projectManager.deleteProject(projectId);

export const addCalculation = (projectId: string, calculation: Omit<ROCalculation, 'id' | 'createdAt' | 'updatedAt'>) => 
  projectManager.addCalculation(projectId, calculation);

export const updateCalculation = (projectId: string, calculationId: string, updates: Partial<ROCalculation>) => 
  projectManager.updateCalculation(projectId, calculationId, updates);

export const deleteCalculation = (projectId: string, calculationId: string) => 
  projectManager.deleteCalculation(projectId, calculationId);

export const quickSave = (calculationData: Partial<ROCalculation>) => 
  projectManager.quickSave(calculationData);

export const exportProject = (projectId: string) => 
  projectManager.exportProject(projectId);

export const importProject = (projectData: string) => 
  projectManager.importProject(projectData);

export const searchCalculations = (query: string) => 
  projectManager.searchCalculations(query);
