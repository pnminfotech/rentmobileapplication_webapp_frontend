import axios from "axios";

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
]);

const DEFAULT_LOCAL_API_BASE = "http://localhost:8000/api";
const DEFAULT_PROD_API_BASE = "http://localhost:8000/api";

function getDefaultApiBase() {
  if (
    typeof window !== "undefined" &&
    LOCAL_HOSTS.has(window.location.hostname)
  ) {
    return DEFAULT_LOCAL_API_BASE;
  }

  return DEFAULT_PROD_API_BASE;
}

function normalizeApiBase(rawValue) {
  const raw = String(rawValue || "").trim();

  if (!raw) {
    return getDefaultApiBase();
  }

  const withoutTrailingSlash = raw.replace(/\/+$/, "");

  if (/\/api$/i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}/api`;
}

export const API_BASE = normalizeApiBase(
  process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_API_URL ||
    getDefaultApiBase()
);

export const API_ORIGIN = API_BASE.replace(/\/api$/, "");

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "X-Platform": "web",
    "X-App-Version": "1.0.0",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");

    // Important for document/image uploads.
    // Browser must automatically generate multipart boundary.
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);