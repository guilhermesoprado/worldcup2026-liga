import { cookies } from "next/headers";
import { getAdminEnv, getOptionalAdminEnv } from "@/types/env";

const ADMIN_SESSION_COOKIE = "admin_session";
const isSecureCookie = process.env.NODE_ENV === "production";

export async function readAdminSession() {
  const store = await cookies();
  return store.get(ADMIN_SESSION_COOKIE)?.value ?? null;
}

export async function createAdminSession(email: string) {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, email, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    path: "/"
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export function validateAdminCredentials(email: string, password: string) {
  const env = getAdminEnv();
  return email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD;
}

export function hasAdminCredentialsConfigured() {
  return Boolean(getOptionalAdminEnv());
}
