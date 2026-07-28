import React, { useRef, useState, useEffect } from "react";
import { useSquad } from "../../context/SquadContext";

export default function DrawingLayer() {
  const { drawings, setDrawings, drawingMode, strokeColor } = useSquad();
  const svgRef = useRef(null);
  const [currentStroke, setCurrentStroke] = useState(null);

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
      id: String(Date.now()),
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
      {/* Existing strokes */}
      {drawings.map((stroke) => (
        <path
          key={stroke.id}
          d={pointsToPath(stroke.points)}
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.tool === "laser" ? 6 : 4}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: stroke.opacity,
            transition: "opacity 0.5s ease"
          }}
        />
      ))}

      {/* Current drawing stroke */}
      {currentStroke && (
        <path
          d={pointsToPath(currentStroke.points)}
          fill="none"
          stroke={currentStroke.color}
          strokeWidth={currentStroke.tool === "laser" ? 6 : 4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
