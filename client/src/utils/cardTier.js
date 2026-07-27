export function tierFromRating(rating) {
  if (rating >= 75) {
    return { name: "Gold", bg: "bg-gold-card", text: "text-pitch-950", ring: "shadow-glow" };
  }
  if (rating >= 65) {
    return { name: "Silver", bg: "bg-silver-card", text: "text-pitch-950", ring: "shadow-card" };
  }
  return { name: "Bronze", bg: "bg-bronze-card", text: "text-pitch-950", ring: "shadow-card" };
}

export function formColor(label) {
  switch (label) {
    case "In Form":
      return { text: "text-pulse-green", bg: "bg-pulse-green/15", dot: "bg-pulse-green" };
    case "Declining":
      return { text: "text-pulse-red", bg: "bg-pulse-red/15", dot: "bg-pulse-red" };
    default:
      return { text: "text-pulse-amber", bg: "bg-pulse-amber/15", dot: "bg-pulse-amber" };
  }
}

export function statBarColor(value) {
  if (value >= 80) return "#4ade80";
  if (value >= 60) return "#f5b942";
  return "#ef5a5a";
}
