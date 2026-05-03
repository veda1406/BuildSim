import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, Play, Layers, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Task, ArchitectState, ParsedModel } from '../types';

import SimulationCanvas from '../components/core/SimulationCanvas';
import TimelineSlider from '../components/core/TimelineSlider';
import ArchitectSidebar from '../components/roles/architect/ArchitectSidebar';
import CivilSidebar from '../components/roles/civil/CivilSidebar';
import PlannerSidebar from '../components/roles/planner/PlannerSidebar';
import ManagerSidebar from '../components/roles/manager/ManagerSidebar';

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [maxDay, setMaxDay] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [architectState, setArchitectState] = useState<ArchitectState>({
    materialMode: 'default',
    sectionCutEnabled: false,
    sectionCutZ: 0,
    measuringActive: false,
    measureDistance: null,
    sunTime: 12,
    simulationSpeed: 1.0,
    layers: {
       'structure': { visible: true, opacity: 1 },
       'walls': { visible: true, opacity: 1 },
       'floors': { visible: true, opacity: 1 },
       'mep': { visible: true, opacity: 1 },
       'facade': { visible: true, opacity: 1 }
    },
    isolatedLayer: null,
    selectedElementId: null,
    elementMaterials: {},
    designInsights: [],
    selectedZone: null,
    selectedZoneArea: null,
    designVariant: 'A',
    walkthroughMode: false,
    layerMode: 'all',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedModel, setUploadedModel] = useState<ParsedModel | null>(null);
  const [numStories, setNumStories] = useState(4);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.dxf', '.ifc'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      console.error('Invalid file type. Only .dxf and .ifc files are supported.');
      alert('Invalid file format. Please upload a .dxf or .ifc file.');
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    console.log(`Starting upload for: ${file.name}`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('num_stories', numStories.toString());

      const response = await axios.post('http://127.0.0.1:8000/tasks/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Upload successful:', response.data);
      alert(`Successfully uploaded ${file.name}`);
      
      if (response.data.model_data) {
        setUploadedModel(response.data.model_data);
        const maxFloor = Math.max(...response.data.model_data.elements.map((e: any) => Math.floor((e.position[1] || 0) / 3.0)), 0);
        const numStories = maxFloor + 1;
        const totalDuration = 10 + (10 * numStories) + (5 * numStories) + (10 * numStories) + (5 * numStories);
        setMaxDay(totalDuration);
        setCurrentDay(0);
      }
      
      // Optionally trigger a re-fetch of tasks or plans here if needed
      
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!token) return;
    axios.get('http://127.0.0.1:8000/tasks/', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setTasks(res.data);
        if (res.data.length > 0) {
           const maxDuration = Math.max(...res.data.map((t: Task) => t.early_finish));
           setMaxDay(maxDuration);
        }
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      const intervalDelay = 500 / (architectState.simulationSpeed || 1);
      interval = setInterval(() => {
        setCurrentDay((prev) => {
          if (prev >= maxDay) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalDelay);
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxDay, architectState.simulationSpeed]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#0b0c10] text-gray-300 font-sans selection:bg-emerald-500/30">
      {/* Top Navbar */}
      <header className="h-16 border-b border-gray-800 bg-[#0f1115] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3 w-80">
          <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <Layers className="text-[#0b0c10] w-5 h-5 font-bold" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-white font-black tracking-wide leading-tight text-lg">{user?.name ? user.name.toUpperCase() : 'BUILDSIM'}</h1>
            <span className="text-[0.6rem] text-emerald-400 tracking-widest uppercase font-semibold">{user?.role || 'Construction Intelligence'}</span>
          </div>
        </div>

        <div className="flex-1 text-center hidden md:block">
            <h2 className="text-gray-400 font-bold tracking-wider text-sm">BuildSim Framework</h2>
        </div>

        <div className="flex items-center gap-4">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".dxf,.ifc"
            className="hidden"
          />
          <input 
            type="number"
            value={numStories}
            onChange={(e) => setNumStories(parseInt(e.target.value) || 1)}
            min="1" max="20"
            className="w-16 px-2 py-1 bg-[#0b0c10] border border-gray-700 rounded text-xs font-bold text-gray-300"
            title="Number of Floors/Stories"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-gray-500 rounded text-xs font-bold tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Upload className="w-4 h-4" /> {isUploading ? 'UPLOADING...' : 'UPLOAD PLAN'}
          </button>
          <button 
            onClick={() => {
              if (!isPlaying && currentDay >= maxDay) {
                setCurrentDay(0);
                setIsPlaying(true);
              } else {
                setIsPlaying(!isPlaying);
              }
            }}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-xs font-bold tracking-wider transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Play className="w-4 h-4" /> {isPlaying ? 'PAUSE' : 'SIMULATE'}
          </button>
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded text-xs font-bold tracking-wider transition-colors ml-4">
            <LogOut className="w-4 h-4" /> LOGOUT
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {user?.role === 'Construction Planner' && <PlannerSidebar tasks={tasks} currentDay={currentDay} />}
        
        {/* Center Viewport */}
        <main className="flex-1 relative bg-[#0b0c10] flex flex-col items-center justify-center">
          <TimelineSlider maxDay={maxDay} currentDay={currentDay} setCurrentDay={setCurrentDay} />
          <div className="absolute inset-0 z-0">
             <SimulationCanvas 
               tasks={tasks} 
               currentDay={currentDay} 
               architectState={architectState} 
               setArchitectState={setArchitectState} 
               uploadedModel={uploadedModel}
             />
          </div>
        </main>

        {user?.role === 'Architect' && <ArchitectSidebar architectState={architectState} setArchitectState={setArchitectState} hasModel={!!uploadedModel} />}
        {user?.role === 'Civil Engineer' && <CivilSidebar tasks={tasks} />}
        {user?.role === 'Project Manager' && <ManagerSidebar currentDay={currentDay} />}

      </div>
    </div>
  );
}
