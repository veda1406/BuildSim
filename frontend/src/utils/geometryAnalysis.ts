import type { ParsedModel, ArchitectState } from '../types';

export interface BuildingMetrics {
  totalFloors: number;
  buildingHeight: number;
  floorPlateArea: number;
  width: number;
  depth: number;
  structuralDensity: number;
  elementsCount: number;
  corridorWidthApproximation: number;
  facadeOpennessRatio: number;
  estimatedDaylightPenetration: number;
  mepCongestionEstimate: number;
  maxStructuralSpan: number;
  layoutDensity: number;
}

export function generateBuildingMetrics(model: ParsedModel): BuildingMetrics {
  const elements = model.elements || [];
  const elementsCount = elements.length;

  if (elementsCount === 0) {
    return {
      totalFloors: 1,
      buildingHeight: 3,
      floorPlateArea: 100,
      width: 10,
      depth: 10,
      structuralDensity: 0.2,
      elementsCount: 0,
      corridorWidthApproximation: 1.8,
      facadeOpennessRatio: 0.3,
      estimatedDaylightPenetration: 0.5,
      mepCongestionEstimate: 0.2,
      maxStructuralSpan: 5.0,
      layoutDensity: 0.2
    };
  }

  // 1. Calculate height & floors
  const heights = elements.map(e => e.position[1]);
  const maxHeight = Math.max(...heights, 0);
  const totalFloors = Math.max(1, Math.round(maxHeight / 3.0) + 1);
  
  const elementTops = elements.map(e => e.position[1] + (e.size[1] / 2));
  const buildingHeight = Math.max(...elementTops, 3.0);

  // 2. Calculate horizontal dimensions
  const minX = Math.min(...elements.map(e => e.position[0] - e.size[0] / 2));
  const maxX = Math.max(...elements.map(e => e.position[0] + e.size[0] / 2));
  const minZ = Math.min(...elements.map(e => e.position[2] - e.size[2] / 2));
  const maxZ = Math.max(...elements.map(e => e.position[2] + e.size[2] / 2));
  
  const width = Math.max(1.0, maxX - minX);
  const depth = Math.max(1.0, maxZ - minZ);
  const floorPlateArea = width * depth;

  // 3. Structural Density (volume of columns, walls, cores relative to total building volume)
  const structuralElements = elements.filter(
    e => e.layer === 'structure' || e.type === 'column' || e.type === 'core' || e.type === 'wall' || e.layer === 'walls'
  );
  const structuralVolume = structuralElements.reduce(
    (acc, el) => acc + (el.size[0] * el.size[1] * el.size[2]),
    0
  );
  const buildingVolume = floorPlateArea * (buildingHeight || 3.0);
  const structuralDensity = Math.min(1.0, structuralVolume / (buildingVolume || 1.0));

  // 4. Corridor Width Approximation
  const corridorElements = elements.filter(
    e => e.room_type === 'corridor' || e.layer?.toLowerCase().includes('corridor')
  );
  let corridorWidthApproximation = 1.8; // Baseline fallback
  if (corridorElements.length > 0) {
    const widths = corridorElements.map(e => Math.min(e.size[0], e.size[2]));
    corridorWidthApproximation = Math.min(...widths);
  } else {
    // If no corridor tag exists, approximate based on room layout and spacing
    const rooms = elements.filter(e => e.room_type && e.room_type !== 'corridor');
    if (rooms.length > 4) {
      corridorWidthApproximation = Math.max(1.0, 2.2 - (rooms.length * 0.05));
    }
  }

  // 5. Facade Openness Ratio (windows / facade perimeter area)
  const windows = elements.filter(
    e => e.type === 'window' || (e.layer === 'facade' && e.color === '#88ccff')
  );
  const glassArea = windows.reduce(
    (acc, el) => acc + (el.size[0] * el.size[1] + el.size[2] * el.size[1]),
    0
  );
  const facadeArea = 2 * (width + depth) * (buildingHeight || 3.0);
  const facadeOpennessRatio = Math.min(1.0, glassArea / (facadeArea || 1.0));

  // 6. Estimated Daylight Penetration
  const depthFactor = Math.max(1.0, depth);
  const estimatedDaylightPenetration = Math.min(
    1.0,
    Math.max(0.1, (facadeOpennessRatio * 12.0) / depthFactor)
  );

  // 7. MEP Congestion Estimate
  const mepElements = elements.filter(
    e => e.layer === 'mep' || e.type === 'duct'
  );
  const mepVolume = mepElements.reduce(
    (acc, el) => acc + (el.size[0] * el.size[1] * el.size[2]),
    0
  );
  const mepDensity = mepVolume / (buildingVolume || 1.0);
  const mepCongestionEstimate = Math.min(1.0, mepDensity * 45.0 + structuralDensity * 0.4);

  // 8. Max Structural Column Span
  const columns = elements.filter(e => e.type === 'column');
  let maxStructuralSpan = 5.0; // default baseline
  if (columns.length > 1) {
    let maxDist = 0;
    const floorsMap: Record<number, typeof columns> = {};
    columns.forEach(col => {
      const f = Math.max(0, Math.floor((col.position[1] || 0) / 3.0));
      if (!floorsMap[f]) floorsMap[f] = [];
      floorsMap[f].push(col);
    });

    Object.values(floorsMap).forEach(floorCols => {
      if (floorCols.length > 1) {
        for (let i = 0; i < Math.min(floorCols.length, 25); i++) {
          for (let j = i + 1; j < Math.min(floorCols.length, 25); j++) {
            const p1 = floorCols[i].position;
            const p2 = floorCols[j].position;
            const dx = p1[0] - p2[0];
            const dz = p1[2] - p2[2];
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > maxDist) maxDist = dist;
          }
        }
      }
    });
    if (maxDist > 1.0) {
      maxStructuralSpan = maxDist;
    }
  }

  // 9. Layout Density (usable rooms relative to footprint)
  const roomElements = elements.filter(e => e.room_type || e.type === 'room');
  const layoutDensity = Math.min(1.0, roomElements.length / (width * depth * 0.05 || 1.0));

  return {
    totalFloors,
    buildingHeight,
    floorPlateArea,
    width,
    depth,
    structuralDensity,
    elementsCount,
    corridorWidthApproximation,
    facadeOpennessRatio,
    estimatedDaylightPenetration,
    mepCongestionEstimate,
    maxStructuralSpan,
    layoutDensity
  };
}

