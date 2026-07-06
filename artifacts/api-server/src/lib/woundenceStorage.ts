import {
  db,
  woundenceUsers,
  woundencePatients,
  woundenceAppointments,
  woundenceWounds,
  woundenceWoundAssessments,
  woundenceVisits,
  woundenceTreatmentPlans,
  woundenceInsuranceRules,
  woundenceFiles,
  woundenceAuditLogs,
  type WoundenceUser,
  type WoundencePatient,
  type InsertWoundencePatient,
  type WoundenceAppointment,
  type InsertWoundenceAppointment,
  type WoundenceWound,
  type InsertWoundenceWound,
  type WoundenceWoundAssessment,
  type InsertWoundenceWoundAssessment,
  type WoundenceVisit,
  type InsertWoundenceVisit,
  type WoundenceTreatmentPlan,
  type InsertWoundenceTreatmentPlan,
  type WoundenceInsuranceRule,
  type InsertWoundenceInsuranceRule,
  type WoundenceFile,
  type InsertWoundenceFile,
  type WoundenceAuditLog,
  type InsertWoundenceAuditLog,
} from "@workspace/db";
import { eq, desc, and, or, gte, lte, count, ne, sql, inArray } from "drizzle-orm";
import { logger } from "./logger";

export class WoundenceStorage {
  async getProviders(): Promise<WoundenceUser[]> {
    return await db
      .select()
      .from(woundenceUsers)
      .where(or(eq(woundenceUsers.role, 'provider'), eq(woundenceUsers.role, 'staff')))
      .orderBy(woundenceUsers.firstName, woundenceUsers.lastName);
  }

  async getAllUsers(): Promise<WoundenceUser[]> {
    return await db
      .select()
      .from(woundenceUsers)
      .orderBy(woundenceUsers.role, woundenceUsers.firstName, woundenceUsers.lastName);
  }

  async updateUserRole(id: string, role: string): Promise<WoundenceUser> {
    const [user] = await db
      .update(woundenceUsers)
      .set({ role, updatedAt: new Date() })
      .where(eq(woundenceUsers.id, id))
      .returning();
    return user;
  }

  async getPatients(): Promise<(WoundencePatient & { activeWoundTypes: string[] })[]> {
    const patients = await db.select().from(woundencePatients).where(eq(woundencePatients.isActive, true)).orderBy(desc(woundencePatients.createdAt));
    return this.attachActiveWoundTypes(patients);
  }

  // Condition tags (e.g. "diabetic foot ulcer") shown on the patient list are
  // sourced from each patient's active wounds. Fetched as one extra query for
  // the whole page rather than per-row, to avoid N+1.
  private async attachActiveWoundTypes<T extends { id: string }>(
    patients: T[]
  ): Promise<(T & { activeWoundTypes: string[] })[]> {
    if (patients.length === 0) return [];
    const wounds = await db
      .select({ patientId: woundenceWounds.patientId, woundType: woundenceWounds.woundType })
      .from(woundenceWounds)
      .where(and(inArray(woundenceWounds.patientId, patients.map((p) => p.id)), eq(woundenceWounds.isActive, true)));

    const byPatient = new Map<string, Set<string>>();
    for (const w of wounds) {
      if (!byPatient.has(w.patientId)) byPatient.set(w.patientId, new Set());
      byPatient.get(w.patientId)!.add(w.woundType);
    }
    return patients.map((p) => ({ ...p, activeWoundTypes: Array.from(byPatient.get(p.id) ?? []) }));
  }

  async getPatient(id: string): Promise<WoundencePatient | undefined> {
    const [patient] = await db.select().from(woundencePatients).where(eq(woundencePatients.id, id));
    return patient;
  }

  async getPatientByEmail(email: string): Promise<WoundencePatient | undefined> {
    const [patient] = await db.select().from(woundencePatients).where(eq(woundencePatients.email, email));
    return patient;
  }

  async createPatient(patientData: InsertWoundencePatient): Promise<WoundencePatient> {
    const [{ count: patientCount }] = await db.select({ count: count() }).from(woundencePatients);
    const patientId = `P-${String(Number(patientCount) + 1).padStart(6, '0')}`;
    const [patient] = await db.insert(woundencePatients).values({ ...patientData, patientId }).returning();
    return patient;
  }

