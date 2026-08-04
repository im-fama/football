---
name: fc26-design-system
description: Design system and UI/UX guidelines for building a web application that mimics the EA Sports FC 26 (FIFA) aesthetic, featuring dark glassmorphism, gold FutCards, and 3D pitch environments.
---

# FC26 UI/UX Design Skill

This document provides the exact design guidelines, color palettes, and CSS strategies to create a web application that looks and feels like a modern EA Sports FC (FC25/FC26) Ultimate Team interface. 

When generating UI components or writing CSS, **YOU MUST ADHERE STRICTLY** to these guidelines to maintain the premium, immersive gaming aesthetic.

## 1. Core Aesthetic Principles
- **Dark & Moody Backgrounds**: The application should feel like it's running in a dark stadium or locker room. Use dark grays, pitch blacks, and subtle glowing gradients. Never use plain white or light backgrounds.
- **Glassmorphism**: UI panels, sidebars, and modals should use translucent dark backgrounds (e.g., `bg-black/40`, `bg-pitch-900/80`) paired with `backdrop-blur-md` and subtle glowing borders (`border-white/10`).
- **Premium Cards**: Player representations must use the "FutCard" style: gold/silver gradients, crisp typography, and drop shadows.
- **Micro-Animations**: Everything should feel alive. Add smooth `transition-all duration-200` to buttons, cards, and list items. Hover states should slightly scale up (`scale-105`) and brighten borders.

## 2. Color Palette (Tailwind Configuration)
Use the following custom colors in your Tailwind configuration or CSS variables:

### Pitch (Backgrounds & Surfaces)
- `pitch-950`: `#0a110e` (Deepest background)
- `pitch-900`: `#121e19` (Standard panel background)
- `pitch-850`: `#16221b` (Slightly lighter surface)
- `pitch-800`: `#1a2921` (Hover states)
- `pitch-700`: `#22382c` (Borders and dividers)
- `pitch-600`: `#2f4f3e`
- `pitch-500`: `#3d6b52` (Muted text/icons)

### Brand (Accents & Highlights)
- `brand-300`: `#7ee2a8`
- `brand-400`: `#4ade80` (Primary bright green)
- `brand-500`: `#22c55e`
- `pulse-amber`: `#f5b942` (Used for warnings, secondary actions, and "laser" tools)

### Gold (For Player Cards)
- Card Gradient: `radial-gradient(ellipse at 50% 50%, #fef08a 0%, #d4af37 45%, #b59410 85%, #7a6200 100%)`
- Gold Text: `#1a1600` (Never use pure black on gold, use this deep dark brown/gold).

## 3. Typography
- **Display Font**: `Oswald` (or a similar condensed, bold sans-serif). Used for player ratings, big headers, and stat numbers. Always use `uppercase` and `font-bold` for these.
- **Body Font**: `Inter` (or similar clean sans-serif). Used for small UI text, buttons, and descriptions.
- **Styling Rules**:
  - Small UI labels should be `text-[10px] uppercase tracking-widest font-bold opacity-70`.
  - Stats on cards should be closely tracked: `letter-spacing: -0.05em; line-height: 1;`.

## 4. Components & Layouts

### The "FutCard" (Player Card)
- **Dimensions**: Standard cards should have a `w-[140px] h-[200px]` ratio. When placed on a pitch, scale them down (`transform: scale(0.75)`).
- **Structure**:
  - **Top Left**: Overall Rating (Huge, Oswald font), Position (smaller, Oswald). Below this, small country/club flags.
  - **Center**: Player Image (cutout, bottom-aligned, `drop-shadow`). If no image, use stylized initials (White, Oswald, large, with a text-shadow).
  - **Bottom**: Player Name (bold, centered), followed by a grid of 6 core stats (PAC, SHO, PAS, DRI, DEF, PHY) with the stat number above the label.

### The 3D Pitch
- Use CSS 3D transforms to tilt the pitch: `perspective: 1200px; transform: rotateX(30deg) scale(1.1);`.
- Use a repeating linear gradient to simulate mowed grass stripes.
- Overlay SVG lines (`opacity-15`) to draw the penalty boxes, center circle, and half-way line.

### Radial Context Menus
- When clicking a player on the pitch, do not immediately open a full-screen modal.
- Instead, open a floating "Context Menu" next to the cursor with a sleek glassmorphic design and SVG icons (e.g., View Stats, Swap, Remove).

### Sidebars & Modals
- **Sidebars**: Floating over the pitch, usually on the right or left. Fixed width, glassmorphic background, with subtle glowing borders.
- **Modals**: Centered, dark backdrop (`bg-black/80`). The modal itself should have a gradient border or a subtle brand-colored glow (`box-shadow: 0 0 20px rgba(34,197,94,0.2)`).

## 5. CSS Utility Classes (Reference)
When writing custom CSS, leverage these patterns:
```css
/* Glass Panel */
.glass-panel {
  @apply bg-pitch-900/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl;
}

/* Glowing Text */
.shadow-text {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

/* Clean Scrollbars */
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
```

## 6. Implementation Checklist for AI Agents
1. Ensure the background is dark and moody.
2. Use `backdrop-blur` for all floating UI elements.
3. Apply `Oswald` for numbers and ratings; `Inter` for standard text.
4. Ensure cards use the Gold radial gradient and have drop shadows on images.
5. Add `hover:border-brand-400` and `scale-105` transitions to interactive elements.