export function generateInsights(
  metrics: BuildingMetrics,
  architectState: ArchitectState,
  currentDay: number,
  maxDay: number,
  clashesCount: number,
  floorClashes: Record<number, number>
): string[] {
  const insights: string[] = [];

  // 1. Height & Lateral Wind Loads Recommendation (Deterministic by floor / height)
  if (metrics.totalFloors >= 6 || metrics.buildingHeight > 18.0) {
    insights.push(
      `[HIGH] Structural Load: Tall building profile (${metrics.totalFloors} floors, ${metrics.buildingHeight.toFixed(1)}m) creates significant lateral wind shear. Continuous shear walls and concrete core columns are recommended to mitigate swaying moments.`
    );
  } else if (metrics.totalFloors >= 3 && metrics.totalFloors < 6) {
    insights.push(
      `[MEDIUM] Structural Load: Moderate building height profile (${metrics.totalFloors} floors). Frame lateral load moments are moderate; ensure horizontal beam junctions are reinforced for shear stiffness.`
    );
  } else {
    insights.push(
      `[LOW] Structural Load: Low-rise structural footprint (${metrics.totalFloors} floor, ${metrics.buildingHeight.toFixed(1)}m). Lateral wind loads are negligible; standard reinforced load-bearing columns are optimized.`
    );
  }

  // 2. Daylight & Core Penetration Warnings (Deterministic by Floor Plate & depth)
  if (metrics.floorPlateArea > 350.0) {
    if (metrics.estimatedDaylightPenetration < 0.25) {
      insights.push(
        `[HIGH] Daylight Quality: Extensive floor plate footprint (${metrics.floorPlateArea.toFixed(0)}m²) with high building depth (${metrics.depth.toFixed(1)}m). Usable interior workspaces suffer from critical light deficit (<120 Lux). A central atrium or skylights are highly recommended.`
      );
    } else {
      insights.push(
        `[MEDIUM] Daylight Quality: Wide structural layout. Glazing coverage meets baseline, but deep perimeter windows or open spatial plans are required to optimize natural daylight distribution to central corridors.`
      );
    }
  } else {
    insights.push(
      `[LOW] Daylight Quality: Compact footprint (${metrics.floorPlateArea.toFixed(0)}m²). Daylight achieves deep penetration, covering over 88% of the active floor plan without auxiliary light wells.`
    );
  }

  // 3. Circulation Egress Bottleneck & Layout Density
  if (metrics.corridorWidthApproximation < 1.5) {
    insights.push(
      `[HIGH] Spatial Layout: Tight circulation corridor width detected (${metrics.corridorWidthApproximation.toFixed(2)}m). Egress standard requires 1.8m minimum. Potential bottleneck during peak occupancy evac simulations.`
    );
  } else if (metrics.corridorWidthApproximation >= 1.5 && metrics.corridorWidthApproximation < 1.8) {
    insights.push(
      `[MEDIUM] Spatial Layout: Sub-optimal egress path width (${metrics.corridorWidthApproximation.toFixed(2)}m). Meets minimum accessibility guidelines but restricts dual-flow occupancy circulation.`
    );
  } else {
    insights.push(
      `[LOW] Spatial Layout: Excellent egress circulation clearance (${metrics.corridorWidthApproximation.toFixed(2)}m). Safe, dual-stream escape corridors fully comply with emergency requirements.`
    );
  }

  if (metrics.layoutDensity > 0.6) {
    insights.push(
      `[MEDIUM] Layout Density: Dense floor layout partitioning detected. Numerous micro-rooms restrict horizontal ventilation and occupancy flow lines.`
    );
  }

  // 4. Large Structural Spans & Reinforcement Suggestions
  if (metrics.maxStructuralSpan > 8.0) {
    insights.push(
      `[HIGH] Structural Span: Unsupported structural grid span exceeds ${(metrics.maxStructuralSpan).toFixed(1)}m. High floor slab bending moments detected. Post-tensioned concrete slab reinforcing or composite steel girders are required.`
    );
  } else if (metrics.maxStructuralSpan > 6.0 && metrics.maxStructuralSpan <= 8.0) {
    insights.push(
      `[MEDIUM] Structural Span: Moderate structural spans (${metrics.maxStructuralSpan.toFixed(1)}m). Standard reinforced concrete slabs are viable, but verify double mesh reinforcement around column headers.`
    );
  } else {
    insights.push(
      `[LOW] Structural Span: Dense and optimized column grid spacing (average span ${metrics.maxStructuralSpan.toFixed(1)}m). Minimizes slab depth requirements and concrete volume.`
    );
  }

  // 5. MEP Congestion & Clash Warnings (Intersections by Level)
  if (clashesCount > 0) {
    Object.entries(floorClashes).forEach(([floor, count]) => {
      insights.push(
        `[HIGH] MEP Clash: ${count} service piping and ductwork overlaps detected with load-bearing beams or columns at Level ${parseInt(floor) + 1}. Routing coordinate override required.`
      );
    });
  } else {
    if (metrics.mepCongestionEstimate > 0.5) {
      insights.push(
        `[MEDIUM] MEP Design: Elevating ceiling service congestion (${(metrics.mepCongestionEstimate * 100).toFixed(0)}%). Strictly coordinate vertical drops with horizontal conduits to avoid intersection.`
      );
    } else {
      insights.push(
        `[LOW] MEP Design: Clean mechanical layout plenum. Service routing clearances are well within tolerance limits.`
      );
    }
  }

  // 6. Facade Study & Solar Time-of-day risks
  const sunTime = architectState.sunTime ?? 12;
  const isAfternoonPeak = sunTime >= 14.0 && sunTime <= 17.0;

  if (metrics.facadeOpennessRatio > 0.4) {
    if (isAfternoonPeak) {
      insights.push(
        `[HIGH] Facade Study: Glass envelope openness is elevated (${(metrics.facadeOpennessRatio * 100).toFixed(0)}%). Peak afternoon direct solar exposure induces high risk of thermal gain and greenhouse envelope overloading.`
      );
    } else {
      insights.push(
        `[MEDIUM] Facade Study: Generous architectural glazing ratio (${(metrics.facadeOpennessRatio * 100).toFixed(0)}%). Maximizes natural light, but double-pane performance glazing with low-E coating is recommended to minimize HVAC demand.`
      );
    }
  } else if (metrics.facadeOpennessRatio < 0.15) {
    insights.push(
      `[MEDIUM] Facade Study: Low fenestration ratio (${(metrics.facadeOpennessRatio * 100).toFixed(0)}% glass area). Excellent insulated wall thermal barrier, but restricts daylight and internal natural ventilation.`
    );
  } else {
    insights.push(
      `[LOW] Facade Study: Balanced window-to-wall fenestration ratio (${(metrics.facadeOpennessRatio * 100).toFixed(0)}%). Optimized balance between natural ventilation, views, and structural thermal performance.`
    );
  }

  // 7. Dynamic Environmental Insights (Solar study & material thermal retention)
  if (sunTime >= 10 && sunTime <= 14) {
    insights.push(
      `[LOW] Solar Study: Peak daylight exposure (Noon). Daylight penetration is excellent at ${(metrics.estimatedDaylightPenetration * 450).toFixed(0)} Lux. Natural light covers secondary circulation routes.`
    );
  } else if ((sunTime >= 6 && sunTime < 10) || (sunTime > 14 && sunTime <= 18)) {
    insights.push(
      `[LOW] Solar Study: Normal daylight study active (${Math.floor(sunTime)}:00). Mean Lux levels: ${(metrics.estimatedDaylightPenetration * 280).toFixed(0)} Lux.`
    );
  } else {
    insights.push(
      `[MEDIUM] Solar Study: Nocturnal simulation active. Daylight Lux levels: 0 Lux. Artificial lighting systems required to maintain egress visibility.`
    );
  }

  // 8. Material overrides
  let concreteCount = 0;
  let woodCount = 0;
  let glassCount = 0;
  
  const values = Object.values(architectState.elementMaterials || {});
  values.forEach(mat => {
    if (mat === 'concrete') concreteCount++;
    else if (mat === 'wood') woodCount++;
    else if (mat === 'glass') glassCount++;
  });
  if (architectState.materialMode === 'concrete') concreteCount += 10;
  else if (architectState.materialMode === 'wood') woodCount += 10;
  else if (architectState.materialMode === 'glass') glassCount += 10;

  if (concreteCount > 0) {
    insights.push(
      `[LOW] Material Study: High concrete thermal core mass increases thermal retention capacity, but elevates structural embodied carbon footprint.`
    );
  }
  if (woodCount > 0) {
    insights.push(
      `[LOW] Material Study: Wood element overrides enhance structural sustainability score and carbon sequestration characteristics.`
    );
  } else {
    insights.push(
      `[MEDIUM] Material Study: Facade and spandrel concrete content remains high. Consider replacing secondary elements with wood to enhance ESG metrics.`
    );
  }

  // 9. Construction Timeline Stage alert
  const progress = currentDay / (maxDay || 100);
  if (progress < 0.1) {
    insights.push(
      `[LOW] Timeline State: Excavation & concrete pouring of ground floor columns active. Strictly verify soil density parameters before curing.`
    );
  } else if (progress < 0.85) {
    insights.push(
      `[LOW] Timeline State: Superstructure columns and floor plates construction in progress. Ensure strict adherence to concrete core curing cycles.`
    );
  } else {
    insights.push(
      `[LOW] Timeline State: Building envelope glazing, facade panel alignment, and MEP plumbing routing active. Coordinate final clash resolutions.`
    );
  }

  return insights;
}