  async updatePatient(id: string, patientData: Partial<InsertWoundencePatient>): Promise<WoundencePatient> {
    const [patient] = await db.update(woundencePatients).set({ ...patientData, updatedAt: new Date() }).where(eq(woundencePatients.id, id)).returning();
    return patient;
  }

  async deletePatient(id: string): Promise<void> {
    const filesToDelete: WoundenceFile[] = [];

    await db.transaction(async (tx) => {
      const patientWounds = await tx.select().from(woundenceWounds).where(eq(woundenceWounds.patientId, id));

      for (const wound of patientWounds) {
        const assessments = await tx.select().from(woundenceWoundAssessments).where(eq(woundenceWoundAssessments.woundId, wound.id));
        for (const assessment of assessments) {
          const assessmentFiles = await tx.select().from(woundenceFiles).where(eq(woundenceFiles.woundAssessmentId, assessment.id));
          filesToDelete.push(...assessmentFiles);
          if (assessmentFiles.length > 0) await tx.delete(woundenceFiles).where(eq(woundenceFiles.woundAssessmentId, assessment.id));
        }
        if (assessments.length > 0) await tx.delete(woundenceWoundAssessments).where(eq(woundenceWoundAssessments.woundId, wound.id));
      }
      if (patientWounds.length > 0) await tx.delete(woundenceWounds).where(eq(woundenceWounds.patientId, id));

      await tx.delete(woundenceAppointments).where(eq(woundenceAppointments.patientId, id));

      const patientVisits = await tx.select().from(woundenceVisits).where(eq(woundenceVisits.patientId, id));
      for (const visit of patientVisits) {
        const visitFiles = await tx.select().from(woundenceFiles).where(eq(woundenceFiles.visitId, visit.id));
        filesToDelete.push(...visitFiles);
        if (visitFiles.length > 0) await tx.delete(woundenceFiles).where(eq(woundenceFiles.visitId, visit.id));
      }
      if (patientVisits.length > 0) await tx.delete(woundenceVisits).where(eq(woundenceVisits.patientId, id));

      await tx.delete(woundenceTreatmentPlans).where(eq(woundenceTreatmentPlans.patientId, id));
      await tx.delete(woundenceFiles).where(eq(woundenceFiles.patientId, id));
      await tx.delete(woundencePatients).where(eq(woundencePatients.id, id));
    });

    const fs = await import('fs').then(m => m.promises);
    await Promise.allSettled(
      filesToDelete.map(async (file) => {
        try {
          if (file.filePath) await fs.unlink(file.filePath);
        } catch {}
      })
    );
  }

  async searchPatients(query: string): Promise<(WoundencePatient & { activeWoundTypes: string[] })[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const patients = await db.select().from(woundencePatients).where(
      and(
        eq(woundencePatients.isActive, true),
        or(
          sql`LOWER(${woundencePatients.firstName}) LIKE ${searchTerm}`,
          sql`LOWER(${woundencePatients.lastName}) LIKE ${searchTerm}`,
          sql`LOWER(${woundencePatients.patientId}) LIKE ${searchTerm}`,
          sql`LOWER(${woundencePatients.phone}) LIKE ${searchTerm}`
        )
      )
    );
    return this.attachActiveWoundTypes(patients);
  }

  async getAppointments() {
    const rows = await db.select().from(woundenceAppointments)
      .innerJoin(woundencePatients, eq(woundenceAppointments.patientId, woundencePatients.id))
      .innerJoin(woundenceUsers, eq(woundenceAppointments.providerId, woundenceUsers.id))
      .orderBy(desc(woundenceAppointments.appointmentDate));
    return rows.map(({ woundence_appointments: apt, woundence_patients: pat, woundence_users: usr }) => ({ ...apt, patient: pat, provider: usr }));
  }

