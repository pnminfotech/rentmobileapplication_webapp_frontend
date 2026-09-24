const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

export function saveAuthSession({
  token,
  user,
}) {
  localStorage.setItem(TOKEN_KEY, token);

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user || null)
  );
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthUser() {
  const raw =
    localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}