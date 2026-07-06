import Constants from "expo-constants";

/**
 * Base URL for the Woundence API server. On device/simulator the Expo bundle
 * talks to the API server directly (no proxy), so the domain must be
 * explicit. Injected at dev time via EXPO_PUBLIC_DOMAIN (see package.json).
 * Protocol defaults to https (Replit terminates TLS at its proxy) but can be
 * overridden to http for local dev, where the API server has no TLS cert.
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
  const protocol = process.env.EXPO_PUBLIC_API_PROTOCOL ?? "https";
  return `${protocol}://${domain}/api`;
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
  imageUrl?: string | null;
  // Full AI analysis blob (see WoundAnalysisResult below) — present on
  // assessments created via the AI capture flow, null for legacy/manual ones.
  aiAnalysis?: WoundAnalysisResult | null;
};

// ---------------------------------------------------------------------------
// AI wound analysis (mirrors WoundAnalysisResult in lib/db/src/schema/woundence.ts)
// ---------------------------------------------------------------------------

export type WoundAnalysisResult = {
  area: number;
  perimeter: number;
  longestDiameter: number;
  width: number;
  depth?: number | null;
  volume?: number | null;
  undermining: boolean;
  underminingLocation?: string | null;
  underminingDepth?: number | null;
  tunneling: boolean;
  tunnelingLocation?: string | null;
  tunnelingDepth?: number | null;
  woundType: string;
  woundTypeConfidence: number;
  bodyLocation?: string | null;
  woundClassification: string;
  pressureInjuryStage?: string | null;
  wagnerGrade?: number | null;
  coapClassification?: string | null;
  tissueComposition: {
    granulation: number;
    slough: number;
    necrotic: number;
    epithelial?: number | null;
    fibrin?: number | null;
  };
  exudate: {
    amount: string;
    type: string;
    odor: string;
  };
  periwoundSkin: {
    condition: string;
    edema: boolean;
    erythema: boolean;
    warmth: boolean;
    induration: boolean;
  };
  pain: {
    present: boolean;
    level?: number | null;
    character?: string | null;
  };
  infectionSigns: string[];
  healingStage: 1 | 2 | 3 | 4;
  dressingRecommendation: {
    primary: string;
    secondary: string;
    changeFrequency: string;
  };
  treatmentPlan: {
    cleansingAgent: string;
    debridementType: string;
    infectionManagement: string;
    adjunctTherapy: string;
  };
  recommendations: string[];
  nextReviewDate?: string | null;
};

export type WoundAnalyzeResponse = {
  analysis: WoundAnalysisResult;
  imageMetadata: { width: number; height: number; format: string; size: number };
  imagePath: string;
};

export type WoundenceFile = {
  id: string;
  patientId?: string | null;
  assessmentId?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  createdAt?: string | null;
};

// Field names mirror the actual /api/dashboard/stats response
// (see woundenceStorage.getDashboardStats) — not to be guessed at,
// this previously drifted from reality and silently always read as 0.
export type DashboardStats = {
  activePatients?: number;
  todayAppointments?: number;
  totalWounds?: number;
  healingRate?: number;
};

export type Provider = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
};

export type AppointmentStatus =
  | "scheduled"
  | "arrived"
  | "in_room"
  | "completed"
  | "cancelled"
  | "no_show";

export type Appointment = {
  id: string;
  patientId: string;
  providerId: string;
  appointmentDate: string;
  duration?: number | null;
  room?: string | null;
  appointmentType: string;
  status: AppointmentStatus;
  bookingSource?: string | null;
  notes?: string | null;
  patient: Patient;
  provider: Provider;
};

export function getPatients(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<Patient[]>(`/patients${qs}`);
}

export function getProviders() {
  return apiFetch<Provider[]>(`/providers`);
}

// yyyy-MM-dd, matching what the API's date-only filter expects.
export function getAppointments(date: string, providerId?: string) {
  const params = new URLSearchParams({ date });
  if (providerId) params.set("providerId", providerId);
  return apiFetch<Appointment[]>(`/appointments?${params.toString()}`);
}

export function createAppointment(data: {
  patientId: string;
  providerId: string;
  appointmentDate: string;
  appointmentType: string;
  duration?: number;
  room?: string;
  notes?: string;
}) {
  return apiFetch<Appointment>(`/appointments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// The API has no dedicated status endpoint — status transitions are a plain
// PUT with the new status, same as web (see AppointmentForm.tsx).
export function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return apiFetch<Appointment>(`/appointments/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
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

/**
 * Uploads a wound photo and runs Claude's AI analysis on it. Does not create
 * any DB record — mirrors POST /api/wound-assessments/analyze on web, which
 * only returns the analysis for review before the caller decides to save it
 * (see createWound / createWoundAssessment below).
 *
 * Uses raw fetch instead of apiFetch: multipart/form-data must not get the
 * JSON Content-Type header apiFetch always attaches when a body is present.
 */
