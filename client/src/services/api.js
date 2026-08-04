import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 12000 });

// Leagues / Teams
export const getLeagues = () => api.get("/leagues").then((r) => r.data);
export const getTeams = (league) => api.get("/teams", { params: { league } }).then((r) => r.data);

// Dataset bootstrap
export const getDatasetStatus = () => api.get("/admin/status").then((r) => r.data);
export const startDatasetLoad = () => api.post("/admin/seed-kaggle").then((r) => r.data);

// Players
export const getPlayersByTeam = (teamId) => api.get("/players", { params: { teamId } }).then((r) => r.data);
export const searchPlayers = (q, opts = {}) =>
  api.get("/players/search", { params: { q, ...opts } }).then((r) => r.data);
export const getSquad = (teamId, formation) =>
  api.get(`/teams/${teamId}/squad`, { params: { formation } }).then((r) => r.data);
export const suggestTactics = (formation, players) =>
  api.post("/tactics/suggest", { formation, players }).then((r) => r.data);
export const getPlayer = (id) => api.get(`/players/${id}`).then((r) => r.data);
export const updatePlayer = (id, data) => api.put(`/players/${id}`, data).then((r) => r.data);
export const updatePlayerNotes = (id, notes) => api.put(`/players/${id}/notes`, { notes }).then((r) => r.data);
export const updatePlayerInstructions = (id, instructions) => api.put(`/players/${id}/instructions`, { instructions }).then((r) => r.data);
export const getPlayerInsights = (id) => api.get(`/players/${id}/insights`).then((r) => r.data);
export const getSimilarPlayers = (id, poolTeamId, k = 5) =>
  api.get(`/players/${id}/similar`, { params: { poolTeamId, k } }).then((r) => r.data);

export const getHealth = () => api.get("/health").then((r) => r.data);

// Auth
export const loginUser = (email, password) => api.post("/auth/login", { email, password }).then((r) => r.data);
export const registerUser = (email, password, role) => api.post("/auth/register", { email, password, role }).then((r) => r.data);
export const getMe = () => api.get("/auth/me").then((r) => r.data);
export const updatePrefs = (preferences) => api.put("/auth/preferences", { preferences }).then((r) => r.data);

// Formations
export const getFormations = () => api.get("/formations").then((r) => r.data);

// Tactical boards
export const getBoards = () => api.get("/boards").then((r) => r.data);
export const getBoard = (id) => api.get(`/boards/${id}`).then((r) => r.data);
export const createBoard = (board) => api.post("/boards", board).then((r) => r.data);
export const updateBoard = (id, board) => api.put(`/boards/${id}`, board).then((r) => r.data);
export const deleteBoard = (id) => api.delete(`/boards/${id}`).then((r) => r.data);

// Team stats & analytics
export const getLeaderboards = (teamId) => api.get(`/teams/${teamId}/leaderboards`).then((r) => r.data);
export const getTeamMatches = (teamId) => api.get(`/teams/${teamId}/matches`).then((r) => r.data);
export const getPassingNetwork = (matchId) => api.get(`/matches/${matchId}/passing-network`).then((r) => r.data);
export const getHeatmap = (matchId) => api.get(`/matches/${matchId}/heatmap`).then((r) => r.data);
export const getShotMap = (matchId) => api.get(`/matches/${matchId}/shot-map`).then((r) => r.data);

// Watchlist
export const getWatchlist = () => api.get("/watchlist").then((r) => r.data);
export const addToWatchlist = (playerId, note) => api.post("/watchlist", { playerId, note }).then((r) => r.data);
export const removeFromWatchlist = (playerId) => api.delete(`/watchlist/${playerId}`).then((r) => r.data);

export default api;
