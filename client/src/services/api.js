import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 12000 });

export const getLeagues = () => api.get("/leagues").then((r) => r.data);

export const getTeams = (league) => api.get("/teams", { params: { league } }).then((r) => r.data);

export const getPlayersByTeam = (teamId) =>
  api.get("/players", { params: { teamId } }).then((r) => r.data);

export const searchPlayers = (q) => api.get("/players/search", { params: { q } }).then((r) => r.data);

export const getPlayer = (id) => api.get(`/players/${id}`).then((r) => r.data);

export const getPlayerInsights = (id) => api.get(`/players/${id}/insights`).then((r) => r.data);

export const getSimilarPlayers = (id, poolTeamId, k = 5) =>
  api.get(`/players/${id}/similar`, { params: { poolTeamId, k } }).then((r) => r.data);

export const getHealth = () => api.get("/health").then((r) => r.data);

export default api;
