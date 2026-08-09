import React, { useRef, useState } from "react";
import { useSquad } from "../../context/SquadContext";

const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const isPointNearStroke = (point, stroke, threshold = 18) => {
  const points = stroke.points;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) {
      if (distanceBetween(point, a) <= threshold) return true;
      continue;
    }
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / l2));
    const projection = { x: a.x + t * dx, y: a.y + t * dy };
    if (distanceBetween(point, projection) <= threshold) return true;
  }
  return points.length === 1 && distanceBetween(point, points[0]) <= threshold;
};

const splitStrokeByEraser = (stroke, eraserPoints, threshold = 14) => {
  const segments = [];
  let currentSegment = [];

  const isErasedPoint = (point) => eraserPoints.some((eraserPoint) => distanceBetween(point, eraserPoint) <= threshold);

  stroke.points.forEach((point) => {
    if (isErasedPoint(point)) {
      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }
      currentSegment = [];
    } else {
      currentSegment.push(point);
    }
  });

  if (currentSegment.length > 1) {
    segments.push(currentSegment);
  }

  return segments.map((points, index) => ({
    ...stroke,
    id: `${stroke.id}-split-${index}`,
    points
  }));
};

export default function DrawingLayer() {
  const { drawings, setDrawings, drawingMode, strokeColor, strokeWidth, setStrokeColor, setDrawingMode } = useSquad();
  const svgRef = useRef(null);
  const [currentStroke, setCurrentStroke] = useState(null);
  // Date.now() alone collides for two strokes drawn in the same millisecond,
  // which duplicates React keys and breaks the laser fade-out timers.
  const strokeSeq = useRef(0);

  // Helper to get coordinates relative to the SVG viewport (0 to 1000)
  const getCoordinates = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 1000;
    return { x, y };
  };

  const eraseStrokeAtPoint = (point) => {
    setDrawings((prev) => prev.filter((stroke) => !isPointNearStroke(point, stroke, 18)));
  };

  const eraseWithPath = (eraserPoints) => {
    setDrawings((prev) => {
      const updated = [];
      prev.forEach((stroke) => {
        if (!isPointNearStroke(eraserPoints[0], stroke, 18) && !eraserPoints.some((point) => isPointNearStroke(point, stroke, 18))) {
          updated.push(stroke);
          return;
        }

        const split = splitStrokeByEraser(stroke, eraserPoints, 16);
        split.forEach((piece) => updated.push(piece));
      });
      return updated;
    });
  };

  const pickColorAtPoint = (point) => {
    const found = drawings.find((stroke) => isPointNearStroke(point, stroke, 18));
    if (found) {
      setStrokeColor(found.color);
      setDrawingMode(null);
    }
  };

  const handlePointerDown = (e) => {
    if (!drawingMode) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);

    if (drawingMode === "eyedropper") {
      pickColorAtPoint({ x, y });
      return;
    }

    if (drawingMode === "strokeEraser") {
      eraseStrokeAtPoint({ x, y });
      return;
    }

    setCurrentStroke({
      id: `${Date.now()}-${strokeSeq.current++}`,
      tool: drawingMode,
      color: strokeColor,
      width: strokeWidth,
      points: [{ x, y }],
      opacity: 1
    });
  };

  const handlePointerMove = (e) => {
    if (drawingMode === "strokeEraser") {
      return;
    }

    const { x, y } = getCoordinates(e);
    if (!currentStroke) return;
    e.preventDefault();

    setCurrentStroke((prev) => {
      if (!prev) return null;
      const next = {
        ...prev,
        points: [...prev.points, { x, y }]
      };
      if (prev.tool === "eraser") {
        eraseWithPath(next.points);
      }
      return next;
    });
  };

  const handlePointerUp = (e) => {
    if (!currentStroke) return;
    e.preventDefault();

    const finalizedStroke = { ...currentStroke };
    setCurrentStroke(null);

    if (finalizedStroke.tool === "eraser") {
      eraseWithPath(finalizedStroke.points);
      return;
    }

    setDrawings((prev) => [...prev, finalizedStroke]);

    if (finalizedStroke.tool === "laser") {
      const strokeId = finalizedStroke.id;

      // Start fade after 1.5s
      setTimeout(() => {
        setDrawings((prev) =>
          prev.map((s) => (s.id === strokeId ? { ...s, opacity: 0 } : s))
        );
      }, 1500);

      // Remove completely after 2s
      setTimeout(() => {
        setDrawings((prev) => prev.filter((s) => s.id !== strokeId));
      }, 2000);
    }
  };

  // Convert points to SVG line path
  const pointsToPath = (points) => {
    if (!points || points.length === 0) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  };

  const getLaserStrokeWidths = (width) => {
    const base = Math.max(2, width || 4);
    return {
      outer: base + 10,
      mid: Math.max(4, base + 4),
      inner: base
    };
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full z-20 cursor-crosshair"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      style={{
        pointerEvents: drawingMode ? "auto" : "none"
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <defs>
        <filter id="laser-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 4 -1" in="noise" result="coloredNoise" />
          <feComposite operator="in" in="coloredNoise" in2="blur2" result="glitter" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="glitter" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Existing strokes */}
      {drawings.map((stroke) => {
        if (stroke.tool === "laser") {
          const widths = getLaserStrokeWidths(stroke.width);
          return (
            <g key={stroke.id} style={{ opacity: stroke.opacity, transition: "opacity 0.5s ease" }}>
              <path
                d={pointsToPath(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={widths.outer}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#laser-glow)"
                opacity={0.8}
              />
              {/* Whitish sides / core */}
              <path
                d={pointsToPath(stroke.points)}
                fill="none"
                stroke="#ffffff"
                strokeWidth={widths.mid}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
              <path
                d={pointsToPath(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={widths.inner}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        }
        return (
          <path
            key={stroke.id}
            d={pointsToPath(stroke.points)}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width || 4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: stroke.opacity, transition: "opacity 0.5s ease" }}
          />
        );
      })}

      {/* Current drawing stroke */}
      {currentStroke && currentStroke.tool === "laser" ? (
        <g>
          {(() => {
            const widths = getLaserStrokeWidths(currentStroke.width);
            return (
              <>
                <path
                  d={pointsToPath(currentStroke.points)}
                  fill="none"
                  stroke={currentStroke.color}
                  strokeWidth={widths.outer}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#laser-glow)"
                  opacity={0.8}
                />
                <path
                  d={pointsToPath(currentStroke.points)}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={widths.mid}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
                <path
                  d={pointsToPath(currentStroke.points)}
                  fill="none"
                  stroke={currentStroke.color}
                  strokeWidth={widths.inner}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            );
          })()}
        </g>
      ) : currentStroke && currentStroke.tool !== "eraser" ? (
        <path
          d={pointsToPath(currentStroke.points)}
          fill="none"
          stroke={currentStroke.color}
          strokeWidth={currentStroke.width || 4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
