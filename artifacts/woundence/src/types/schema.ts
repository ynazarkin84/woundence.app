import { z } from "zod";

export type WoundType = 'callus' | 'diabetic_foot_ulcer' | 'venous_ulcer' | 'pressure_ulcer' | 'arterial_ulcer' | 'edema' | 'other';

export interface WoundAnalysisResult {
  area: number;
  perimeter: number;
  longestDiameter: number;
  width: number;
  depth?: number;
  volume?: number;
  undermining: boolean;
  underminingLocation?: string;
  underminingDepth?: number;
  tunneling: boolean;
  tunnelingLocation?: string;
  tunnelingDepth?: number;
  woundType: WoundType;
  woundTypeConfidence: number;
  bodyLocation?: string;
  woundClassification: string;
  pressureInjuryStage?: string;
  wagnerGrade?: number;
  coapClassification?: string;
  tissueComposition: {
    granulation: number;
    slough: number;
    necrotic: number;
    epithelial?: number;
    fibrin?: number;
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
    level?: number;
    character?: string;
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
  nextReviewDate?: string;
  boundaryCoordinates?: Array<{ x: number; y: number }>;
}

export interface WoundAnalysisApiResult {
  analysis: WoundAnalysisResult;
  imageMetadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  imagePath: string;
}

export interface User {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role: string;
  specialty?: string | null;
  licenseNumber?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface Patient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  allergies?: string | null;
  comorbidities?: string | null;
  medications?: string | null;
  insuranceProvider?: string | null;
  insuranceClass?: string | null;
  insuranceMemberId?: string | null;
  problemList?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  appointmentDate: Date | string;
  duration: number;
  room?: string | null;
  appointmentType: string;
  status: string;
  bookingSource: string;
  notes?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  patient?: Patient;
  provider?: User;
}

export interface Wound {
  id: string;
  patientId: string;
  woundId: string;
  location: string;
  stage: number;
  woundType: string;
  dateIdentified: string;
  isActive?: boolean | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface WoundAssessment {
  id: string;
  woundId: string;
  visitId?: string | null;
  assessmentDate: Date | string;
  length?: string | null;
  width?: string | null;
  depth?: string | null;
  area?: string | null;
  volume?: string | null;
  perimeter?: string | null;
  undermining?: boolean | null;
  underminingLocation?: string | null;
  underminingDepth?: string | null;
  tunneling?: boolean | null;
  tunnelingLocation?: string | null;
  tunnelingDepth?: string | null;
  granulationPercent?: number | null;
  sloughPercent?: number | null;
  necroticPercent?: number | null;
  epithelialPercent?: number | null;
  fibrinPercent?: number | null;
  tissueType?: string | null;
  exudateAmount?: string | null;
  exudateType?: string | null;
  exudateOdor?: string | null;
  periwoundSkin?: string | null;
  periwoundEdema?: boolean | null;
  periwoundErythema?: boolean | null;
  periwoundWarmth?: boolean | null;
  periwoundInduration?: boolean | null;
  pressureInjuryStage?: string | null;
  wagnerGrade?: number | null;
  coapClassification?: string | null;
  woundClassification?: string | null;
  painPresent?: boolean | null;
  painLevel?: number | null;
  painCharacter?: string | null;
  primaryDressing?: string | null;
  secondaryDressing?: string | null;
  dressingChangeFrequency?: string | null;
  cleansingAgent?: string | null;
  debridementType?: string | null;
  infectionManagement?: string | null;
  adjunctTherapy?: string | null;
  odor?: string | null;
  infectionSigns?: string | null;
  imageUrl?: string | null;
  aiAnalysis?: WoundAnalysisResult | null;
  notes?: string | null;
  nextReviewDate?: string | null;
  createdAt?: Date | string | null;
  wound?: Wound;
  files?: WoundFile[];
}

export interface Visit {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  providerId: string;
  visitDate: Date | string;
  visitType: string;
  chiefComplaint?: string | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  vitals?: Record<string, unknown> | null;
  orders?: string | null;
  billingCodes?: string | null;
  totalAmount?: string | null;
  insuranceCovered?: string | null;
  patientPay?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  patient?: Patient;
  provider?: User;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  woundId?: string | null;
  planName: string;
  goals: string;
  dressingProtocol?: string | null;
  frequency?: string | null;
  debridementSchedule?: string | null;
  offloadingInstructions?: string | null;
  doctorId?: string | null;
  nurseId?: string | null;
  woundType?: string | null;
  recommendedDressing?: string | null;
  startDate: string;
  endDate?: string | null;
  version?: number | null;
  isActive?: boolean | null;
  createdBy: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  patient?: Patient;
  createdByUser?: User;
}

export interface InsuranceRule {
  id: string;
  providerName: string;
  class: string;
  coveragePercentage: number;
  standardDressingCovered?: boolean | null;
  advancedDressingCovered?: boolean | null;
  maxVisitsPerMonth?: number | null;
  deductible?: string | null;
  copay?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | string | null;
}

export interface WoundFile {
  id: string;
  patientId: string;
  visitId?: string | null;
  woundAssessmentId?: string | null;
  fileName: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: string;
  createdAt?: Date | string | null;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: unknown | null;
  newValues?: unknown | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp?: Date | string | null;
  user?: User;
}

// Insert schemas (Zod)
export const insertPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  gender: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  allergies: z.string().optional(),
  comorbidities: z.string().optional(),
  medications: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insuranceClass: z.string().optional(),
  insuranceMemberId: z.string().optional(),
  problemList: z.string().optional(),
});