export async function analyzeWoundPhoto(params: {
  uri: string;
  fileName: string;
  mimeType: string;
  patientId: string;
  woundId?: string;
}): Promise<WoundAnalyzeResponse> {
  const form = new FormData();
  form.append("wound-image", {
    uri: params.uri,
    name: params.fileName,
    type: params.mimeType,
  } as unknown as Blob);
  form.append("patientId", params.patientId);
  if (params.woundId) form.append("woundId", params.woundId);

  const token = authTokenGetter ? await authTokenGetter() : null;
  const res = await fetch(`${getApiBaseUrl()}/wound-assessments/analyze`, {
    method: "POST",
    body: form,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  return (await res.json()) as WoundAnalyzeResponse;
}

export function createWound(data: {
  patientId: string;
  location: string;
  stage?: number | null;
  woundType: string;
  dateIdentified: string;
  isActive: boolean;
}) {
  return apiFetch<Wound>(`/wounds`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Saves an assessment from a completed AI analysis. Field mapping mirrors
 * WoundImagingModal.tsx's handleSaveAssessment on web exactly, so mobile- and
 * web-created assessments look identical in every view.
 */
export function createWoundAssessment(woundId: string, analysis: WoundAnalysisResult, imagePath: string) {
  const body = {
    woundId,
    assessmentDate: new Date().toISOString(),
    area: analysis.area != null ? String(analysis.area) : null,
    perimeter: analysis.perimeter != null ? String(analysis.perimeter) : null,
    length: analysis.longestDiameter != null ? String(analysis.longestDiameter) : null,
    width: analysis.width != null ? String(analysis.width) : null,
    depth: analysis.depth != null ? String(analysis.depth) : null,
    volume: analysis.volume != null ? String(analysis.volume) : null,
    undermining: analysis.undermining || false,
    underminingLocation: analysis.underminingLocation || null,
    underminingDepth: analysis.underminingDepth != null ? String(analysis.underminingDepth) : null,
    tunneling: analysis.tunneling || false,
    tunnelingLocation: analysis.tunnelingLocation || null,
    tunnelingDepth: analysis.tunnelingDepth != null ? String(analysis.tunnelingDepth) : null,
    granulationPercent: analysis.tissueComposition.granulation ?? null,
    sloughPercent: analysis.tissueComposition.slough ?? null,
    necroticPercent: analysis.tissueComposition.necrotic ?? null,
    epithelialPercent: analysis.tissueComposition.epithelial ?? null,
    fibrinPercent: analysis.tissueComposition.fibrin ?? null,
    tissueType: `${analysis.tissueComposition.granulation}% granulation, ${analysis.tissueComposition.slough}% slough, ${analysis.tissueComposition.necrotic}% necrotic`,
    exudateAmount: analysis.exudate?.amount || null,
    exudateType: analysis.exudate?.type || null,
    exudateOdor: analysis.exudate?.odor || null,
    periwoundSkin: analysis.periwoundSkin?.condition || null,
    periwoundEdema: analysis.periwoundSkin?.edema || false,
    periwoundErythema: analysis.periwoundSkin?.erythema || false,
    periwoundWarmth: analysis.periwoundSkin?.warmth || false,
    periwoundInduration: analysis.periwoundSkin?.induration || false,
    pressureInjuryStage: analysis.pressureInjuryStage || null,
    wagnerGrade: analysis.wagnerGrade ?? null,
    coapClassification: analysis.coapClassification || null,
    woundClassification: analysis.woundClassification || null,
    painPresent: analysis.pain?.present || false,
    painLevel: analysis.pain?.level ?? null,
    painCharacter: analysis.pain?.character || null,
    primaryDressing: analysis.dressingRecommendation?.primary || null,
    secondaryDressing: analysis.dressingRecommendation?.secondary || null,
    dressingChangeFrequency: analysis.dressingRecommendation?.changeFrequency || null,
    cleansingAgent: analysis.treatmentPlan?.cleansingAgent || null,
    debridementType: analysis.treatmentPlan?.debridementType || null,
    infectionManagement: analysis.treatmentPlan?.infectionManagement || null,
    adjunctTherapy: analysis.treatmentPlan?.adjunctTherapy || null,
    nextReviewDate: analysis.nextReviewDate || null,
    imageUrl: imagePath,
    aiAnalysis: analysis,
    notes: `AI Analysis: ${analysis.recommendations.join(". ")}`,
    visitId: null,
    exudate: analysis.exudate?.amount || null,
    odor: analysis.exudate?.odor || null,
    infectionSigns: JSON.stringify(analysis.infectionSigns || []),
  };
  return apiFetch<WoundAssessment>(`/wound-assessments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
