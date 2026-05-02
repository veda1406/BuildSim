import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, Play, Pause, RotateCcw, Layers, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSimulation } from '../context/SimulationContext';
import type { Task, ArchitectState, ParsedModel } from '../types';

import SimulationCanvas from '../components/core/SimulationCanvas';
import TimelineSlider from '../components/core/TimelineSlider';
import ArchitectSidebar from '../components/roles/architect/ArchitectSidebar';
import CivilSidebar from '../components/roles/civil/CivilSidebar';
import PlannerSidebar from '../components/roles/planner/PlannerSidebar';
import ManagerSidebar from '../components/roles/manager/ManagerSidebar';
import SpeedToggle from '../components/shared/SpeedToggle';

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
  const activeProjectId = 1; // Hardcoded for single-session

  const fetchTasks = () => {
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
  };

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
      formData.append('project_id', activeProjectId.toString());

      const response = await axios.post('http://localhost:8000/tasks/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Upload successful:', response.data);
      alert(`Successfully uploaded ${file.name}`);
      
      if (response.data.model_data) {
        setUploadedModel(response.data.model_data);
      }
      if (response.data.total_days) {
        setMaxDay(response.data.total_days);
      }
      
      // Re-fetch tasks after upload to update maxDay and simulation timeline
      fetchTasks();
      
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

  const { speedMultiplier } = useSimulation();

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      const intervalDelay = 300 / speedMultiplier;
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
  }, [isPlaying, maxDay, speedMultiplier]);

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
          <SpeedToggle />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-gray-500 rounded text-xs font-bold tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Upload className="w-4 h-4" /> {isUploading ? 'UPLOADING...' : 'UPLOAD PLAN'}
          </button>
          <div className="flex bg-[#121419] border border-gray-700 rounded overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <button 
              onClick={() => {
                if (!isPlaying && currentDay >= maxDay) {
                  setCurrentDay(0);
                  setIsPlaying(true);
                } else {
                  setIsPlaying(!isPlaying);
                }
              }}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold tracking-wider transition-colors">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
            <button 
              onClick={() => {
                setCurrentDay(0);
                setIsPlaying(false);
              }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-gray-300 text-xs font-bold tracking-wider transition-colors border-l border-gray-700">
              <RotateCcw className="w-4 h-4" /> RESET
            </button>
          </div>
          <button onClick={() => logout()} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded text-xs font-bold tracking-wider transition-colors ml-4">
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
               maxDay={maxDay}
             />
          </div>
        </main>

        {user?.role === 'Architect' && <ArchitectSidebar architectState={architectState} setArchitectState={setArchitectState} hasModel={!!uploadedModel} />}
        {user?.role === 'Civil Engineer' && <CivilSidebar tasks={tasks} />}
        {user?.role === 'Project Manager' && <ManagerSidebar currentDay={currentDay} activeProjectId={activeProjectId} triggerRefresh={uploadedModel} />}

      </div>
    </div>
  );
}
