// ── Mock squad data ────────────────────────────────────────────────────────
// Simulates a MongoDB-backed squad with authentic player cutouts & ratings.

export const TEAM_NAME = "FC Torino United";
export const TEAM_ABBREVIATION = "TU";

// ── Formation Grids ────────────────────────────────────────────────────────
export const FORMATIONS = {
  "4-3-3": {
    label: "4-3-3",
    positions: [
      { slot: "GK",  x: 50, y: 8  },
      { slot: "LB",  x: 14, y: 26 },
      { slot: "CB1", x: 34, y: 24 },
      { slot: "CB2", x: 66, y: 24 },
      { slot: "RB",  x: 86, y: 26 },
      { slot: "LM",  x: 20, y: 48 },
      { slot: "CM",  x: 50, y: 44 },
      { slot: "RM",  x: 80, y: 48 },
      { slot: "LW",  x: 18, y: 70 },
      { slot: "ST",  x: 50, y: 76 },
      { slot: "RW",  x: 82, y: 70 },
    ],
  },
  "4-2-3-1": {
    label: "4-2-3-1",
    positions: [
      { slot: "GK",  x: 50, y: 8  },
      { slot: "LB",  x: 14, y: 26 },
      { slot: "CB1", x: 34, y: 24 },
      { slot: "CB2", x: 66, y: 24 },
      { slot: "RB",  x: 86, y: 26 },
      { slot: "CDM1",x: 35, y: 42 },
      { slot: "CDM2",x: 65, y: 42 },
      { slot: "LAM", x: 22, y: 60 },
      { slot: "CAM", x: 50, y: 58 },
      { slot: "RAM", x: 78, y: 60 },
      { slot: "ST",  x: 50, y: 76 },
    ],
  },
  "4-4-2": {
    label: "4-4-2",
    positions: [
      { slot: "GK",  x: 50, y: 8  },
      { slot: "LB",  x: 14, y: 26 },
      { slot: "CB1", x: 34, y: 24 },
      { slot: "CB2", x: 66, y: 24 },
      { slot: "RB",  x: 86, y: 26 },
      { slot: "LM",  x: 14, y: 50 },
      { slot: "CM1", x: 36, y: 48 },
      { slot: "CM2", x: 64, y: 48 },
      { slot: "RM",  x: 86, y: 50 },
      { slot: "ST1", x: 36, y: 74 },
      { slot: "ST2", x: 64, y: 74 },
    ],
  },
  "3-5-2": {
    label: "3-5-2",
    positions: [
      { slot: "GK",  x: 50, y: 8  },
      { slot: "CB1", x: 22, y: 24 },
      { slot: "CB2", x: 50, y: 22 },
      { slot: "CB3", x: 78, y: 24 },
      { slot: "LWB", x: 10, y: 46 },
      { slot: "LCM", x: 30, y: 48 },
      { slot: "CDM", x: 50, y: 44 },
      { slot: "RCM", x: 70, y: 48 },
      { slot: "RWB", x: 90, y: 46 },
      { slot: "ST1", x: 36, y: 74 },
      { slot: "ST2", x: 64, y: 74 },
    ],
  },
  "5-3-2": {
    label: "5-3-2",
    positions: [
      { slot: "GK",  x: 50, y: 8  },
      { slot: "LB",  x: 10, y: 30 },
      { slot: "CB1", x: 28, y: 24 },
      { slot: "CB2", x: 50, y: 22 },
      { slot: "CB3", x: 72, y: 24 },
      { slot: "RB",  x: 90, y: 30 },
      { slot: "LM",  x: 22, y: 52 },
      { slot: "CM",  x: 50, y: 50 },
      { slot: "RM",  x: 78, y: 52 },
      { slot: "ST1", x: 36, y: 74 },
      { slot: "ST2", x: 64, y: 74 },
    ],
  },
};

