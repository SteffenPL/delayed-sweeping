import { useEffect, useRef, useCallback } from 'react';
import { Application, Graphics } from 'pixi.js';
import { useSimulationStore } from '@/store';
import { DEFAULT_SCALE } from '@/constants/defaults';
import { vec2 } from '@/simulation/vec2';
import type { Vec2 } from '@/types';

interface SimulationCanvasProps {
  width?: number;
  height?: number;
}

export function SimulationCanvas({ width = 600, height = 400 }: SimulationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gridGraphics = useRef<Graphics | null>(null);
  const constraintGraphics = useRef<Graphics | null>(null);
  const classicalTrajectoryGraphics = useRef<Graphics | null>(null);
  const trajectoryGraphics = useRef<Graphics | null>(null);
  const markerGraphics = useRef<Graphics | null>(null);

  const {
    boundaryPolygon,
    constraintAngle,
    trajectory,
    preProjection,
    classicalTrajectory,
    constraintCenters,
    currentStep,
    trajectoryMode,
    dragPosition,
    setDragPosition,
  } = useSimulationStore();

  const scale = DEFAULT_SCALE;

  // World to screen coordinate transform
  const worldToScreen = useCallback(
    (p: Vec2): Vec2 => ({
      x: p.x * scale + width / 2,
      y: -p.y * scale + height / 2,
    }),
    [scale, width, height]
  );

  // Screen to world coordinate transform
  const screenToWorld = useCallback(
    (screen: Vec2): Vec2 => ({
      x: (screen.x - width / 2) / scale,
      y: -(screen.y - height / 2) / scale,
    }),
    [scale, width, height]
  );

  // Initialize PixiJS
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    let app: Application | null = null;
    const container = containerRef.current;

    (async () => {
      app = new Application();

      await app.init({
        backgroundColor: 0xffffff,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        resizeTo: container,
      } as Parameters<typeof app.init>[0]);

      // Check if component unmounted during async init
      if (!mounted) {
        app.destroy(true, { children: true });
        return;
      }

      container.appendChild(app.canvas);
      appRef.current = app;

      // Create graphics layers (order matters - first added renders behind)
      const gridG = new Graphics();
      const constraintG = new Graphics();
      const classicalTrajectoryG = new Graphics();
      const trajectoryG = new Graphics();
      const markerG = new Graphics();

      app.stage.addChild(gridG as never);
      app.stage.addChild(constraintG as never);
      app.stage.addChild(classicalTrajectoryG as never);
      app.stage.addChild(trajectoryG as never);
      app.stage.addChild(markerG as never);

      gridGraphics.current = gridG;
      constraintGraphics.current = constraintG;
      classicalTrajectoryGraphics.current = classicalTrajectoryG;
      trajectoryGraphics.current = trajectoryG;
      markerGraphics.current = markerG;

      // Draw grid (static, only needs to be drawn once)
      const drawGrid = () => {
        gridG.clear();

        const centerX = width / 2;
        const centerY = height / 2;
        const gridSpacing = scale; // 1 unit in world coordinates
        const lightGray = 0xe5e5e5;
        const darkGray = 0xcccccc;

        // Draw vertical grid lines
        for (let x = centerX % gridSpacing; x < width; x += gridSpacing) {
          const isAxis = Math.abs(x - centerX) < 0.5;
          gridG.moveTo(x, 0);
          gridG.lineTo(x, height);
          gridG.stroke({ width: isAxis ? 1.5 : 0.5, color: isAxis ? darkGray : lightGray });
        }

        // Draw horizontal grid lines
        for (let y = centerY % gridSpacing; y < height; y += gridSpacing) {
          const isAxis = Math.abs(y - centerY) < 0.5;
          gridG.moveTo(0, y);
          gridG.lineTo(width, y);
          gridG.stroke({ width: isAxis ? 1.5 : 0.5, color: isAxis ? darkGray : lightGray });
        }
      };

      drawGrid();

      // Set up interaction
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;

      let isDragging = false;
      let isDragLocked = false; // For shift+click lock

      app.stage.on('pointerdown', (event) => {
        const { trajectoryMode: mode } = useSimulationStore.getState();
        if (mode === 'free-drag') {
          const originalEvent = event.nativeEvent as PointerEvent;

          if (originalEvent.shiftKey) {
            // Shift+click: toggle drag lock
            isDragLocked = !isDragLocked;
            if (isDragLocked) {
              const pos = screenToWorld({ x: event.global.x, y: event.global.y });
              setDragPosition(pos);
            }
          } else {
            // Regular click: disable lock and start normal drag
            isDragLocked = false;
            isDragging = true;
            const pos = screenToWorld({ x: event.global.x, y: event.global.y });
            setDragPosition(pos);
          }
        }
      });

      app.stage.on('pointermove', (event) => {
        const { trajectoryMode: mode } = useSimulationStore.getState();
        if (mode === 'free-drag' && (isDragging || isDragLocked)) {
          const pos = screenToWorld({ x: event.global.x, y: event.global.y });
          setDragPosition(pos);
        }
      });

      app.stage.on('pointerup', () => {
        // Only stop normal dragging, keep locked drag active
        isDragging = false;
      });

      app.stage.on('pointerupoutside', () => {
        // Only stop normal dragging, keep locked drag active
        isDragging = false;
      });

      // Mouse wheel rotation handler
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        const { constraintAngle, setConstraintAngle } = useSimulationStore.getState();
        // ~3 degrees per tick
        const delta = event.deltaY > 0 ? 0.05 : -0.05;
        setConstraintAngle(constraintAngle + delta);
      };

      container.addEventListener('wheel', handleWheel, { passive: false });
    })();

    return () => {
      mounted = false;
      // Only destroy if app was fully initialized
      if (app && appRef.current === app) {
        appRef.current = null;
        gridGraphics.current = null;
        constraintGraphics.current = null;
        classicalTrajectoryGraphics.current = null;
        trajectoryGraphics.current = null;
        markerGraphics.current = null;
        app.destroy(true, { children: true });
      }
    };
  }, [width, height]);

  // Draw constraint using precomputed boundary polygon
  const drawConstraint = useCallback(
    (g: Graphics, polygon: Vec2[], center: Vec2, angle: number) => {
      g.clear();

      if (polygon.length === 0) return;

      // Transform polygon: rotate then translate to world, then to screen
      const transformed = polygon.map((p) => {
        const rotated = vec2.rotate(p, angle);
        const worldPos = vec2.add(rotated, center);
        return worldToScreen(worldPos);
      });

      // Draw filled polygon
      g.moveTo(transformed[0].x, transformed[0].y);
      for (let i = 1; i < transformed.length; i++) {
        g.lineTo(transformed[i].x, transformed[i].y);
      }
      g.closePath();
      g.stroke({ width: 2, color: 0x3b82f6 });
      g.fill({ color: 0x3b82f6, alpha: 0.1 });

      // Draw center marker
      const screenCenter = worldToScreen(center);
      g.circle(screenCenter.x, screenCenter.y, 4);
      g.fill({ color: 0xef4444 });

      // Draw rotation indicator line (shows current angle)
      const indicatorLength = 0.3;
      const indicatorEnd = worldToScreen(
        vec2.add(center, vec2.rotate({ x: indicatorLength, y: 0 }, angle))
      );
      g.moveTo(screenCenter.x, screenCenter.y);
      g.lineTo(indicatorEnd.x, indicatorEnd.y);
      g.stroke({ width: 2, color: 0xef4444 });
    },
    [worldToScreen]
  );

  // Draw trajectory (delayed sweeping)
  const drawTrajectory = useCallback(
    (g: Graphics, points: Vec2[]) => {
      g.clear();

      if (points.length < 2) return;

      const n = points.length;

      // Draw trajectory segments with time coloring, skipping initial point
      for (let i = 1; i < n - 1; i++) {
        const p0 = worldToScreen(points[i]);
        const p1 = worldToScreen(points[i + 1]);
        const t = i / (n - 1);

        // Viridis-like color interpolation
        const r = Math.floor(68 + t * (253 - 68));
        const gb = Math.floor(1 + t * (231 - 1));
        const b = Math.floor(84 + t * (37 - 84));
        const color = (r << 16) | (gb << 8) | b;

        g.moveTo(p0.x, p0.y);
        g.lineTo(p1.x, p1.y);
        g.stroke({ width: 2, color });
      }
    },
    [worldToScreen]
  );

  // Draw classical trajectory (grayscale)
  const drawClassicalTrajectory = useCallback(
    (g: Graphics, points: Vec2[]) => {
      g.clear();

      if (points.length < 2) return;

      const n = points.length;

      // Draw trajectory segments in grayscale, skipping initial point
      for (let i = 1; i < n - 1; i++) {
        const p0 = worldToScreen(points[i]);
        const p1 = worldToScreen(points[i + 1]);

        g.moveTo(p0.x, p0.y);
        g.lineTo(p1.x, p1.y);
        g.stroke({ width: 1.5, color: 0x808080 }); // gray
      }
    },
    [worldToScreen]
  );

  // Draw markers (current position and weighted average)
  const drawMarkers = useCallback(
    (g: Graphics, points: Vec2[], xBars: Vec2[], classicalPoints: Vec2[]) => {
      g.clear();

      if (points.length === 0) return;

      // Current weighted average X̄ (red)
      if (xBars.length > 0) {
        const xBar = worldToScreen(xBars[xBars.length - 1]);
        g.circle(xBar.x, xBar.y, 7);
        g.fill({ color: 0xef4444 }); // red
      }

      // Current classical position (small black circle)
      if (classicalPoints.length > 0) {
        const classicalCurrent = worldToScreen(classicalPoints[classicalPoints.length - 1]);
        g.circle(classicalCurrent.x, classicalCurrent.y, 5);
        g.fill({ color: 0x000000 }); // black
      }

      // Current position after projection (green)
      const current = worldToScreen(points[points.length - 1]);
      g.circle(current.x, current.y, 8);
      g.fill({ color: 0x22c55e });
    },
    [worldToScreen]
  );

  // Update constraint visualization
  useEffect(() => {
    if (!constraintGraphics.current) return;

    // Get current center
    let center: Vec2;
    if (trajectoryMode === 'free-drag') {
      center = dragPosition;
    } else if (constraintCenters.length > 0) {
      center = constraintCenters[constraintCenters.length - 1];
    } else {
      center = { x: 2, y: 0 }; // Default
    }

    drawConstraint(constraintGraphics.current, boundaryPolygon, center, constraintAngle);
  }, [boundaryPolygon, constraintAngle, constraintCenters, currentStep, trajectoryMode, dragPosition, drawConstraint]);

  // Update classical trajectory visualization
  useEffect(() => {
    if (!classicalTrajectoryGraphics.current) return;
    drawClassicalTrajectory(classicalTrajectoryGraphics.current, classicalTrajectory);
  }, [classicalTrajectory, drawClassicalTrajectory]);

  // Update delayed trajectory visualization
  useEffect(() => {
    if (!trajectoryGraphics.current) return;
    drawTrajectory(trajectoryGraphics.current, trajectory);
  }, [trajectory, drawTrajectory]);

  // Update markers
  useEffect(() => {
    if (!markerGraphics.current) return;
    drawMarkers(markerGraphics.current, trajectory, preProjection, classicalTrajectory);
  }, [trajectory, preProjection, classicalTrajectory, drawMarkers]);

  return (
    <div
      ref={containerRef}
      className="simulation-canvas"
      style={{
        width,
        height,
        touchAction: 'none',
        cursor: trajectoryMode === 'free-drag' ? 'grab' : 'default',
      }}
    />
  );
}