  async getAppointmentsByDateAndProvider(date: Date, providerId?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const conditions: any[] = [
      gte(woundenceAppointments.appointmentDate, startOfDay),
      lte(woundenceAppointments.appointmentDate, endOfDay),
      ne(woundenceAppointments.status, 'cancelled'),
    ];
    if (providerId) conditions.push(eq(woundenceAppointments.providerId, providerId));

    const rows = await db.select().from(woundenceAppointments)
      .innerJoin(woundencePatients, eq(woundenceAppointments.patientId, woundencePatients.id))
      .innerJoin(woundenceUsers, eq(woundenceAppointments.providerId, woundenceUsers.id))
      .where(and(...conditions))
      .orderBy(woundenceAppointments.appointmentDate);
    return rows.map(({ woundence_appointments: apt, woundence_patients: pat, woundence_users: usr }) => ({ ...apt, patient: pat, provider: usr }));
  }

  async getAppointmentsByPatient(patientId: string) {
    const rows = await db.select().from(woundenceAppointments)
      .innerJoin(woundencePatients, eq(woundenceAppointments.patientId, woundencePatients.id))
      .innerJoin(woundenceUsers, eq(woundenceAppointments.providerId, woundenceUsers.id))
      .where(eq(woundenceAppointments.patientId, patientId))
      .orderBy(desc(woundenceAppointments.appointmentDate));
    return rows.map(({ woundence_appointments: apt, woundence_patients: pat, woundence_users: usr }) => ({ ...apt, patient: pat, provider: usr }));
  }

  async createAppointment(data: InsertWoundenceAppointment): Promise<WoundenceAppointment> {
    const [apt] = await db.insert(woundenceAppointments).values(data).returning();
    return apt;
  }

  async updateAppointment(id: string, data: Partial<InsertWoundenceAppointment>): Promise<WoundenceAppointment> {
    const [apt] = await db.update(woundenceAppointments).set({ ...data, updatedAt: new Date() }).where(eq(woundenceAppointments.id, id)).returning();
    return apt;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.delete(woundenceAppointments).where(eq(woundenceAppointments.id, id));
  }

  async getWoundsByPatient(patientId: string): Promise<WoundenceWound[]> {
    return await db.select().from(woundenceWounds)
      .where(and(eq(woundenceWounds.patientId, patientId), eq(woundenceWounds.isActive, true)))
      .orderBy(desc(woundenceWounds.dateIdentified));
  }

  async createWound(data: InsertWoundenceWound): Promise<WoundenceWound> {
    const patientWounds = await this.getWoundsByPatient(data.patientId);
    const woundId = `W-${String(patientWounds.length + 1).padStart(3, '0')}`;
    const [wound] = await db.insert(woundenceWounds).values({ ...data, woundId }).returning();
    return wound;
  }

  async updateWound(id: string, data: Partial<InsertWoundenceWound>): Promise<WoundenceWound> {
    const [wound] = await db.update(woundenceWounds).set({ ...data, updatedAt: new Date() }).where(eq(woundenceWounds.id, id)).returning();
    return wound;
  }

  async getWoundAssessments() {
    const rows = await db.select().from(woundenceWoundAssessments)
      .innerJoin(woundenceWounds, eq(woundenceWoundAssessments.woundId, woundenceWounds.id))
      .innerJoin(woundencePatients, eq(woundenceWounds.patientId, woundencePatients.id))
      .orderBy(desc(woundenceWoundAssessments.assessmentDate));
    return rows.map((row: any) => ({
      ...row.woundence_wound_assessments,
      wound: { ...row.woundence_wounds, patient: row.woundence_patients }
    }));
  }

  async getWoundAssessmentsByWound(woundId: string): Promise<WoundenceWoundAssessment[]> {
    return await db.select().from(woundenceWoundAssessments)
      .where(eq(woundenceWoundAssessments.woundId, woundId))
      .orderBy(desc(woundenceWoundAssessments.assessmentDate));
  }

  async getWoundAssessmentsByPatient(patientId: string) {
    const rows = await db.select().from(woundenceWoundAssessments)
      .innerJoin(woundenceWounds, eq(woundenceWoundAssessments.woundId, woundenceWounds.id))
      .where(eq(woundenceWounds.patientId, patientId))
      .orderBy(desc(woundenceWoundAssessments.assessmentDate));

    const result = [];
    for (const row of rows) {
      const assessmentFiles = await this.getFilesByWoundAssessment(row.woundence_wound_assessments.id);
      result.push({
        ...row.woundence_wound_assessments,
        wound: row.woundence_wounds,
        files: assessmentFiles,
      });
    }
    return result;
  }

