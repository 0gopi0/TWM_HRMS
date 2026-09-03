let accessToken = null;
let onSaved = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function setOnSaved(fn) {
  onSaved = fn;
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res = await fetch(path, { ...options, headers, credentials: "include" });
  if (res.status === 401 && !path.includes("/auth/")) {
    const refreshed = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const data = await refreshed.json();
      accessToken = data.accessToken;
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(path, { ...options, headers, credentials: "include" });
    }
  }
  if (res.status === 204) return null;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const err = new Error(res.ok ? "Server returned HTML instead of API response" : "Request failed");
    err.status = res.status;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  const method = (options.method || "GET").toUpperCase();
  if (onSaved && !path.includes("/auth/") && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    onSaved("Saved");
  }
  return data;
}
