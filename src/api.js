import axios from "axios";
import { hasRecentUserActivity } from "./userActivity";
import { clearAuthSession } from "./authStorage";

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
]);

const DEFAULT_LOCAL_API_BASE = "http://localhost:8000/api";
function getDefaultApiBase() {
  if (
    typeof window !== "undefined" &&
    LOCAL_HOSTS.has(window.location.hostname)
  ) {
    return DEFAULT_LOCAL_API_BASE;
  }

  // Production uses the API hosted at the domain root. This keeps the web
  // application working when it is served from a subfolder such as
  // /rentmanagementsoftware.
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  return "/api";
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

// Some older, still-routable screens use absolute localhost API URLs directly.
// Redirect only those legacy API requests through the configured API base so a
// production build works without a local server running on the visitor's device.
function rewriteLegacyLocalApiUrl(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::8000)?\/api(?=\/|$)(.*)$/i);
  return match ? `${API_BASE}${match[1] || ""}` : value;
}

axios.interceptors.request.use((config) => {
  if (typeof config?.url === "string") {
    config.url = rewriteLegacyLocalApiUrl(config.url);
  }
  return config;
});

if (typeof window !== "undefined" && !window.__rentManagerFetchApiRewrite) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string") {
      return nativeFetch(rewriteLegacyLocalApiUrl(input), init);
    }
    if (input instanceof URL) {
      return nativeFetch(rewriteLegacyLocalApiUrl(input.toString()), init);
    }
    return nativeFetch(input, init);
  };
  window.__rentManagerFetchApiRewrite = true;
}

let redirectingToLogin = false;

function getLoginPath() {
  const publicUrl = String(process.env.PUBLIC_URL || "").trim();
  let basePath = "";

  if (publicUrl) {
    try {
      basePath = new URL(publicUrl, window.location.origin).pathname.replace(/\/+$/, "");
    } catch (_error) {
      basePath = publicUrl.startsWith("/") ? publicUrl.replace(/\/+$/, "") : "";
    }
  }

  return `${basePath}/login`;
}

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

    if (hasRecentUserActivity()) {
      config.headers["X-User-Activity"] = "true";
    } else {
      delete config.headers["X-User-Activity"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestPath = String(error.config?.url || "");
    const isLoginRequest = /\/saas\/auth\/login(?:\/|\?|$)/.test(requestPath);
    const hadAuthToken = Boolean(error.config?.headers?.Authorization);

    if (error.response?.status === 401 && hadAuthToken && !isLoginRequest) {
      clearAuthSession();
      const loginPath = getLoginPath();
      if (!redirectingToLogin && window.location.pathname !== loginPath) {
        redirectingToLogin = true;
        window.location.replace(loginPath);
      }
    }
    return Promise.reject(error);
  }
);