export const insertAppointmentSchema = z.object({
  patientId: z.string().min(1),
  providerId: z.string().min(1),
  appointmentDate: z.union([z.string(), z.date()]),
  duration: z.number().default(30),
  room: z.string().optional(),
  appointmentType: z.string().min(1),
  status: z.string().default("scheduled"),
  bookingSource: z.string().default("internal"),
  notes: z.string().optional(),
});

export const insertWoundSchema = z.object({
  patientId: z.string().min(1),
  location: z.string().min(1),
  stage: z.number().int().min(1).max(4),
  woundType: z.string().min(1),
  dateIdentified: z.string().min(1),
});

export const insertWoundAssessmentSchema = z.object({
  woundId: z.string().min(1),
  visitId: z.string().optional().nullable(),
  assessmentDate: z.union([z.string(), z.date()]),
  length: z.union([z.string(), z.number()]).optional().nullable(),
  width: z.union([z.string(), z.number()]).optional().nullable(),
  depth: z.union([z.string(), z.number()]).optional().nullable(),
  area: z.union([z.string(), z.number()]).optional().nullable(),
  volume: z.union([z.string(), z.number()]).optional().nullable(),
  perimeter: z.union([z.string(), z.number()]).optional().nullable(),
  undermining: z.boolean().optional().nullable(),
  underminingLocation: z.string().optional().nullable(),
  underminingDepth: z.union([z.string(), z.number()]).optional().nullable(),
  tunneling: z.boolean().optional().nullable(),
  tunnelingLocation: z.string().optional().nullable(),
  tunnelingDepth: z.union([z.string(), z.number()]).optional().nullable(),
  granulationPercent: z.number().optional().nullable(),
  sloughPercent: z.number().optional().nullable(),
  necroticPercent: z.number().optional().nullable(),
  epithelialPercent: z.number().optional().nullable(),
  fibrinPercent: z.number().optional().nullable(),
  tissueType: z.string().optional().nullable(),
  exudateAmount: z.string().optional().nullable(),
  exudateType: z.string().optional().nullable(),
  exudateOdor: z.string().optional().nullable(),
  periwoundSkin: z.string().optional().nullable(),
  periwoundEdema: z.boolean().optional().nullable(),
  periwoundErythema: z.boolean().optional().nullable(),
  periwoundWarmth: z.boolean().optional().nullable(),
  periwoundInduration: z.boolean().optional().nullable(),
  pressureInjuryStage: z.string().optional().nullable(),
  wagnerGrade: z.number().optional().nullable(),
  coapClassification: z.string().optional().nullable(),
  woundClassification: z.string().optional().nullable(),
  painPresent: z.boolean().optional().nullable(),
  painLevel: z.number().optional().nullable(),
  painCharacter: z.string().optional().nullable(),
  primaryDressing: z.string().optional().nullable(),
  secondaryDressing: z.string().optional().nullable(),
  dressingChangeFrequency: z.string().optional().nullable(),
  cleansingAgent: z.string().optional().nullable(),
  debridementType: z.string().optional().nullable(),
  infectionManagement: z.string().optional().nullable(),
  adjunctTherapy: z.string().optional().nullable(),
  odor: z.string().optional().nullable(),
  infectionSigns: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  aiAnalysis: z.any().optional().nullable(),
  notes: z.string().optional().nullable(),
  nextReviewDate: z.string().optional().nullable(),
});

export const insertVisitSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().optional().nullable(),
  providerId: z.string().min(1),
  visitDate: z.union([z.string(), z.date()]),
  visitType: z.string().min(1),
  chiefComplaint: z.string().optional().nullable(),
  subjective: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  assessment: z.string().optional().nullable(),
  plan: z.string().optional().nullable(),
  vitals: z.any().optional().nullable(),
  orders: z.string().optional().nullable(),
  billingCodes: z.string().optional().nullable(),
  totalAmount: z.union([z.string(), z.number()]).optional().nullable(),
  insuranceCovered: z.union([z.string(), z.number()]).optional().nullable(),
  patientPay: z.union([z.string(), z.number()]).optional().nullable(),
});

export const insertTreatmentPlanSchema = z.object({
  patientId: z.string().min(1),
  woundId: z.string().optional().nullable(),
  planName: z.string().min(1),
  goals: z.string().min(1),
  dressingProtocol: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  debridementSchedule: z.string().optional().nullable(),
  offloadingInstructions: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  nurseId: z.string().optional().nullable(),
  woundType: z.string().optional().nullable(),
  recommendedDressing: z.string().optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  version: z.number().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.string().min(1),
});

export const insertInsuranceRuleSchema = z.object({
  providerName: z.string().min(1),
  class: z.string().min(1),
  coveragePercentage: z.number().int().min(0).max(100),
  standardDressingCovered: z.boolean().optional(),
  advancedDressingCovered: z.boolean().optional(),
  maxVisitsPerMonth: z.number().optional().nullable(),
  deductible: z.union([z.string(), z.number()]).optional().nullable(),
  copay: z.union([z.string(), z.number()]).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertWound = z.infer<typeof insertWoundSchema>;
export type InsertWoundAssessment = z.infer<typeof insertWoundAssessmentSchema>;
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type InsertTreatmentPlan = z.infer<typeof insertTreatmentPlanSchema>;
export type InsertInsuranceRule = z.infer<typeof insertInsuranceRuleSchema>;
