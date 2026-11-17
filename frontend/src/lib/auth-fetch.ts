"use client";

/** All private API requests share the same expired-session behavior. */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, { ...init, credentials: "include" });
  if (response.status === 401) {
    window.location.replace("/login");
    throw new Error("La sesión ha expirado. Inicia sesión de nuevo.");
  }
  // Invalidate visible summaries only after successful business operations.
  // Session cookies and the existing 401 behavior remain unchanged.
  if (response.ok && /^(POST|PATCH|PUT|DELETE)$/i.test(init?.method ?? "GET")
    && /\/(users|memberships|payments)(\/|\?|$)/.test(String(input))) {
    window.dispatchEvent(new Event("fitzone:data-changed"));
  }
  return response;
}