  async createWoundAssessment(data: InsertWoundenceWoundAssessment): Promise<WoundenceWoundAssessment> {
    return await db.transaction(async (tx) => {
      const [assessment] = await tx.insert(woundenceWoundAssessments).values(data).returning();

      if (assessment.aiAnalysis && typeof assessment.aiAnalysis === 'object') {
        const aiAnalysis = assessment.aiAnalysis as any;
        if (aiAnalysis.healingStage) {
          await tx.update(woundenceWounds)
            .set({ stage: aiAnalysis.healingStage, updatedAt: new Date() })
            .where(eq(woundenceWounds.id, assessment.woundId));
        }
      }

      return assessment;
    });
  }

  async updateWoundAssessment(id: string, data: Partial<InsertWoundenceWoundAssessment>): Promise<WoundenceWoundAssessment> {
    const [assessment] = await db.update(woundenceWoundAssessments).set(data).where(eq(woundenceWoundAssessments.id, id)).returning();
    return assessment;
  }

  async deleteWoundAssessment(id: string): Promise<void> {
    const assessmentFiles = await this.getFilesByWoundAssessment(id);
    if (assessmentFiles.length > 0) await db.delete(woundenceFiles).where(eq(woundenceFiles.woundAssessmentId, id));
    await db.delete(woundenceWoundAssessments).where(eq(woundenceWoundAssessments.id, id));

    for (const file of assessmentFiles) {
      try {
        const fs = await import('fs');
        if (file.filePath && fs.existsSync(file.filePath)) fs.unlinkSync(file.filePath);
      } catch {}
    }
  }

  async getVisits() {
    const rows = await db.select().from(woundenceVisits)
      .innerJoin(woundencePatients, eq(woundenceVisits.patientId, woundencePatients.id))
      .innerJoin(woundenceUsers, eq(woundenceVisits.providerId, woundenceUsers.id))
      .orderBy(desc(woundenceVisits.visitDate));
    return rows.map(({ woundence_visits: v, woundence_patients: p, woundence_users: u }) => ({ ...v, patient: p, provider: u }));
  }

  async getVisitsByPatient(patientId: string) {
    const rows = await db.select().from(woundenceVisits)
      .innerJoin(woundencePatients, eq(woundenceVisits.patientId, woundencePatients.id))
      .innerJoin(woundenceUsers, eq(woundenceVisits.providerId, woundenceUsers.id))
      .where(eq(woundenceVisits.patientId, patientId))
      .orderBy(desc(woundenceVisits.visitDate));
    return rows.map(({ woundence_visits: v, woundence_patients: p, woundence_users: u }) => ({ ...v, patient: p, provider: u }));
  }

  async createVisit(data: InsertWoundenceVisit): Promise<WoundenceVisit> {
    const [visit] = await db.insert(woundenceVisits).values(data).returning();
    return visit;
  }

  async updateVisit(id: string, data: Partial<InsertWoundenceVisit>): Promise<WoundenceVisit> {
    const [visit] = await db.update(woundenceVisits).set({ ...data, updatedAt: new Date() }).where(eq(woundenceVisits.id, id)).returning();
    return visit;
  }

  async getTreatmentPlansByPatient(patientId: string) {
    const rows = await db.select().from(woundenceTreatmentPlans)
      .innerJoin(woundencePatients, eq(woundenceTreatmentPlans.patientId, woundencePatients.id))
      .innerJoin(woundenceUsers, eq(woundenceTreatmentPlans.createdBy, woundenceUsers.id))
      .where(eq(woundenceTreatmentPlans.patientId, patientId))
      .orderBy(desc(woundenceTreatmentPlans.createdAt));
    return rows.map((row: any) => ({
      ...row.woundence_treatment_plans,
      patient: row.woundence_patients,
      createdByUser: row.woundence_users,
    }));
  }

