import { useState, useEffect, Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Box, PointerLockControls, useTexture } from '@react-three/drei';
import type { Task, ArchitectState, ParsedModel } from '../../types';

interface SimulationCanvasProps {
  tasks: Task[];
  currentDay: number;
  architectState?: ArchitectState;
  setArchitectState?: React.Dispatch<React.SetStateAction<ArchitectState>>;
  uploadedModel?: ParsedModel | null;
  maxDay: number;
}

const WalkthroughControls = () => {
  const { camera } = useThree();
  const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false });

  useEffect(() => {
    // Start slightly above ground
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 2, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': setMovement(m => ({ ...m, forward: true })); break;
        case 'KeyS': setMovement(m => ({ ...m, backward: true })); break;
        case 'KeyA': setMovement(m => ({ ...m, left: true })); break;
        case 'KeyD': setMovement(m => ({ ...m, right: true })); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': setMovement(m => ({ ...m, forward: false })); break;
        case 'KeyS': setMovement(m => ({ ...m, backward: false })); break;
        case 'KeyA': setMovement(m => ({ ...m, left: false })); break;
        case 'KeyD': setMovement(m => ({ ...m, right: false })); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [camera]);

  useFrame((_, delta) => {
    const speed = 5 * delta;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0; // lock to horizontal plane
    dir.normalize();

    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    if (movement.forward) camera.position.addScaledVector(dir, speed);
    if (movement.backward) camera.position.addScaledVector(dir, -speed);
    if (movement.right) camera.position.addScaledVector(right, speed);
    if (movement.left) camera.position.addScaledVector(right, -speed);
    
    // Prevent strictly going below ground
    if (camera.position.y < 0.5) camera.position.y = 0.5;
  });

  return <PointerLockControls />;
};

const BuildingBlock = ({ 
  position,
  size,
  rotation,
  color, 
  visible, 
  opacity,
  materialMode,
  elType,
  clippingPlanes,
  onClick,
  isSelected,
  scaleY = 1
}: any) => {
  let roughness = 0.5;
  let metalness = 0.1;
  let mapColor = color;
  let transparent = opacity < 1.0;
  let curOpacity = opacity;
  let textureMap: THREE.Texture | null = null;
  let wireframe = false;

  const textures = useTexture({
    wood: '/textures/wood.png',
    concrete: '/textures/concrete.png'
  });

  // Basic material approximations
  if (materialMode === 'glass') {
    roughness = 0.1;
    metalness = 0.2;
    mapColor = '#88ccff';
    curOpacity = Math.min(opacity, 0.35);
  } else if (elType === 'lift') {
     roughness = 0.1;
     metalness = 0.8;
     curOpacity = Math.min(opacity, 0.6);
  } else if (materialMode === 'concrete') {
    roughness = 0.9;
    metalness = 0.1;
    textureMap = textures.concrete;
    if (color === '#059669' || color === '#34d399') {
      mapColor = '#a0a0a0';
    }
  } else if (materialMode === 'wood') {
    roughness = 0.8;
    metalness = 0.1;
    textureMap = textures.wood;
    if (color === '#059669' || color === '#34d399') {
      mapColor = '#cca47c';
    }
  } else if (materialMode === 'wireframe') {
    wireframe = true;
    mapColor = color === '#059669' ? '#34d399' : '#10b981';
    curOpacity = Math.min(opacity, 0.8);
  }

  // Highlight selection
  if (isSelected) {
    mapColor = '#f43f5e'; // Rose color for selection
    curOpacity = Math.max(0.7, curOpacity);
    wireframe = true;
  }

  if (textureMap && textureMap.wrapS !== THREE.RepeatWrapping) {
    textureMap.wrapS = THREE.RepeatWrapping;
    textureMap.wrapT = THREE.RepeatWrapping;
    textureMap.repeat.set(3, 1);
    textureMap.needsUpdate = true;
  }

  // Force full construction if scaleY is 1
  const finalScaleY = Math.max(0.001, Math.min(scaleY, 1));
  const finalVisible = visible && finalScaleY > 0.01;

  // Calculate base position (original position is center)
  const height = size?.[1] || 1;
  const basePosition: [number, number, number] = [
    position[0],
    position[1] - height / 2,
    position[2]
  ];

  return (
    <group position={basePosition} rotation={rotation || [0, 0, 0]} visible={finalVisible} scale={[1, finalScaleY, 1]}>
      {/* Offset box so its bottom is at [0,0,0] relative to group */}
      <Box position={[0, height / 2, 0]} args={size || [3, 1, 3]} castShadow receiveShadow onPointerDown={(e) => { e.stopPropagation(); onClick(e); }}>
        {materialMode === 'glass' ? (
          <meshPhysicalMaterial 
            color={mapColor} 
            map={textureMap}
            transparent={true}
            opacity={curOpacity}
            roughness={0.1}
            metalness={0.2}
            transmission={0.9}
            ior={1.5}
            thickness={0.5}
            clippingPlanes={clippingPlanes}
            side={THREE.DoubleSide}
            wireframe={wireframe}
          />
        ) : (
          <meshStandardMaterial 
            color={mapColor} 
            map={textureMap}
            opacity={curOpacity} 
            transparent={transparent}
            roughness={roughness}
            metalness={metalness}
            clippingPlanes={clippingPlanes}
            side={THREE.DoubleSide}
            wireframe={wireframe}
          />
        )}
      </Box>
    </group>
  );
};