const heatmapZones = {
  GK:  [{ x: 45, y: 5, r: 14, intensity: 0.9 }, { x: 30, y: 12, r: 8, intensity: 0.4 }],
  CB:  [{ x: 40, y: 22, r: 16, intensity: 0.85 }, { x: 55, y: 18, r: 10, intensity: 0.5 }],
  LB:  [{ x: 12, y: 30, r: 14, intensity: 0.8 }, { x: 16, y: 52, r: 9, intensity: 0.55 }],
  RB:  [{ x: 88, y: 30, r: 14, intensity: 0.8 }, { x: 84, y: 52, r: 9, intensity: 0.55 }],
  CDM: [{ x: 48, y: 40, r: 18, intensity: 0.88 }, { x: 35, y: 34, r: 8, intensity: 0.4 }],
  CM:  [{ x: 50, y: 45, r: 16, intensity: 0.82 }, { x: 65, y: 38, r: 10, intensity: 0.5 }],
  LM:  [{ x: 18, y: 48, r: 16, intensity: 0.8 }, { x: 25, y: 66, r: 10, intensity: 0.55 }],
  RM:  [{ x: 82, y: 48, r: 16, intensity: 0.8 }, { x: 75, y: 66, r: 10, intensity: 0.55 }],
  LW:  [{ x: 16, y: 68, r: 14, intensity: 0.85 }, { x: 30, y: 75, r: 8, intensity: 0.5 }],
  RW:  [{ x: 84, y: 68, r: 14, intensity: 0.85 }, { x: 70, y: 75, r: 8, intensity: 0.5 }],
  CAM: [{ x: 50, y: 58, r: 16, intensity: 0.88 }, { x: 60, y: 70, r: 9, intensity: 0.5 }],
  ST:  [{ x: 50, y: 76, r: 14, intensity: 0.9 }, { x: 40, y: 68, r: 8, intensity: 0.45 }],
};

function mkZones(pos) {
  return heatmapZones[pos] || heatmapZones.CM;
}

function mkForm(trend) {
  const base = trend === "up"
    ? [6.5, 7.0, 7.2, 7.8, 8.1]
    : trend === "down"
    ? [8.2, 7.6, 7.0, 6.5, 6.0]
    : [7.1, 7.3, 6.9, 7.4, 7.2];
  return ["PSG", "Arsenal", "Milan", "Benfica", "City"].map((opp, i) => ({
    opponent: opp,
    rating: base[i],
    result: i % 3 === 0 ? "W" : i % 3 === 1 ? "D" : "L",
  }));
}