  async createTreatmentPlan(data: InsertWoundenceTreatmentPlan): Promise<WoundenceTreatmentPlan> {
    const [plan] = await db.insert(woundenceTreatmentPlans).values(data).returning();
    return plan;
  }

  async updateTreatmentPlan(id: string, data: Partial<InsertWoundenceTreatmentPlan>): Promise<WoundenceTreatmentPlan> {
    const [plan] = await db.update(woundenceTreatmentPlans).set({ ...data, updatedAt: new Date() }).where(eq(woundenceTreatmentPlans.id, id)).returning();
    return plan;
  }

  async getInsuranceRules(): Promise<WoundenceInsuranceRule[]> {
    return await db.select().from(woundenceInsuranceRules).where(eq(woundenceInsuranceRules.isActive, true)).orderBy(woundenceInsuranceRules.providerName);
  }

  async getInsuranceRule(providerName: string, insuranceClass: string): Promise<WoundenceInsuranceRule | undefined> {
    const [rule] = await db.select().from(woundenceInsuranceRules)
      .where(and(eq(woundenceInsuranceRules.providerName, providerName), eq(woundenceInsuranceRules.class, insuranceClass), eq(woundenceInsuranceRules.isActive, true)));
    return rule;
  }

  async createInsuranceRule(data: InsertWoundenceInsuranceRule): Promise<WoundenceInsuranceRule> {
    const [rule] = await db.insert(woundenceInsuranceRules).values(data).returning();
    return rule;
  }

  async updateInsuranceRule(id: string, data: Partial<InsertWoundenceInsuranceRule>): Promise<WoundenceInsuranceRule> {
    const [rule] = await db.update(woundenceInsuranceRules).set(data).where(eq(woundenceInsuranceRules.id, id)).returning();
    return rule;
  }

  async createFile(data: InsertWoundenceFile): Promise<WoundenceFile> {
    const [file] = await db.insert(woundenceFiles).values(data).returning();
    return file;
  }

  async getFilesByPatient(patientId: string): Promise<WoundenceFile[]> {
    return await db.select().from(woundenceFiles).where(eq(woundenceFiles.patientId, patientId)).orderBy(desc(woundenceFiles.createdAt));
  }

  async getFilesByVisit(visitId: string): Promise<WoundenceFile[]> {
    return await db.select().from(woundenceFiles).where(eq(woundenceFiles.visitId, visitId)).orderBy(desc(woundenceFiles.createdAt));
  }

  async getFilesByWoundAssessment(assessmentId: string): Promise<WoundenceFile[]> {
    return await db.select().from(woundenceFiles).where(eq(woundenceFiles.woundAssessmentId, assessmentId)).orderBy(desc(woundenceFiles.createdAt));
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(woundenceFiles).where(eq(woundenceFiles.id, id));
  }

  async createAuditLog(data: InsertWoundenceAuditLog): Promise<WoundenceAuditLog> {
    const [log] = await db.insert(woundenceAuditLogs).values(data).returning();
    return log;
  }

  async getAuditLogs() {
    const rows = await db.select().from(woundenceAuditLogs)
      .innerJoin(woundenceUsers, eq(woundenceAuditLogs.userId, woundenceUsers.id))
      .orderBy(desc(woundenceAuditLogs.timestamp));
    return rows.map(({ woundence_audit_logs: log, woundence_users: user }) => ({ ...log, user }));
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayResult] = await db.select({ count: count() }).from(woundenceAppointments)
      .where(and(gte(woundenceAppointments.appointmentDate, today), lte(woundenceAppointments.appointmentDate, tomorrow), ne(woundenceAppointments.status, 'cancelled')));

    const [activePatientsResult] = await db.select({ count: count() }).from(woundencePatients).where(eq(woundencePatients.isActive, true));
    const [totalWoundsResult] = await db.select({ count: count() }).from(woundenceWounds).where(eq(woundenceWounds.isActive, true));

    return {
      todayAppointments: Number(todayResult.count),
      activePatients: Number(activePatientsResult.count),
      totalWounds: Number(totalWoundsResult.count),
      healingRate: 87,
    };
  }
}

export const woundenceStorage = new WoundenceStorage();
