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
  elLayer,
  clippingPlanes,
  onClick,
  isSelected
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

  const isGlass = materialMode === 'glass' || (elLayer === 'facade' && elType === 'window');

  // Basic material approximations
  if (isGlass) {
    roughness = 0.1;
    metalness = 0.2;
    mapColor = (elLayer === 'facade' && elType === 'window') ? '#88ccff' : color || '#88ccff';
    curOpacity = Math.min(opacity, (elLayer === 'facade' && elType === 'window') ? 0.35 : 0.4);
    transparent = true;
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

  const groupRef = useRef<THREE.Group>(null);
  const shouldAnimate = ['wall', 'slab', 'column', 'stair', 'core'].includes(elType?.toLowerCase() || 'wall');

  useEffect(() => {
    if (!visible && groupRef.current) {
       groupRef.current.scale.set(1, 0.001, 1);
    }
  }, [visible]);

  useFrame((_, delta) => {
    if (visible && shouldAnimate && groupRef.current) {
       groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 8 * delta);
    } else if (visible && groupRef.current) {
       groupRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group ref={groupRef} visible={visible}>
      <Box position={position} args={size || [3, 1, 3]} rotation={rotation || [0, 0, 0]} castShadow receiveShadow onPointerDown={(e) => { e.stopPropagation(); onClick(e); }} userData={{ layer: elLayer || 'default' }}>
        {isGlass ? (
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

export default function SimulationCanvas({ tasks, currentDay, architectState, setArchitectState, uploadedModel }: SimulationCanvasProps) {
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);

  // Design Insights Effect
  useEffect(() => {
    if (uploadedModel && setArchitectState) {
       const insights: string[] = [];
       
       // 1. Calculate which elements are currently visible based on the timeline
       const maxFloor = Math.max(...uploadedModel.elements.map(e => Math.floor((e.position[1] || 0) / 3.0)), 0);
       const numStories = maxFloor + 1;
       const foundationDur = 10;
       const structureDur = 10 * numStories;
       const floorsDur = 5 * numStories;
       const wallsDur = 10 * numStories;
       const facadeDur = 5 * numStories;
       const stage0Start = 0;
       const stage1Start = stage0Start + foundationDur;
       const stage2Start = stage1Start + structureDur;
       const stage3Start = stage2Start + floorsDur;
       const stage4Start = stage3Start + wallsDur;

       const visibleElements = uploadedModel.elements.filter(el => {
          const floorIndex = Math.floor((el.position[1] || 0) / 3.0);
          const elLayer = el.layer || 'walls';
          let stageStart = 0;
          let stageDuration = 10;
          if (elLayer === 'structure') {
             if (floorIndex === 0) { stageStart = stage0Start; stageDuration = foundationDur; }
             else { stageStart = stage1Start; stageDuration = structureDur; }
          } else if (elLayer === 'floors') {
             stageStart = stage2Start; stageDuration = floorsDur;
          } else if (elLayer === 'walls' || elLayer === 'mep') {
             stageStart = stage3Start; stageDuration = wallsDur;
          } else if (elLayer === 'facade') {
             stageStart = stage4Start; stageDuration = facadeDur;
          } else {
             stageStart = stage3Start; stageDuration = wallsDur;
          }
          const floorProgress = maxFloor > 0 ? (floorIndex / maxFloor) : 0;
          return currentDay >= (stageStart + (stageDuration * floorProgress));
       });

       // 2. Clash Awareness Check (on visible elements)
       let clashCount = 0;
       const boxes = visibleElements.map(el => {
         const m = new THREE.Box3();
         m.setFromCenterAndSize(
           new THREE.Vector3(...el.position),
           new THREE.Vector3(...el.size)
         );
         return m;
       });

       for (let i = 0; i < boxes.length; i++) {
         for (let j = i + 1; j < boxes.length; j++) {
           const b1 = boxes[i].clone().expandByScalar(-0.05); // slight tolerance
           const b2 = boxes[j].clone().expandByScalar(-0.05);
           if (b1.intersectsBox(b2)) {
              clashCount++;
           }
         }
       }
       
       if (clashCount > 15) {
         insights.push(`[HIGH] Clash Awareness: Structural conflicts detected (many visible elements overlap).`);
       } else {
         insights.push(`[LOW] Clash Awareness: Minimal or no conflicts detected.`);
       }

       // 3. Daylight Insight
       let facadeArea = 0;
       let roomArea = 0;
       visibleElements.forEach((el) => {
          if (el.layer === 'facade') {
            facadeArea += (el.size[0] * el.size[1]); // length * height
          } else if (el.layer === 'floors') {
            roomArea += (el.size[0] * el.size[2]); // width * depth
          }
       });
       
       const sunTime = architectState?.sunTime ?? 12;
       const theta = ((sunTime - 6) / 12) * Math.PI; 
       const sunIntensity = Math.max(Math.sin(theta), 0); // 0 to 1
       
       let exposurePercent = 0;
       if (roomArea > 0) {
          exposurePercent = (facadeArea / roomArea) * sunIntensity * 100;
       }
       
       if (exposurePercent < 10) {
          insights.push(`[LOW] Daylight Insight: Low daylight in interior spaces due to lack of facade exposure.`);
       } else if (exposurePercent <= 25) {
          insights.push(`[MODERATE] Daylight Insight: Moderate natural light exposure.`);
       } else {
          insights.push(`[GOOD] Daylight Insight: Good natural light exposure near facade openings.`);
       }
       
       // 4. Spatial Efficiency
       let inefficientCount = 0;
       visibleElements.forEach((el) => {
          if (el.room_type === 'washroom' || el.room_type === 'bedroom') {
            const area = el.size[0] * el.size[2];
            if (area < 10.0) inefficientCount++;
          }
       });

       if (inefficientCount > 0) {
         insights.push(`[MEDIUM] Spatial Efficiency: Some rooms appear too narrow for comfortable use.`);
       }
       
       setArchitectState(prev => ({ ...prev, designInsights: insights }));
    }
  }, [uploadedModel, setArchitectState, architectState?.sunTime, currentDay]);

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
        const maxFloor = Math.max(...uploadedModel.elements.map(e => Math.floor((e.position[1] || 0) / 3.0)), 0);
        const numStories = maxFloor + 1;

        const foundationDur = 10;
        const structureDur = 10 * numStories;
        const floorsDur = 5 * numStories;
        const wallsDur = 10 * numStories;
        const facadeDur = 5 * numStories;

        const stage0Start = 0;
        const stage1Start = stage0Start + foundationDur;
        const stage2Start = stage1Start + structureDur;
        const stage3Start = stage2Start + floorsDur;
        const stage4Start = stage3Start + wallsDur;

        // Internal mapping for current stage based on elapsed time
        let currentStage = 'Foundation';
        let progressPercent = 0;
        
        if (currentDay < stage1Start) {
          currentStage = 'Foundation';
          progressPercent = (currentDay / foundationDur) * 100;
        } else if (currentDay < stage2Start) {
          currentStage = 'Structure';
          progressPercent = ((currentDay - stage1Start) / structureDur) * 100;
        } else if (currentDay < stage3Start) {
          currentStage = 'Floors';
          progressPercent = ((currentDay - stage2Start) / floorsDur) * 100;
        } else if (currentDay < stage4Start) {
          currentStage = 'Walls';
          progressPercent = ((currentDay - stage3Start) / wallsDur) * 100;
        } else {
          currentStage = 'Facade';
          progressPercent = Math.min(((currentDay - stage4Start) / facadeDur) * 100, 100);
        }

        return uploadedModel.elements.map((el, index) => {
          const floorIndex = Math.floor((el.position[1] || 0) / 3.0);
          const elLayer = el.layer || 'walls';

          let stageStart = 0;
          let stageDuration = 10;
          
          if (elLayer === 'structure') {
             if (floorIndex === 0) {
               stageStart = stage0Start;
               stageDuration = foundationDur;
             } else {
               stageStart = stage1Start;
               stageDuration = structureDur;
             }
          } else if (elLayer === 'floors') {
             stageStart = stage2Start;
             stageDuration = floorsDur;
          } else if (elLayer === 'walls' || elLayer === 'mep') {
             stageStart = stage3Start;
             stageDuration = wallsDur;
          } else if (elLayer === 'facade') {
             stageStart = stage4Start;
             stageDuration = facadeDur;
          } else {
             stageStart = stage3Start;
             stageDuration = wallsDur;
          }

          // Progressively show elements within their stage window based on floor index
          const floorProgress = maxFloor > 0 ? (floorIndex / maxFloor) : 0;
          const appearDay = stageStart + (stageDuration * floorProgress);
          
          let isVisible = currentDay >= appearDay;
          let opacity = 0.9;
          
          if (architectState?.layers) {
            const elLayer = el.layer || 'walls';
            const config = architectState.layers[elLayer] || { visible: true, opacity: 1.0 };
            
            if (!config.visible) isVisible = false;
            
            if (architectState.isolatedLayer && architectState.isolatedLayer !== elLayer) {
               isVisible = false;
            }
            
            opacity = config.opacity;
          }

          let color = el.color;
          // Highlight recently built elements (3 day window)
          if (currentDay >= appearDay && currentDay <= appearDay + 3) {
             color = '#fbbf24'; 
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
                 opacity={opacity}
                 materialMode={matMode}
                 elType={el.type}
                 elLayer={elLayer}
                 clippingPlanes={clippingPlanes}
                 isSelected={isSelected}
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
