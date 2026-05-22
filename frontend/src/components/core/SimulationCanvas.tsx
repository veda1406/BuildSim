import { useState, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Box, PointerLockControls, useTexture } from '@react-three/drei';
import type { Task, ArchitectState, ParsedModel } from '../../types';
import { generateBuildingMetrics, generateInsights } from '../../utils/geometryAnalysis';
import { useSimulation } from '../../context/SimulationContext';

interface SimulationCanvasProps {
  tasks: Task[];
  currentDay: number;
  architectState?: ArchitectState;
  setArchitectState?: React.Dispatch<React.SetStateAction<ArchitectState>>;
  civilState?: any;
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
      switch (e.code) {
        case 'KeyW': setMovement(m => ({ ...m, forward: true })); break;
        case 'KeyS': setMovement(m => ({ ...m, backward: true })); break;
        case 'KeyA': setMovement(m => ({ ...m, left: true })); break;
        case 'KeyD': setMovement(m => ({ ...m, right: true })); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
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
  isSelected,
  scaleY = 1,
  isLoadTransferHighlight = false
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

  // Load Transfer Animation Highlight
  let emissiveColor = '#000000';
  let emissiveIntensity = 0;
  if (isLoadTransferHighlight) {
    roughness = 0.2;
    metalness = 0.5;
    mapColor = '#3b82f6';
    emissiveColor = '#3b82f6';
    emissiveIntensity = 1.8;
    curOpacity = Math.max(0.9, curOpacity);
    transparent = true;
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
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
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
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
          />
        )}
      </Box>
    </group>
  );
};

