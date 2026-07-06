import { sql } from 'drizzle-orm';
import {
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Wound analysis types
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

// User storage table — identity is provided by Clerk (see clerkUserId);
// the local `id` stays a stable UUID so foreign keys never break on re-auth.
export const woundenceUsers = pgTable("woundence_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId: varchar("clerk_user_id").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("provider"),
  specialty: varchar("specialty"),
  licenseNumber: varchar("license_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patients table
export const woundencePatients = pgTable("woundence_patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: varchar("gender").notNull(),
  phone: varchar("phone"),
  email: varchar("email"),
  address: text("address"),
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  allergies: text("allergies"),
  comorbidities: text("comorbidities"),
  medications: text("medications"),
  insuranceProvider: varchar("insurance_provider"),
  insuranceClass: varchar("insurance_class"),
  insuranceMemberId: varchar("insurance_member_id"),
  problemList: text("problem_list"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointments table
export const woundenceAppointments = pgTable("woundence_appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => woundencePatients.id).notNull(),
  providerId: varchar("provider_id").references(() => woundenceUsers.id).notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").notNull().default(30),
  room: varchar("room"),
  appointmentType: varchar("appointment_type").notNull(),
  status: varchar("status").notNull().default("scheduled"),
  bookingSource: varchar("booking_source").notNull().default("internal"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("woundence_appointments_patient_id_idx").on(table.patientId),
  index("woundence_appointments_provider_id_idx").on(table.providerId),
  index("woundence_appointments_appointment_date_idx").on(table.appointmentDate),
]);

// Wounds table
export const woundenceWounds = pgTable("woundence_wounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => woundencePatients.id).notNull(),
  woundId: varchar("wound_id").notNull(),
  location: varchar("location").notNull(),
  stage: integer("stage").notNull(),
  woundType: varchar("wound_type").notNull(),
  dateIdentified: date("date_identified").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("woundence_wounds_patient_id_idx").on(table.patientId),
]);

// Visits table
export const woundenceVisits = pgTable("woundence_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => woundencePatients.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => woundenceAppointments.id),
  providerId: varchar("provider_id").references(() => woundenceUsers.id).notNull(),
  visitDate: timestamp("visit_date").notNull(),
  visitType: varchar("visit_type").notNull(),
  chiefComplaint: text("chief_complaint"),
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  vitals: jsonb("vitals"),
  orders: text("orders"),
  billingCodes: text("billing_codes"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  insuranceCovered: decimal("insurance_covered", { precision: 10, scale: 2 }),
  patientPay: decimal("patient_pay", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("woundence_visits_patient_id_idx").on(table.patientId),
  index("woundence_visits_appointment_id_idx").on(table.appointmentId),
  index("woundence_visits_provider_id_idx").on(table.providerId),
]);

// Wound assessments table
export const woundenceWoundAssessments = pgTable("woundence_wound_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  woundId: varchar("wound_id").references(() => woundenceWounds.id).notNull(),
  visitId: varchar("visit_id").references(() => woundenceVisits.id),
  assessmentDate: timestamp("assessment_date").notNull(),
  length: decimal("length", { precision: 5, scale: 2 }),
  width: decimal("width", { precision: 5, scale: 2 }),
  depth: decimal("depth", { precision: 5, scale: 2 }),
  area: decimal("area", { precision: 8, scale: 2 }),
  volume: decimal("volume", { precision: 8, scale: 3 }),
  perimeter: decimal("perimeter", { precision: 6, scale: 2 }),
  undermining: boolean("undermining").default(false),
  underminingLocation: varchar("undermining_location"),
  underminingDepth: decimal("undermining_depth", { precision: 5, scale: 2 }),
  tunneling: boolean("tunneling").default(false),
  tunnelingLocation: varchar("tunneling_location"),
  tunnelingDepth: decimal("tunneling_depth", { precision: 5, scale: 2 }),
  granulationPercent: integer("granulation_percent"),
  sloughPercent: integer("slough_percent"),
  necroticPercent: integer("necrotic_percent"),
  epithelialPercent: integer("epithelial_percent"),
  fibrinPercent: integer("fibrin_percent"),
  tissueType: varchar("tissue_type"),
  exudateAmount: varchar("exudate_amount"),
  exudateType: varchar("exudate_type"),
  exudateOdor: varchar("exudate_odor"),
  periwoundSkin: varchar("periwound_skin"),
  periwoundEdema: boolean("periwound_edema").default(false),
  periwoundErythema: boolean("periwound_erythema").default(false),
  periwoundWarmth: boolean("periwound_warmth").default(false),
  periwoundInduration: boolean("periwound_induration").default(false),
  pressureInjuryStage: varchar("pressure_injury_stage"),
  wagnerGrade: integer("wagner_grade"),
  coapClassification: varchar("coap_classification"),
  woundClassification: varchar("wound_classification"),
  painPresent: boolean("pain_present").default(false),
  painLevel: integer("pain_level"),
  painCharacter: varchar("pain_character"),
  primaryDressing: varchar("primary_dressing"),
  secondaryDressing: varchar("secondary_dressing"),
  dressingChangeFrequency: varchar("dressing_change_frequency"),
  cleansingAgent: varchar("cleansing_agent"),
  debridementType: varchar("debridement_type"),
  infectionManagement: varchar("infection_management"),
  adjunctTherapy: varchar("adjunct_therapy"),
  odor: varchar("odor"),
  infectionSigns: text("infection_signs"),
  imageUrl: varchar("image_url"),
  aiAnalysis: jsonb("ai_analysis"),
  notes: text("notes"),
  nextReviewDate: date("next_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("woundence_wound_assessments_wound_id_idx").on(table.woundId),
  index("woundence_wound_assessments_visit_id_idx").on(table.visitId),
  index("woundence_wound_assessments_assessment_date_idx").on(table.assessmentDate),
]);

// Treatment plans table
export const woundenceTreatmentPlans = pgTable("woundence_treatment_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => woundencePatients.id).notNull(),
  woundId: varchar("wound_id").references(() => woundenceWounds.id),
  planName: varchar("plan_name").notNull(),
  goals: text("goals").notNull(),
  dressingProtocol: text("dressing_protocol"),
  frequency: varchar("frequency"),
  debridementSchedule: varchar("debridement_schedule"),
  offloadingInstructions: text("offloading_instructions"),
  doctorId: varchar("doctor_id").references(() => woundenceUsers.id),
  nurseId: varchar("nurse_id").references(() => woundenceUsers.id),
  woundType: varchar("wound_type"),
  recommendedDressing: varchar("recommended_dressing"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => woundenceUsers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("woundence_treatment_plans_patient_id_idx").on(table.patientId),
  index("woundence_treatment_plans_wound_id_idx").on(table.woundId),
  index("woundence_treatment_plans_doctor_id_idx").on(table.doctorId),
  index("woundence_treatment_plans_nurse_id_idx").on(table.nurseId),
  index("woundence_treatment_plans_created_by_idx").on(table.createdBy),
]);

// Insurance rules table
export const woundenceInsuranceRules = pgTable("woundence_insurance_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerName: varchar("provider_name").notNull(),
  class: varchar("class").notNull(),
  coveragePercentage: integer("coverage_percentage").notNull(),
  standardDressingCovered: boolean("standard_dressing_covered").default(true),
  advancedDressingCovered: boolean("advanced_dressing_covered").default(false),
  maxVisitsPerMonth: integer("max_visits_per_month"),
  deductible: decimal("deductible", { precision: 10, scale: 2 }),
  copay: decimal("copay", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Files table
export const woundenceFiles = pgTable("woundence_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => woundencePatients.id).notNull(),
  visitId: varchar("visit_id").references(() => woundenceVisits.id),
  woundAssessmentId: varchar("wound_assessment_id").references(() => woundenceWoundAssessments.id),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: varchar("file_path").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => woundenceUsers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("woundence_files_patient_id_idx").on(table.patientId),
  index("woundence_files_visit_id_idx").on(table.visitId),
  index("woundence_files_wound_assessment_id_idx").on(table.woundAssessmentId),
  index("woundence_files_uploaded_by_idx").on(table.uploadedBy),
]);

// Audit logs table
export const woundenceAuditLogs = pgTable("woundence_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => woundenceUsers.id).notNull(),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("woundence_audit_logs_user_id_idx").on(table.userId),
  index("woundence_audit_logs_timestamp_idx").on(table.timestamp),
]);

// Relations
export const woundenceUsersRelations = relations(woundenceUsers, ({ many }) => ({
  appointments: many(woundenceAppointments),
  visits: many(woundenceVisits),
  treatmentPlans: many(woundenceTreatmentPlans),
  auditLogs: many(woundenceAuditLogs),
  uploadedFiles: many(woundenceFiles),
}));

export const woundencePatientsRelations = relations(woundencePatients, ({ many }) => ({
  appointments: many(woundenceAppointments),
  visits: many(woundenceVisits),
  wounds: many(woundenceWounds),
  treatmentPlans: many(woundenceTreatmentPlans),
  files: many(woundenceFiles),
}));

export const woundenceAppointmentsRelations = relations(woundenceAppointments, ({ one, many }) => ({
  patient: one(woundencePatients, { fields: [woundenceAppointments.patientId], references: [woundencePatients.id] }),
  provider: one(woundenceUsers, { fields: [woundenceAppointments.providerId], references: [woundenceUsers.id] }),
  visits: many(woundenceVisits),
}));

export const woundenceWoundsRelations = relations(woundenceWounds, ({ one, many }) => ({
  patient: one(woundencePatients, { fields: [woundenceWounds.patientId], references: [woundencePatients.id] }),
  assessments: many(woundenceWoundAssessments),
  treatmentPlans: many(woundenceTreatmentPlans),
}));

export const woundenceWoundAssessmentsRelations = relations(woundenceWoundAssessments, ({ one }) => ({
  wound: one(woundenceWounds, { fields: [woundenceWoundAssessments.woundId], references: [woundenceWounds.id] }),
  visit: one(woundenceVisits, { fields: [woundenceWoundAssessments.visitId], references: [woundenceVisits.id] }),
}));

export const woundenceVisitsRelations = relations(woundenceVisits, ({ one, many }) => ({
  patient: one(woundencePatients, { fields: [woundenceVisits.patientId], references: [woundencePatients.id] }),
  provider: one(woundenceUsers, { fields: [woundenceVisits.providerId], references: [woundenceUsers.id] }),
  appointment: one(woundenceAppointments, { fields: [woundenceVisits.appointmentId], references: [woundenceAppointments.id] }),
  woundAssessments: many(woundenceWoundAssessments),
  files: many(woundenceFiles),
}));

export const woundenceTreatmentPlansRelations = relations(woundenceTreatmentPlans, ({ one }) => ({
  patient: one(woundencePatients, { fields: [woundenceTreatmentPlans.patientId], references: [woundencePatients.id] }),
  wound: one(woundenceWounds, { fields: [woundenceTreatmentPlans.woundId], references: [woundenceWounds.id] }),
  createdByUser: one(woundenceUsers, { fields: [woundenceTreatmentPlans.createdBy], references: [woundenceUsers.id] }),
  doctor: one(woundenceUsers, { fields: [woundenceTreatmentPlans.doctorId], references: [woundenceUsers.id] }),
  nurse: one(woundenceUsers, { fields: [woundenceTreatmentPlans.nurseId], references: [woundenceUsers.id] }),
}));

export const woundenceFilesRelations = relations(woundenceFiles, ({ one }) => ({
  patient: one(woundencePatients, { fields: [woundenceFiles.patientId], references: [woundencePatients.id] }),
  visit: one(woundenceVisits, { fields: [woundenceFiles.visitId], references: [woundenceVisits.id] }),
  woundAssessment: one(woundenceWoundAssessments, { fields: [woundenceFiles.woundAssessmentId], references: [woundenceWoundAssessments.id] }),
  uploadedBy: one(woundenceUsers, { fields: [woundenceFiles.uploadedBy], references: [woundenceUsers.id] }),
}));

export const woundenceAuditLogsRelations = relations(woundenceAuditLogs, ({ one }) => ({
  user: one(woundenceUsers, { fields: [woundenceAuditLogs.userId], references: [woundenceUsers.id] }),
}));

// Insert schemas
export const insertWoundenceUserSchema = createInsertSchema(woundenceUsers).omit({
  id: true, createdAt: true, updatedAt: true,
});

export const insertWoundencePatientSchema = createInsertSchema(woundencePatients).omit({
  id: true, patientId: true, createdAt: true, updatedAt: true,
});

export const insertWoundenceAppointmentSchema = createInsertSchema(woundenceAppointments).omit({
  id: true, createdAt: true, updatedAt: true,
}).extend({
  appointmentDate: z.union([z.string(), z.date()]).transform((value) => {
    if (typeof value === 'string') return new Date(value);
    return value;
  })
});

export const insertWoundenceWoundSchema = createInsertSchema(woundenceWounds).omit({
  id: true, woundId: true, createdAt: true, updatedAt: true,
});

export const insertWoundenceWoundAssessmentSchema = createInsertSchema(woundenceWoundAssessments).omit({
  id: true, createdAt: true,
}).extend({
  assessmentDate: z.union([z.string(), z.date()]).transform((value) => {
    if (typeof value === 'string') return new Date(value);
    return value;
  })
});

export const insertWoundenceVisitSchema = createInsertSchema(woundenceVisits).omit({
  id: true, createdAt: true, updatedAt: true,
});

export const insertWoundenceTreatmentPlanSchema = createInsertSchema(woundenceTreatmentPlans).omit({
  id: true, createdAt: true, updatedAt: true,
});

export const insertWoundenceInsuranceRuleSchema = createInsertSchema(woundenceInsuranceRules).omit({
  id: true, createdAt: true,
});

export const insertWoundenceFileSchema = createInsertSchema(woundenceFiles).omit({
  id: true, createdAt: true,
});

export const insertWoundenceAuditLogSchema = createInsertSchema(woundenceAuditLogs).omit({
  id: true, timestamp: true,
});

// Public booking schema
export const woundencePublicBookingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  phone: z.string().min(1),
  email: z.email(),
  appointmentDate: z.string().min(1),
  appointmentType: z.enum(["new_patient", "follow_up", "wound_assessment", "debridement"]),
  notes: z.string().optional(),
  address: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insuranceMemberId: z.string().optional(),
});

// Export types
export type WoundenceUser = typeof woundenceUsers.$inferSelect;
export type UpsertWoundenceUser = typeof woundenceUsers.$inferInsert;
export type WoundencePatient = typeof woundencePatients.$inferSelect;
export type InsertWoundencePatient = z.infer<typeof insertWoundencePatientSchema>;
export type WoundenceAppointment = typeof woundenceAppointments.$inferSelect;
export type InsertWoundenceAppointment = z.infer<typeof insertWoundenceAppointmentSchema>;
export type WoundenceWound = typeof woundenceWounds.$inferSelect;
export type InsertWoundenceWound = z.infer<typeof insertWoundenceWoundSchema>;
export type WoundenceWoundAssessment = typeof woundenceWoundAssessments.$inferSelect;
export type InsertWoundenceWoundAssessment = z.infer<typeof insertWoundenceWoundAssessmentSchema>;
export type WoundenceVisit = typeof woundenceVisits.$inferSelect;
export type InsertWoundenceVisit = z.infer<typeof insertWoundenceVisitSchema>;
export type WoundenceTreatmentPlan = typeof woundenceTreatmentPlans.$inferSelect;
export type InsertWoundenceTreatmentPlan = z.infer<typeof insertWoundenceTreatmentPlanSchema>;
export type WoundenceInsuranceRule = typeof woundenceInsuranceRules.$inferSelect;
export type InsertWoundenceInsuranceRule = z.infer<typeof insertWoundenceInsuranceRuleSchema>;
export type WoundenceFile = typeof woundenceFiles.$inferSelect;
export type InsertWoundenceFile = z.infer<typeof insertWoundenceFileSchema>;
export type WoundenceAuditLog = typeof woundenceAuditLogs.$inferSelect;
export type InsertWoundenceAuditLog = z.infer<typeof insertWoundenceAuditLogSchema>;
