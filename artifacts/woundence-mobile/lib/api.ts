import Constants from "expo-constants";

/**
 * Base URL for the Woundence API server. On device/simulator the Expo bundle
 * talks to the API server directly (no proxy), so the domain must be
 * explicit. Injected at dev time via EXPO_PUBLIC_DOMAIN (see package.json).
 */
export function getApiBaseUrl(): string {
  const domain =
    process.env.EXPO_PUBLIC_DOMAIN ??
    (Constants.expoConfig?.extra as { domain?: string } | undefined)?.domain;
  if (!domain) {
    throw new Error(
      "EXPO_PUBLIC_DOMAIN is not set. The mobile app cannot reach the Woundence API server."
    );
  }
  return `https://${domain}/api`;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * There is no browser cookie jar on native, so the Clerk session token must
 * be attached explicitly as a Bearer token. This getter is wired up once
 * Clerk is loaded (see app/_layout.tsx), reading the token via Clerk's
 * `useAuth().getToken()`.
 */
type AuthTokenGetter = () => Promise<string | null>;
let authTokenGetter: AuthTokenGetter | null = null;

export function setAuthTokenGetter(getter: AuthTokenGetter): void {
  authTokenGetter = getter;
}

/**
 * Thin fetch wrapper for the Woundence API. Auth is a Clerk session token
 * attached as a Bearer header (see setAuthTokenGetter above) — there is no
 * cookie jar on native.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const token = authTokenGetter ? await authTokenGetter() : null;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data?.message ?? message;
    } catch {
      // ignore parse errors, fall back to statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiImageUrl(fileId: string): string {
  return `${getApiBaseUrl()}/files/${fileId}/image`;
}

// ---------------------------------------------------------------------------
// Domain types (mirrors artifacts/woundence/src/types/schema.ts, trimmed to
// the fields the mobile app renders)
// ---------------------------------------------------------------------------

export type AuthUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role?: string | null;
};

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
};

export type Wound = {
  id: string;
  patientId: string;
  location: string;
  woundType?: string | null;
  status?: string | null;
};

export type WoundAssessment = {
  id: string;
  woundId?: string | null;
  patientId?: string | null;
  assessmentDate?: string | null;
  length?: string | number | null;
  width?: string | number | null;
  depth?: string | number | null;
  tissueType?: string | null;
  exudateAmount?: string | null;
  exudateOdor?: string | null;
  painScore?: number | null;
  notes?: string | null;
};

export type WoundenceFile = {
  id: string;
  patientId?: string | null;
  assessmentId?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  createdAt?: string | null;
};

export type DashboardStats = {
  totalPatients?: number;
  todayAppointments?: number;
  activeWounds?: number;
  pendingAssessments?: number;
};

export function getPatients(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<Patient[]>(`/patients${qs}`);
}

export function getPatient(id: string) {
  return apiFetch<Patient>(`/patients/${id}`);
}

export function getWoundsForPatient(patientId: string) {
  return apiFetch<Wound[]>(`/wounds/patient/${patientId}`);
}

export function getAssessmentsForPatient(patientId: string) {
  return apiFetch<WoundAssessment[]>(`/wound-assessments/patient/${patientId}`);
}

export function getFilesForAssessment(assessmentId: string) {
  return apiFetch<WoundenceFile[]>(`/wound-assessments/${assessmentId}/files`);
}

export function getFilesForPatient(patientId: string) {
  return apiFetch<WoundenceFile[]>(`/files/patient/${patientId}`);
}

export function getDashboardStats() {
  return apiFetch<DashboardStats>(`/dashboard/stats`);
}