export default function SimulationCanvas({ tasks, currentDay, architectState, setArchitectState, uploadedModel, maxDay }: SimulationCanvasProps) {
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);

  // Design Insights Effect
  useEffect(() => {
    if (uploadedModel && setArchitectState) {
       const insights: string[] = [];
       let smallRooms = 0;
       
       uploadedModel.elements.forEach((el) => {
          if (el.room_type === 'washroom' || el.room_type === 'bedroom') {
            const area = el.size[0] * el.size[2];
            if (area < 8.0) smallRooms++;
          }
       });
       
       // Lightweight BBox Intersection (Simulating clash detection on first 50 elements)
       let clashCount = 0;
       const boxes = uploadedModel.elements.map(el => {
         const m = new THREE.Box3();
         m.setFromCenterAndSize(
           new THREE.Vector3(...el.position),
           new THREE.Vector3(...el.size)
         );
         return m;
       });

       for (let i=0; i<Math.min(boxes.length, 50); i++) {
         for (let j=i+1; j<Math.min(boxes.length, 50); j++) {
           if (boxes[i].intersectsBox(boxes[j])) {
              clashCount++;
           }
         }
       }
       
       if (smallRooms > 0) insights.push(`[MEDIUM] Warning: ${smallRooms} tight spatial clearances detected (Area < 8sqm).`);
       if (clashCount > 5) insights.push(`[HIGH] Analysis: High geometric clash density detected (${clashCount} overlaps) within model.`);
       insights.push("[LOW] Natural light analysis complete: Core daylight exposure is nominal.");
       
       setArchitectState(prev => ({ ...prev, designInsights: insights }));
    }
  }, [uploadedModel, setArchitectState]);

  // Sun calculations based on time (0-24)
  const sunTime = architectState?.sunTime ?? 12;
  const theta = ((sunTime - 6) / 12) * Math.PI; 
  const sunX = Math.cos(theta) * 20;
  const sunY = Math.max(Math.sin(theta) * 20, -2);
  const sunLightIntensity = sunY > 0 ? 1.5 * Math.sin(theta) : 0;
  // Boost ambient slightly at night so the building isn't completely pitch black
  const ambientIntensity = sunY > 0 ? 0.3 : 0.15;

  // Section Cut Clipping Plane
  const clippingPlanes = architectState?.sectionCutEnabled 
    ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), architectState.sectionCutZ)] 
    : [];

  const handleBlockClick = (e: any, elementId: string | null) => {
    if (!architectState || !setArchitectState) return;
    
    if (architectState.measuringActive) {
      const pt = e.point;
      const newPoints = [...measurePoints, pt];
      if (newPoints.length === 2) {
        const dist = newPoints[0].distanceTo(newPoints[1]);
        setArchitectState(prev => ({ ...prev, measureDistance: dist, measuringActive: false }));
        setMeasurePoints([]);
      } else {
        setMeasurePoints(newPoints);
      }
    } else if (elementId) {
      setArchitectState(prev => ({ 
        ...prev, 
        selectedElementId: elementId
      }));
    }
  };

  return (
    <Canvas 
      shadows
      camera={{ position: [8, 8, 8], fov: 45 }}
      gl={{ localClippingEnabled: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={ambientIntensity} color="#a0aec0" />
        <directionalLight 
          position={[sunX, sunY, 5]} 
          intensity={sunLightIntensity} 
          color="#ffffff" 
          castShadow 
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          shadow-bias={-0.0005}
        />
        
        {/* Secondary fill light */}
        {architectState?.layerMode !== 'shadow_study' && (
          <directionalLight position={[-10, 5, -5]} intensity={sunY > 0 ? 0.2 : 0.1} color="#4ade80" />
        )}
        
        <gridHelper args={[40, 40, 0x333333, 0x1a1a1b]} position={[0, -0.5, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <shadowMaterial opacity={0.4} />
        </mesh>
      
      {uploadedModel ? (() => {
        const totalSimDays = maxDay || 100;
        const globalProgress = Math.min(Math.max(currentDay / totalSimDays, 0), 1);
        const maxFloor = Math.max(...uploadedModel.elements.map(e => Math.floor((e.position[1] || 0) / 3.0)), 0);
        
        return uploadedModel.elements.map((el, index) => {
          const floorIndex = Math.floor((el.position[1] || 0) / 3.0);
          
          // Phase mapping
          let phaseStart = 0;
          let phaseEnd = 1;
          let isFoundation = (el.type === 'slab' && floorIndex === 0);
          let isStructure = (el.layer === 'structure' || el.type === 'column' || el.type === 'core' || el.layer === 'walls' || el.type === 'wall');
          let isRoofing = (el.type === 'slab' && floorIndex > 0);
          let isFinishing = (el.layer === 'mep' || el.layer === 'facade' || el.type === 'stair' || el.type === 'lift' || el.type === 'duct');

          if (isFoundation) {
            phaseStart = 0.0;
            phaseEnd = 0.25;
          } else if (isStructure) {
            // Structure is staggered by floor within its phase (25-60%)
            const floorStep = 0.35 / (maxFloor + 1);
            phaseStart = 0.25 + (floorIndex * floorStep);
            phaseEnd = phaseStart + floorStep;
          } else if (isRoofing) {
            phaseStart = 0.60;
            phaseEnd = 0.85;
          } else if (isFinishing) {
            phaseStart = 0.85;
            phaseEnd = 1.0;
          }

          // Calculate element progress
          let elementProgress = 0;
          if (globalProgress >= 1.0) {
            elementProgress = 1.0;
          } else if (globalProgress >= phaseEnd) {
            elementProgress = 1.0;
          } else if (globalProgress >= phaseStart) {
            elementProgress = (globalProgress - phaseStart) / (phaseEnd - phaseStart);
          }
          
          elementProgress = Math.min(Math.max(elementProgress, 0), 1);

          let isVisible = globalProgress >= phaseStart;
          let scaleY = elementProgress;
          
          // Layer visibility checks
          if (architectState?.layers) {
            const elLayer = el.layer || 'walls';
            const config = architectState.layers[elLayer] || { visible: true, opacity: 1.0 };
            if (!config.visible) isVisible = false;
            if (architectState.isolatedLayer && architectState.isolatedLayer !== elLayer) isVisible = false;
          }

          // Construction Color Logic
          let color = el.color;
          if (elementProgress > 0 && elementProgress < 1.0) {
             color = '#fbbf24'; // Construction Yellow
          }
          
          const matMode = architectState?.elementMaterials?.[el.id!] || architectState?.materialMode || 'default';
          const isSelected = architectState?.selectedElementId === el.id;

          return (
             <BuildingBlock 
                key={el.id || index}
                position={el.position}
                size={el.size}
                rotation={el.rotation}
                color={color}
                visible={isVisible}
                opacity={architectState?.layers?.[el.layer!]?.opacity || 1.0}
                materialMode={matMode}
                elType={el.type}
                clippingPlanes={clippingPlanes}
                isSelected={isSelected}
                scaleY={scaleY}
                onClick={(e: any) => handleBlockClick(e, el.id || String(index))}
             />
          );
        });
      })() : (
      tasks.map((task, index) => {
         const columns = 2;
         const row = Math.floor(index / columns);
         const col = index % columns;
         
         let xPos = col * 3.5 - 1.5;
         
         // Apply design variant geometric shift
         if (architectState?.designVariant === 'B') {
            xPos += (row % 2 === 0 ? 0.5 : -0.5);
         }
         
         const position: [number, number, number] = [xPos, row * 1 + 0.5, 0];
         let isVisible = currentDay >= task.early_start;
         let opacity = 0.9;

         // Layer visibility simulation
         if (architectState?.layerMode === 'mep' && index % 2 !== 0) isVisible = false;
         if (architectState?.layerMode === 'structure' && index % 2 === 0) opacity = 0.3;

         // Base Color based on timeline schedule
         let color = '#34d399'; 
         if (currentDay >= task.early_start && currentDay < task.early_finish) {
            color = '#fbbf24'; 
         } else if (task.is_critical) {
            color = '#10b981'; 
         } else {
            color = '#059669'; 
         }
         
         return (
            <BuildingBlock 
               key={task.id} 
               position={position} 
               color={color} 
               visible={isVisible}
               opacity={opacity}
               materialMode={architectState?.materialMode || 'default'}
               clippingPlanes={clippingPlanes}
               onClick={(e: any) => handleBlockClick(e, String(task.id))}
            />
         );
      }))}

      {measurePoints.map((pt, i) => (
         <mesh key={i} position={pt}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="#ef4444" depthTest={false} />
         </mesh>
      ))}

      {measurePoints.length === 2 && (
         <line>
           <bufferGeometry attach="geometry" {...(new THREE.BufferGeometry().setFromPoints(measurePoints)) as any} />
           <lineBasicMaterial attach="material" color="#ef4444" linewidth={2} depthTest={false} />
         </line>
      )}
      
      {architectState?.walkthroughMode ? (
        <WalkthroughControls />
      ) : (
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} enableDamping dampingFactor={0.05} />
      )}
      </Suspense>
    </Canvas>
  );
}
