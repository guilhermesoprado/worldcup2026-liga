import { z } from "zod";

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
});

const adminEnvSchema = z.object({
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8)
});

const cartolaEnvSchema = z.object({
  CARTOLA_AUTH_TOKEN: z.string().min(1),
  CARTOLA_X_GLB_TAG: z.string().min(1),
  CARTOLA_X_GLB_APP: z.string().min(1),
  CARTOLA_X_GLB_AUTH: z.string().min(1),
  CARTOLA_LEAGUE_SLUG: z.string().min(1)
});

const envSchema = supabaseEnvSchema.merge(adminEnvSchema).merge(cartolaEnvSchema);

export type AppEnv = z.infer<typeof envSchema>;
export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;
export type AdminEnv = z.infer<typeof adminEnvSchema>;
export type CartolaEnv = z.infer<typeof cartolaEnvSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse(process.env);
}

export function getOptionalEnv() {
  const parsed = envSchema.safeParse(process.env);
  return parsed.success ? parsed.data : null;
}

export function getSupabaseEnv(): SupabaseEnv {
  return supabaseEnvSchema.parse(process.env);
}

export function getOptionalSupabaseEnv() {
  const parsed = supabaseEnvSchema.safeParse(process.env);
  return parsed.success ? parsed.data : null;
}

export function getAdminEnv(): AdminEnv {
  return adminEnvSchema.parse(process.env);
}

export function getOptionalAdminEnv() {
  const parsed = adminEnvSchema.safeParse(process.env);
  return parsed.success ? parsed.data : null;
}

export function getCartolaEnv(): CartolaEnv {
  return cartolaEnvSchema.parse(process.env);
}

export function getOptionalCartolaEnv() {
  const parsed = cartolaEnvSchema.safeParse(process.env);
  return parsed.success ? parsed.data : null;
}