export default function SimulationCanvas({ tasks, currentDay, architectState, setArchitectState, civilState, uploadedModel, maxDay }: SimulationCanvasProps) {
  const { pmSimData } = useSimulation();
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [animTime, setAnimTime] = useState(0);

  // Load Transfer Animation ticker
  useEffect(() => {
    if (civilState?.loadTransferActive) {
      let animFrameId: number;
      const tick = () => {
        setAnimTime(Date.now());
        animFrameId = requestAnimationFrame(tick);
      };
      animFrameId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animFrameId);
    }
  }, [civilState?.loadTransferActive]);

  // Design Insights Effect
  useEffect(() => {
    if (uploadedModel && setArchitectState && architectState) {
       // 1. Dynamic MEP-to-Structure BBox Clash Detection
       const clashingIds: string[] = [];
       const structuralEls = uploadedModel.elements.filter(
         el => el.layer === 'structure' || el.type === 'column' || el.type === 'core' || el.type === 'wall' || el.layer === 'walls'
       );
       const mepEls = uploadedModel.elements.filter(
         el => el.layer === 'mep' || el.type === 'duct'
       );

       const structBoxes = structuralEls.map(el => ({
         id: el.id,
         box: new THREE.Box3().setFromCenterAndSize(
           new THREE.Vector3(...el.position),
           new THREE.Vector3(...el.size)
         )
       }));

       const mepBoxes = mepEls.map(el => ({
         id: el.id,
         floor: Math.max(0, Math.floor((el.position[1] || 0) / 3.0)),
         box: new THREE.Box3().setFromCenterAndSize(
           new THREE.Vector3(...el.position),
           new THREE.Vector3(...el.size)
         )
       }));

       const floorClashes: Record<number, number> = {};

       mepBoxes.forEach(mep => {
         structBoxes.forEach(str => {
           if (mep.box.intersectsBox(str.box)) {
             clashingIds.push(mep.id);
             clashingIds.push(str.id);
             floorClashes[mep.floor] = (floorClashes[mep.floor] || 0) + 1;
           }
         });
       });

       const clashesCount = clashingIds.length / 2;

       // 2. Generate Building Metrics Deterministically
       const metrics = generateBuildingMetrics(uploadedModel);

       // 3. Generate Rule-based Insights procedurally
       const insights = generateInsights(metrics, architectState, currentDay, maxDay, clashesCount, floorClashes);

       setArchitectState(prev => ({ 
         ...prev, 
         designInsights: insights,
         clashingElementIds: clashingIds 
       }));
    }
  }, [uploadedModel, setArchitectState, architectState?.sunTime, currentDay, architectState?.materialMode, architectState?.elementMaterials]);

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
          const totalFloors = maxFloor + 1;

          // Retrieve dynamic stage bounds calculated on backend
          const stages = pmSimData?.stages || [];
          const foundationStage = stages.find((s: any) => s.name === 'Foundation');
          const structureStage = stages.find((s: any) => s.name === 'Structure');
          const floorsStage = stages.find((s: any) => s.name === 'Floors');
          const wallsStage = stages.find((s: any) => s.name === 'Walls');
          const facadeStage = stages.find((s: any) => s.name === 'Facade');

          const foundationStart = foundationStage ? foundationStage.start : 0;
          const foundationEnd = foundationStage ? foundationStage.end : maxDay * 0.10;

          const structureStart = structureStage ? structureStage.start : foundationEnd;
          const floorsEnd = floorsStage ? floorsStage.end : maxDay * 0.70;

          const wallsStart = wallsStage ? wallsStage.start : floorsEnd;
          const wallsEnd = wallsStage ? wallsStage.end : maxDay * 0.85;

          const facadeStart = facadeStage ? facadeStage.start : wallsEnd;
          const facadeEnd = facadeStage ? facadeStage.end : maxDay;

          // Combined Superstructure duration (Columns + Frame + Slabs)
          const superDuration = floorsEnd - structureStart;
          const floorSuperDuration = totalFloors > 0 ? superDuration / totalFloors : 0;

          // Walls phase duration
          const wallsDuration = wallsEnd - wallsStart;
          const floorWallsDuration = totalFloors > 0 ? wallsDuration / totalFloors : 0;

          // Facade phase duration
          const facadeDuration = facadeEnd - facadeStart;
          const floorFacadeDuration = totalFloors > 0 ? facadeDuration / totalFloors : 0;

          return uploadedModel.elements.map((el, index) => {
            const floorIndex = Math.max(0, Math.floor((el.position[1] || 0) / 3.0));

            // Classify element type
            const isFoundation = (el.type === 'slab' && el.position[1] < 1.0) || el.type === 'foundation';
            const isColumn = el.type === 'column';
            const isRoofing = el.type === 'slab' && el.position[1] >= 1.0;
            const isStair = el.type === 'stair' || (el.layer && el.layer.toLowerCase().includes('stair'));
            const isFrame = (el.layer === 'structure' || el.type === 'core' || el.layer === 'structural') && !isColumn && !isRoofing && !isStair;
            const isWallPartition = (el.layer === 'walls' || el.type === 'wall') && !isFrame;
            const isMEP = el.layer === 'mep' || el.type === 'duct' || el.type === 'lift';
            const isFacade = el.layer === 'facade' || el.type === 'window';

            // Phase mapping
            let phaseStart = 0;
            let phaseEnd = maxDay || 100;

            if (isFoundation) {
              phaseStart = foundationStart;
              phaseEnd = foundationEnd;
            } else if (isColumn) {
              const floorSuperStart = structureStart + floorIndex * floorSuperDuration;
              phaseStart = floorSuperStart;
              phaseEnd = floorSuperStart + floorSuperDuration * 0.35;
            } else if (isFrame) {
              const floorSuperStart = structureStart + floorIndex * floorSuperDuration;
              phaseStart = floorSuperStart + floorSuperDuration * 0.35;
              phaseEnd = floorSuperStart + floorSuperDuration * 0.75;
            } else if (isRoofing || isStair) {
              const floorSuperStart = structureStart + floorIndex * floorSuperDuration;
              phaseStart = floorSuperStart + floorSuperDuration * 0.75;
              phaseEnd = floorSuperStart + floorSuperDuration;
            } else if (isWallPartition || isMEP) {
              phaseStart = wallsStart + floorIndex * floorWallsDuration;
              phaseEnd = phaseStart + floorWallsDuration;
            } else if (isFacade) {
              phaseStart = facadeStart + floorIndex * floorFacadeDuration;
              phaseEnd = phaseStart + floorFacadeDuration;
            } else {
              // Fallback default: map with structural frame
              const floorSuperStart = structureStart + floorIndex * floorSuperDuration;
              phaseStart = floorSuperStart + floorSuperDuration * 0.35;
              phaseEnd = floorSuperStart + floorSuperDuration * 0.75;
            }

            // Calculate element progress and visibility
            let elementProgress = 0;
            let isVisible = false;
            let scaleY = 1.0;

            if (currentDay >= phaseEnd) {
              elementProgress = 1.0;
              isVisible = true;
              scaleY = 1.0;
            } else if (currentDay >= phaseStart) {
              const phaseDuration = phaseEnd - phaseStart;
              elementProgress = phaseDuration > 0 ? (currentDay - phaseStart) / phaseDuration : 1.0;
              elementProgress = Math.min(Math.max(elementProgress, 0), 1);
              isVisible = true;
              scaleY = elementProgress;
            } else {
              elementProgress = 0;
              isVisible = false;
              scaleY = 0.01;
            }

            // Layer visibility checks
            if (architectState?.layers) {
              const elLayer = el.layer || 'walls';
              const config = architectState.layers[elLayer] || { visible: true, opacity: 1.0 };
              if (!config.visible) isVisible = false;
              if (architectState.isolatedLayer && architectState.isolatedLayer !== elLayer) isVisible = false;
            }

             // Construction Color Logic
             let color = el.color;
             const isClash = architectState?.clashingElementIds?.includes(el.id);
             if (isClash) {
               color = '#ef4444'; // Red highlight for clash
             } else if (civilState?.heatmapActive && civilState?.stressLevels?.[el.id!]) {
               const stress = civilState.stressLevels[el.id!];
               if (stress >= 0.75) color = '#ef4444'; // Red
               else if (stress > 0.4) color = '#eab308'; // Yellow
               else color = '#22c55e'; // Green
             } else if (elementProgress > 0 && elementProgress < 1.0) {
               color = '#b9a651'; // Construction Yellow
             }

            const matMode = architectState?.elementMaterials?.[el.id!] || architectState?.materialMode || 'default';
            const isSelected = architectState?.selectedElementId === el.id || civilState?.weakElementIds?.includes(el.id!);

            // Load Transfer Highlight calculation
            const isLoadTransferActive = civilState?.loadTransferActive;
            let isLoadTransferHighlight = false;
            if (isLoadTransferActive) {
              const time = (animTime / 800) % 4; // 3.2s cycle
              const stage = Math.floor(time);
              if (stage === 0 && isRoofing) isLoadTransferHighlight = true;
              else if (stage === 1 && isFrame) isLoadTransferHighlight = true;
              else if (stage === 2 && isColumn) isLoadTransferHighlight = true;
              else if (stage === 3 && isFoundation) isLoadTransferHighlight = true;
            }

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
                elLayer={el.layer}
                clippingPlanes={clippingPlanes}
                isSelected={isSelected}
                scaleY={scaleY}
                onClick={(e: any) => handleBlockClick(e, el.id || String(index))}
                isLoadTransferHighlight={isLoadTransferHighlight}
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
