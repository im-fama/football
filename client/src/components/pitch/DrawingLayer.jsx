import React, { useRef, useState, useEffect } from "react";
import { useSquad } from "../../context/SquadContext";

export default function DrawingLayer() {
  const { drawings, setDrawings, drawingMode, strokeColor } = useSquad();
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

  const handlePointerDown = (e) => {
    if (!drawingMode) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    
    setCurrentStroke({
      id: `${Date.now()}-${strokeSeq.current++}`,
      tool: drawingMode,
      color: strokeColor,
      points: [{ x, y }],
      opacity: 1
    });
  };

  const handlePointerMove = (e) => {
    if (!currentStroke) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);

    setCurrentStroke((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y }]
      };
    });
  };

  const handlePointerUp = (e) => {
    if (!currentStroke) return;
    e.preventDefault();

    const finalizedStroke = { ...currentStroke };
    setDrawings((prev) => [...prev, finalizedStroke]);
    setCurrentStroke(null);

    // If it's a laser pen, trigger fade out
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
          return (
            <g key={stroke.id} style={{ opacity: stroke.opacity, transition: "opacity 0.5s ease" }}>
              <path
                d={pointsToPath(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={16}
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
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
              <path
                d={pointsToPath(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={4}
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
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: stroke.opacity, transition: "opacity 0.5s ease" }}
          />
        );
      })}

      {/* Current drawing stroke */}
      {currentStroke && currentStroke.tool === "laser" ? (
        <g>
          <path
            d={pointsToPath(currentStroke.points)}
            fill="none"
            stroke={currentStroke.color}
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#laser-glow)"
            opacity={0.8}
          />
          <path
            d={pointsToPath(currentStroke.points)}
            fill="none"
            stroke="#ffffff"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
          <path
            d={pointsToPath(currentStroke.points)}
            fill="none"
            stroke={currentStroke.color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : currentStroke ? (
        <path
          d={pointsToPath(currentStroke.points)}
          fill="none"
          stroke={currentStroke.color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