export const ALL_PLAYERS = [
  // ── Goalkeepers ──
  {
    id: "p01", name: "Kepa Arrizabalaga", initials: "KA", number: 1,
    position: "GK", age: 29, nationality: "Spanish", computedRating: 81,
    fitness: 92, stamina: 88, role: "starter",
    stats: { matches: 28, goals: 0, assists: 1, passAccuracy: 74, tackles: 0, interceptions: 2, saves: 82 },
    form: mkForm("up"), heatmapZones: mkZones("GK"),
    instructions: { pressIntensity: "low", stayBack: true, sweeper: true },
    notes: "Sweeper keeper. Excellent reflexes in 1v1 situations.",
    thumbnail: "https://i.pravatar.cc/150?u=p01",
  },
  {
    id: "p02", name: "Luis Varga", initials: "LV", number: 13,
    position: "GK", age: 24, nationality: "Spanish", computedRating: 75,
    fitness: 85, stamina: 82, role: "bench",
    stats: { matches: 6, goals: 0, assists: 0, passAccuracy: 61, tackles: 0, interceptions: 1, saves: 18 },
    form: mkForm("flat"), heatmapZones: mkZones("GK"),
    instructions: { pressIntensity: "low", stayBack: true, sweeper: false },
    notes: "Good reflexes, needs work on commanding the box.",
    thumbnail: "https://i.pravatar.cc/150?u=p02",
  },

  // ── Defenders ──
  {
    id: "p03", name: "Piero Hincapié", initials: "PH", number: 3,
    position: "CB", age: 22, nationality: "Ecuador", computedRating: 83,
    fitness: 95, stamina: 92, role: "starter",
    stats: { matches: 28, goals: 2, assists: 3, passAccuracy: 88, tackles: 74, interceptions: 52, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("CB"),
    instructions: { pressIntensity: "high", stayBack: true, markTightly: true },
    notes: "Versatile left-footed CB/LB. Outstanding tackling and ball recovery.",
    thumbnail: "https://i.pravatar.cc/150?u=p03",
  },
  {
    id: "p04", name: "Aleksandr Petrov", initials: "AP", number: 4,
    position: "CB", age: 27, nationality: "Russian", computedRating: 79,
    fitness: 78, stamina: 75, role: "starter",
    stats: { matches: 26, goals: 2, assists: 0, passAccuracy: 87, tackles: 68, interceptions: 42, saves: 0 },
    form: mkForm("flat"), heatmapZones: mkZones("CB"),
    instructions: { pressIntensity: "medium", stayBack: true, markTightly: true },
    notes: "Strong aerial presence. Needs to improve pace recovery.",
    thumbnail: null,
  },
  {
    id: "p05", name: "Yusuf Adebayo", initials: "YA", number: 12,
    position: "LB", age: 23, nationality: "Nigerian", computedRating: 80,
    fitness: 94, stamina: 91, role: "starter",
    stats: { matches: 27, goals: 1, assists: 6, passAccuracy: 83, tackles: 61, interceptions: 29, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("LB"),
    instructions: { pressIntensity: "high", overlap: true, stayBack: false },
    notes: "Outstanding overlapping runs. Key asset in wide attacks.",
    thumbnail: null,
  },
  {
    id: "p06", name: "Henrik Larsen", initials: "HL", number: 2,
    position: "RB", age: 26, nationality: "Danish", computedRating: 78,
    fitness: 88, stamina: 85, role: "starter",
    stats: { matches: 25, goals: 0, assists: 4, passAccuracy: 81, tackles: 58, interceptions: 31, saves: 0 },
    form: mkForm("flat"), heatmapZones: mkZones("RB"),
    instructions: { pressIntensity: "medium", overlap: true, stayBack: false },
    notes: "Reliable and disciplined. Good in 1v1 defending.",
    thumbnail: null,
  },
  {
    id: "p07", name: "Carlos Mendez", initials: "CM", number: 15,
    position: "CB", age: 22, nationality: "Colombian", computedRating: 76,
    fitness: 90, stamina: 88, role: "bench",
    stats: { matches: 8, goals: 0, assists: 0, passAccuracy: 85, tackles: 22, interceptions: 14, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("CB"),
    instructions: { pressIntensity: "medium", stayBack: true, markTightly: true },
    notes: "Promising youngster. Ready to step up when needed.",
    thumbnail: null,
  },

  // ── Midfielders ──
  {
    id: "p08", name: "Sandro Tonali", initials: "ST", number: 8,
    position: "CM", age: 24, nationality: "Italian", computedRating: 87,
    fitness: 96, stamina: 94, role: "starter",
    stats: { matches: 29, goals: 6, assists: 11, passAccuracy: 92, tackles: 65, interceptions: 38, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("CM"),
    instructions: { pressIntensity: "high", dribble: true, longShots: true },
    notes: "Elite box-to-box midfielder. World-class set-piece delivery and work rate.",
    thumbnail: "https://i.pravatar.cc/150?u=p08",
  },
  {
    id: "p09", name: "Takashi Mori", initials: "TM", number: 6,
    position: "CDM", age: 25, nationality: "Japanese", computedRating: 81,
    fitness: 91, stamina: 90, role: "starter",
    stats: { matches: 28, goals: 1, assists: 3, passAccuracy: 88, tackles: 78, interceptions: 55, saves: 0 },
    form: mkForm("flat"), heatmapZones: mkZones("CDM"),
    instructions: { pressIntensity: "high", stayBack: true, markTightly: true },
    notes: "Incredible work rate. The team's defensive shield.",
    thumbnail: null,
  },
  {
    id: "p10", name: "Jude Bellingham", initials: "JB", number: 5,
    position: "CAM", age: 21, nationality: "English", computedRating: 90,
    fitness: 94, stamina: 92, role: "starter",
    stats: { matches: 29, goals: 18, assists: 12, passAccuracy: 89, tackles: 48, interceptions: 28, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("CAM"),
    instructions: { pressIntensity: "high", dribble: true, longShots: true, stayForward: true },
    notes: "Generational midfielder. Arrives late in box with lethal finishing.",
    thumbnail: "https://i.pravatar.cc/150?u=p10",
  },
  {
    id: "p11", name: "James O'Brien", initials: "JO", number: 14,
    position: "CM", age: 31, nationality: "Irish", computedRating: 75,
    fitness: 70, stamina: 66, role: "bench",
    stats: { matches: 18, goals: 3, assists: 5, passAccuracy: 84, tackles: 35, interceptions: 18, saves: 0 },
    form: mkForm("down"), heatmapZones: mkZones("CM"),
    instructions: { pressIntensity: "medium", longShots: true, dribble: false },
    notes: "Experienced, use carefully due to age. Good from set pieces.",
    thumbnail: null,
  },
  {
    id: "p12", name: "Kwame Asante", initials: "KA", number: 16,
    position: "CDM", age: 21, nationality: "Ghanaian", computedRating: 74,
    fitness: 96, stamina: 94, role: "bench",
    stats: { matches: 5, goals: 0, assists: 1, passAccuracy: 79, tackles: 14, interceptions: 9, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("CDM"),
    instructions: { pressIntensity: "high", stayBack: true, markTightly: false },
    notes: "Raw talent. High ceiling — integrate gradually.",
    thumbnail: null,
  },

  // ── Forwards ──
  {
    id: "p13", name: "Erling Haaland", initials: "EH", number: 9,
    position: "ST", age: 24, nationality: "Norwegian", computedRating: 91,
    fitness: 95, stamina: 92, role: "starter",
    stats: { matches: 30, goals: 32, assists: 8, passAccuracy: 76, tackles: 14, interceptions: 6, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("ST"),
    instructions: { pressIntensity: "high", stayForward: true, cutInside: false, longShots: true },
    notes: "Lethal goal machine. Exceptional physical strength and aerial power.",
    thumbnail: "https://i.pravatar.cc/150?u=p13",
  },
  {
    id: "p14", name: "Bukayo Saka", initials: "BS", number: 7,
    position: "RW", age: 22, nationality: "English", computedRating: 88,
    fitness: 93, stamina: 91, role: "starter",
    stats: { matches: 28, goals: 15, assists: 14, passAccuracy: 84, tackles: 32, interceptions: 16, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("RW"),
    instructions: { pressIntensity: "high", cutInside: true, overlap: true, dribble: true },
    notes: "Top wide playmaker. World class 1v1 dribbler and creator.",
    thumbnail: "https://i.pravatar.cc/150?u=p14",
  },
  {
    id: "p15", name: "Kylian Mbappé", initials: "KM", number: 10,
    position: "LW", age: 25, nationality: "French", computedRating: 91,
    fitness: 96, stamina: 94, role: "starter",
    stats: { matches: 29, goals: 28, assists: 10, passAccuracy: 82, tackles: 12, interceptions: 5, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("LW"),
    instructions: { pressIntensity: "high", cutInside: true, stayForward: true, dribble: true },
    notes: "Unmatched acceleration and counter-attacking threat.",
    thumbnail: "https://i.pravatar.cc/150?u=p15",
  },
  {
    id: "p16", name: "Finn Andersen", initials: "FA", number: 18,
    position: "ST", age: 22, nationality: "Norwegian", computedRating: 78,
    fitness: 87, stamina: 84, role: "bench",
    stats: { matches: 14, goals: 7, assists: 3, passAccuracy: 71, tackles: 8, interceptions: 3, saves: 0 },
    form: mkForm("flat"), heatmapZones: mkZones("ST"),
    instructions: { pressIntensity: "high", stayForward: true, longShots: true },
    notes: "Super-sub impact player. Very direct approach.",
    thumbnail: null,
  },
  {
    id: "p17", name: "Arjan Krasniqi", initials: "AK", number: 19,
    position: "LW", age: 20, nationality: "Albanian", computedRating: 74,
    fitness: 95, stamina: 93, role: "bench",
    stats: { matches: 7, goals: 2, assists: 1, passAccuracy: 75, tackles: 10, interceptions: 4, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("LW"),
    instructions: { pressIntensity: "high", cutInside: true, dribble: true },
    notes: "Academy standout. Ready for bigger minutes.",
    thumbnail: null,
  },

  // ── Extra bench / reserves ──
  {
    id: "p18", name: "Pedro Lima", initials: "PL", number: 20,
    position: "RB", age: 25, nationality: "Portuguese", computedRating: 76,
    fitness: 80, stamina: 78, role: "bench",
    stats: { matches: 10, goals: 0, assists: 2, passAccuracy: 79, tackles: 27, interceptions: 15, saves: 0 },
    form: mkForm("flat"), heatmapZones: mkZones("RB"),
    instructions: { pressIntensity: "medium", overlap: false, stayBack: true },
    notes: "Solid backup. Versatile — can play CM in emergency.",
    thumbnail: null,
  },
  {
    id: "p19", name: "Tobias Werner", initials: "TW", number: 22,
    position: "CB", age: 28, nationality: "Austrian", computedRating: 73,
    fitness: 45, stamina: 40, role: "injured",
    stats: { matches: 9, goals: 0, assists: 0, passAccuracy: 83, tackles: 20, interceptions: 12, saves: 0 },
    form: mkForm("down"), heatmapZones: mkZones("CB"),
    instructions: { pressIntensity: "low", stayBack: true, markTightly: false },
    notes: "⚠️ Injured — knee ligament. Expected return in 3 weeks.",
    thumbnail: null,
  },
  {
    id: "p20", name: "Omar Farouk", initials: "OF", number: 23,
    position: "CM", age: 21, nationality: "Moroccan", computedRating: 73,
    fitness: 88, stamina: 86, role: "bench",
    stats: { matches: 4, goals: 1, assists: 0, passAccuracy: 82, tackles: 10, interceptions: 6, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("CM"),
    instructions: { pressIntensity: "medium", dribble: true, longShots: false },
    notes: "Technical midfielder. Needs match experience.",
    thumbnail: null,
  },
  {
    id: "p21", name: "Viktor Sokolov", initials: "VS", number: 17,
    position: "LB", age: 24, nationality: "Ukrainian", computedRating: 75,
    fitness: 82, stamina: 79, role: "bench",
    stats: { matches: 9, goals: 0, assists: 3, passAccuracy: 77, tackles: 24, interceptions: 16, saves: 0 },
    form: mkForm("flat"), heatmapZones: mkZones("LB"),
    instructions: { pressIntensity: "medium", overlap: true, stayBack: false },
    notes: "Understudy to Adebayo. Good going forward.",
    thumbnail: null,
  },
  {
    id: "p22", name: "George Papadopoulos", initials: "GP", number: 21,
    position: "GK", age: 35, nationality: "Greek", computedRating: 70,
    fitness: 72, stamina: 68, role: "bench",
    stats: { matches: 2, goals: 0, assists: 0, passAccuracy: 55, tackles: 0, interceptions: 0, saves: 5 },
    form: mkForm("flat"), heatmapZones: mkZones("GK"),
    instructions: { pressIntensity: "low", stayBack: true, sweeper: false },
    notes: "Veteran third-choice GK. Good mentor for younger keepers.",
    thumbnail: null,
  },
  {
    id: "p23", name: "Emmanuel Okafor", initials: "EO", number: 25,
    position: "CAM", age: 19, nationality: "Nigerian", computedRating: 72,
    fitness: 97, stamina: 95, role: "bench",
    stats: { matches: 2, goals: 0, assists: 0, passAccuracy: 72, tackles: 4, interceptions: 2, saves: 0 },
    form: mkForm("up"), heatmapZones: mkZones("CAM"),
    instructions: { pressIntensity: "high", dribble: true, longShots: false },
    notes: "Youth prodigy. Incredible with ball. Needs tactical discipline.",
    thumbnail: null,
  },
  // Coaches visible in bench
  {
    id: "coach01", name: "Marco Bianchi", initials: "MB", number: null,
    position: "HEAD COACH", age: 52, nationality: "Italian", computedRating: "MGR",
    fitness: null, stamina: null, role: "coach",
    stats: null, form: null, heatmapZones: null,
    instructions: {}, notes: "Former Serie A champion. Known for high-press systems.",
    thumbnail: null,
  },
  {
    id: "coach02", name: "Sarah Mitchell", initials: "SM", number: null,
    position: "ASST. COACH", age: 38, nationality: "English", computedRating: "MGR",
    fitness: null, stamina: null, role: "coach",
    stats: null, form: null, heatmapZones: null,
    instructions: {}, notes: "Specialist in set-piece design and defensive shape.",
    thumbnail: null,
  },
];

export const DEFAULT_LINEUP = {
  formation: "4-3-3",
  slots: {
    0: "p01", // GK (Kepa)
    1: "p05", // LB (Adebayo)
    2: "p03", // CB1 (Piero Hincapié)
    3: "p04", // CB2 (Petrov)
    4: "p06", // RB (Larsen)
    5: "p08", // LM (Tonali)
    6: "p09", // CM (Mori)
    7: "p10", // RM (Bellingham)
    8: "p15", // LW (Mbappé)
    9: "p13", // ST (Haaland)
    10: "p14", // RW (Saka)
  },
};

export const INITIAL_TACTICS = [
  {
    id: "t01",
    name: "High Press",
    formation: "4-3-3",
    description: "Aggressive press from the front, winners steal possession high.",
    color: "#3ddc84",
    createdAt: "2025-01-10",
    slots: DEFAULT_LINEUP.slots,
  },
  {
    id: "t02",
    name: "Park the Bus",
    formation: "5-3-2",
    description: "Deep defensive block, hit on the counter with pace.",
    color: "#4f8ff7",
    createdAt: "2025-02-14",
    slots: { 0: "p01", 1: "p05", 2: "p03", 3: "p04", 4: "p06", 5: "p21" },
  },
  {
    id: "t03",
    name: "Tiki Taka",
    formation: "4-2-3-1",
    description: "Short passing sequences to dominate possession in midfield.",
    color: "#d9b45f",
    createdAt: "2025-03-05",
    slots: DEFAULT_LINEUP.slots,
  },
];

export const UPCOMING_MATCHES = [
  { id: "m01", opponent: "FC Juventus",   date: "2026-07-27", venue: "Home", competition: "Serie A", savedLineup: null },
  { id: "m02", opponent: "AC Milan",      date: "2026-08-03", venue: "Away", competition: "Serie A", savedLineup: null },
  { id: "m03", opponent: "Napoli FC",     date: "2026-08-10", venue: "Home", competition: "Coppa",   savedLineup: null },
  { id: "m04", opponent: "AS Roma",       date: "2026-08-17", venue: "Away", competition: "Serie A", savedLineup: null },
  { id: "m05", opponent: "Lazio",         date: "2026-08-24", venue: "Home", competition: "Serie A", savedLineup: null },
];

export const TEAM_STATS = {
  possession: 58,
  shotsPerGame: 14.3,
  shotsOnTarget: 6.1,
  passAccuracy: 86,
  corners: 5.8,
  fouls: 11.2,
  yellowCards: 1.4,
  cleanSheets: 9,
  goalsScored: 51,
  goalsConceded: 28,
  wins: 18, draws: 6, losses: 4,
  passMap: [
    { from: { x: 50, y: 8 },  to: { x: 34, y: 24 }, weight: 0.9 },
    { from: { x: 50, y: 8 },  to: { x: 66, y: 24 }, weight: 0.85 },
    { from: { x: 34, y: 24 }, to: { x: 50, y: 44 }, weight: 0.75 },
    { from: { x: 66, y: 24 }, to: { x: 50, y: 44 }, weight: 0.7 },
    { from: { x: 50, y: 44 }, to: { x: 50, y: 76 }, weight: 0.65 },
    { from: { x: 14, y: 26 }, to: { x: 20, y: 48 }, weight: 0.8 },
    { from: { x: 86, y: 26 }, to: { x: 80, y: 48 }, weight: 0.78 },
    { from: { x: 20, y: 48 }, to: { x: 18, y: 70 }, weight: 0.72 },
    { from: { x: 80, y: 48 }, to: { x: 82, y: 70 }, weight: 0.74 },
    { from: { x: 50, y: 44 }, to: { x: 18, y: 70 }, weight: 0.55 },
    { from: { x: 50, y: 44 }, to: { x: 82, y: 70 }, weight: 0.52 },
  ],
  shotMap: [
    { x: 48, y: 78, onTarget: true },
    { x: 52, y: 74, onTarget: true },
    { x: 60, y: 72, onTarget: false },
    { x: 38, y: 76, onTarget: true },
    { x: 30, y: 68, onTarget: false },
    { x: 70, y: 68, onTarget: false },
    { x: 55, y: 80, onTarget: true },
    { x: 45, y: 82, onTarget: false },
    { x: 52, y: 70, onTarget: true },
    { x: 48, y: 85, onTarget: false },
  ],
};
