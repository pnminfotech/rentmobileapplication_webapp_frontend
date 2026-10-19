// // // Hard-coded backend origin (no .env needed)
// // const ORIGIN = "http://mutakehostel-backend.onrender.com";
// // export const API = `${ORIGIN}/api`;

// // export function setToken(t){ localStorage.setItem("tenantToken", t); }
// // export function getToken(){ return localStorage.getItem("tenantToken"); }
// // export function clearToken(){ localStorage.removeItem("tenantToken"); }
// // export function authHeader(){
// //   const t = getToken();
// //   return t ? { Authorization: `Bearer ${t}` } : {};
// // }



// // src/tenant/tenantApi.js
// import axios from "axios";

// export const TOKEN_KEY = "tenantToken";

// // ✅ always HTTPS
// const ORIGIN = "    https://rentmobile-api.pnminfotech.com/";
// export const API = `${ORIGIN}/api`;

// export function setToken(t){ localStorage.setItem(TOKEN_KEY, t); }
// export function getToken(){ return localStorage.getItem(TOKEN_KEY); }
// export function clearToken(){ localStorage.removeItem(TOKEN_KEY); }
// export function authHeader(){
//   const t = getToken();
//   return t ? { Authorization: `Bearer ${t}` } : {};
// }

// // ✅ one axios instance for ALL tenant calls
// export const tenantHttp = axios.create({
//   baseURL: API,
//   withCredentials: false,
// });

// // attach bearer token automatically
// tenantHttp.interceptors.request.use((cfg) => {
//   const t = getToken();
//   if (t) cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${t}` };
//   return cfg;
// });



// // ---------- LEAVE REQUESTS ----------
// export async function createLeave({ date, reason }) {
//   const { data } = await tenantHttp.post(`/tenant/leaves`, { date, reason });
//   return data;
// }
// export async function listLeaves() {
//   const { data } = await tenantHttp.get(`/tenant/leaves`);
//   return data;
// }






// src/tenant/tenantApi.js
import axios from "axios";
import { API_BASE, API_ORIGIN } from "../api";

export const TOKEN_KEY = "tenantToken";

// Switch this between local and deployed as you need.
const ORIGIN =
  process.env.REACT_APP_API_ORIGIN ||
  API_ORIGIN;

export const API = API_BASE || `${String(ORIGIN).trim().replace(/\/+$/, "")}/api`;

export function setToken(t){ localStorage.setItem(TOKEN_KEY, t); }
export function getToken(){ return localStorage.getItem(TOKEN_KEY); }
export function clearToken(){ localStorage.removeItem(TOKEN_KEY); }
export function authHeader(){
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Single axios instance for tenant calls
export const tenantHttp = axios.create({
  baseURL: API,
  withCredentials: false,
});

// Attach bearer token automatically
tenantHttp.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${t}` };
  return cfg;
});

/* -------------------- LEAVE REQUESTS -------------------- */

// CREATE leave (backend expects leaveDate (+ optional note))
export async function createLeave({ date, reason }) {
  const { data } = await tenantHttp.post(`/tenant/leaves`, { date, reason });
  return data;
}

// LIST leaves (normalize possible field names from backend)
// LIST leaves (normalize server fields -> UI fields)
// export async function listLeaves() {
//   const { data } = await tenantHttp.get(`/tenant/leaves`);
//   const arr = Array.isArray(data) ? data : [];
//   return arr.map((x) => ({
//     _id: x._id,
//     // server might return either 'leaveDate' or 'date'
//     date: x.leaveDate || x.date || null,
//     // likewise for created timestamp
//     createdAt: x.requestedAt || x.createdAt || null,
//     status: x.status || "pending",
//     // normalize note/reason
//     reason: x.note ?? x.reason ?? "",
//   }));
// }


// src/tenant/tenantApi.js
export async function listLeaves() {
  const { data } = await tenantHttp.get(`/tenant/leaves`);
  const arr = Array.isArray(data) ? data : [];
  // keep what the server sends, add normalized keys used by UI
  return arr.map(d => ({
    ...d,                                  // keeps leaveDate, note, createdAt, status
    date: d.leaveDate || d.date || null,   // UI-friendly 'date'
    createdAt: d.createdAt || d.requestedAt || null,
    reason: d.note ?? d.reason ?? "",      // UI-friendly 'reason'
  }));
}
