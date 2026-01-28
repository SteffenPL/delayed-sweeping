import { useCallback } from 'react';
import { useSimulationStore } from '@/store';
import type { Vec2 } from '@/types';

export function useViewport(canvasWidth: number, canvasHeight: number, scale: number) {
  const { zoom, pan, setZoom, setPan } = useSimulationStore();

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback(
    (worldPos: Vec2): Vec2 => {
      const effectiveScale = scale * zoom;
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      return {
        x: centerX + (worldPos.x + pan.x) * effectiveScale,
        y: centerY - (worldPos.y + pan.y) * effectiveScale,
      };
    },
    [canvasWidth, canvasHeight, scale, zoom, pan]
  );

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenPos: Vec2): Vec2 => {
      const effectiveScale = scale * zoom;
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      return {
        x: (screenPos.x - centerX) / effectiveScale - pan.x,
        y: -(screenPos.y - centerY) / effectiveScale - pan.y,
      };
    },
    [canvasWidth, canvasHeight, scale, zoom, pan]
  );

  // Handle zoom with wheel
  const handleWheel = useCallback(
    (e: WheelEvent, isCtrlOrCmd: boolean) => {
      if (isCtrlOrCmd) {
        e.preventDefault();
        const delta = -e.deltaY;
        const zoomFactor = delta > 0 ? 1.1 : 0.9;
        setZoom(zoom * zoomFactor);
      }
    },
    [zoom, setZoom]
  );

  // Handle pan with middle mouse or space+drag
  const handlePan = useCallback(
    (deltaX: number, deltaY: number) => {
      const effectiveScale = scale * zoom;
      setPan({
        x: pan.x + deltaX / effectiveScale,
        y: pan.y - deltaY / effectiveScale,
      });
    },
    [pan, setPan, scale, zoom]
  );

  return {
    zoom,
    pan,
    worldToScreen,
    screenToWorld,
    handleWheel,
    handlePan,
  };
}
