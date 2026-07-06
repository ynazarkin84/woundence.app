import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/woundenceClerkAuth";
import { woundenceStorage } from "../lib/woundenceStorage";
import { woundenceUpload, processWoundImage } from "../lib/woundenceFileUpload";
import { analyzeWoundImage } from "../lib/woundenceClaude";
import { getSignedUrl, uploadToStorage } from "../lib/supabaseStorage";
import { db, woundenceFiles, woundenceWounds } from "@workspace/db";
import {
  insertWoundencePatientSchema,
  insertWoundenceAppointmentSchema,
  insertWoundenceWoundSchema,
  insertWoundenceWoundAssessmentSchema,
  insertWoundenceVisitSchema,
  insertWoundenceTreatmentPlanSchema,
  insertWoundenceInsuranceRuleSchema,
  insertWoundenceFileSchema,
  woundencePublicBookingSchema,
} from "@workspace/db";

const router = Router();

// Each call here hits the paid Anthropic vision API, so it gets a much
// tighter limit than the general per-IP ceiling in app.ts. Keyed by the
// authenticated local user (set by requireAuth, which always runs first)
// rather than IP, so providers sharing an office network aren't penalized
// for each other's usage.
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.userId ?? ipKeyGenerator(req.ip),
  message: { message: "Too many wound analysis requests — please wait a moment and try again." },
});

// User routes
router.get("/user", requireAuth, async (req: any, res: any) => {
  res.json(req.localUser);
});

// Auth user endpoint (used by frontend useAuth hook). requireAuth already
// resolves (and JIT-provisions) the local user from the Clerk session.
router.get("/auth/user", requireAuth, async (req: any, res: any) => {
  res.json(req.localUser);
});

router.get("/providers", requireAuth, async (req: any, res: any) => {
  try {
    const providers = await woundenceStorage.getProviders();
    res.json(providers);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching providers");
    res.status(500).json({ message: "Failed to fetch providers" });
  }
});

// User management — any active (non-pending) provider can see and approve
// pending sign-ups. There's no separate admin tier: this app is a
// single-clinic EMR where every active provider is already trusted with all
// patient data, so the same trust extends to approving new colleagues.
const ALLOWED_ROLES = ["provider", "pending", "staff"];

router.get("/users", requireAuth, async (req: any, res: any) => {
  try {
    const users = await woundenceStorage.getAllUsers();
    res.json(users);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching users");
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.patch("/users/:id/role", requireAuth, async (req: any, res: any) => {
  try {
    const { role } = req.body;
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: `role must be one of: ${ALLOWED_ROLES.join(", ")}` });
    }
    const user = await woundenceStorage.updateUserRole(req.params.id, role);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "update", entityType: "user_role", entityId: req.params.id, newValues: { role }, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.json(user);
  } catch (error: any) {
    req.log.error({ error }, "Error updating user role");
    res.status(400).json({ message: "Failed to update user role" });
  }
});

// Patient routes
router.get("/patients", requireAuth, async (req: any, res: any) => {
  try {
    const { search } = req.query;
    if (search) {
      const patients = await woundenceStorage.searchPatients(String(search));
      return res.json(patients);
    }
    const patients = await woundenceStorage.getPatients();
    res.json(patients);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching patients");
    res.status(500).json({ message: "Failed to fetch patients" });
  }
});

// Legacy search alias — frontend calls GET /api/patients/search?q=...
router.get("/patients/search", requireAuth, async (req: any, res: any) => {
  try {
    const q = req.query.q ?? req.query.search ?? "";
    const patients = await woundenceStorage.searchPatients(String(q));
    res.json(patients);
  } catch (error: any) {
    req.log.error({ error }, "Error searching patients");
    res.status(500).json({ message: "Failed to search patients" });
  }
});

router.get("/patients/:id", requireAuth, async (req: any, res: any) => {
  try {
    const patient = await woundenceStorage.getPatient(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching patient");
    res.status(500).json({ message: "Failed to fetch patient" });
  }
});

router.post("/patients", requireAuth, async (req: any, res: any) => {
  try {
    const data = insertWoundencePatientSchema.parse(req.body);
    const patient = await woundenceStorage.createPatient(data);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "create", entityType: "patient", entityId: patient.id, newValues: patient, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.status(201).json(patient);
  } catch (error: any) {
    req.log.error({ error }, "Error creating patient");
    res.status(400).json({ message: "Failed to create patient", error: error.message });
  }
});

router.patch("/patients/:id", requireAuth, async (req: any, res: any) => {
  try {
    const patient = await woundenceStorage.updatePatient(req.params.id, req.body);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "update", entityType: "patient", entityId: req.params.id, newValues: patient, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.json(patient);
  } catch (error: any) {
    req.log.error({ error }, "Error updating patient");
    res.status(400).json({ message: "Failed to update patient" });
  }
});

router.delete("/patients/:id", requireAuth, async (req: any, res: any) => {
  try {
    await woundenceStorage.deletePatient(req.params.id);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "delete", entityType: "patient", entityId: req.params.id, newValues: null, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.json({ message: "Patient deleted successfully" });
  } catch (error: any) {
    req.log.error({ error }, "Error deleting patient");
    res.status(500).json({ message: "Failed to delete patient" });
  }
});

// Appointment routes
router.get("/appointments", requireAuth, async (req: any, res: any) => {
  try {
    const { date, providerId } = req.query;
    if (date) {
      const appointments = await woundenceStorage.getAppointmentsByDateAndProvider(new Date(String(date)), providerId ? String(providerId) : undefined);
      return res.json(appointments);
    }
    const appointments = await woundenceStorage.getAppointments();
    res.json(appointments);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching appointments");
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

router.get("/appointments/patient/:patientId", requireAuth, async (req: any, res: any) => {
  try {
    const appointments = await woundenceStorage.getAppointmentsByPatient(req.params.patientId);
    res.json(appointments);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching patient appointments");
    res.status(500).json({ message: "Failed to fetch patient appointments" });
  }
});

router.post("/appointments", requireAuth, async (req: any, res: any) => {
  try {
    const data = insertWoundenceAppointmentSchema.parse(req.body);
    const appointment = await woundenceStorage.createAppointment(data);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "create", entityType: "appointment", entityId: appointment.id, newValues: appointment, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.status(201).json(appointment);
  } catch (error: any) {
    req.log.error({ error }, "Error creating appointment");
    res.status(400).json({ message: "Failed to create appointment", error: error.message });
  }
});

router.patch("/appointments/:id", requireAuth, async (req: any, res: any) => {
  try {
    const appointment = await woundenceStorage.updateAppointment(req.params.id, req.body);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "update", entityType: "appointment", entityId: req.params.id, newValues: appointment, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.json(appointment);
  } catch (error: any) {
    req.log.error({ error }, "Error updating appointment (PATCH)");
    res.status(400).json({ message: "Failed to update appointment" });
  }
});

router.put("/appointments/:id", requireAuth, async (req: any, res: any) => {
  try {
    const appointment = await woundenceStorage.updateAppointment(req.params.id, req.body);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "update", entityType: "appointment", entityId: req.params.id, newValues: appointment, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.json(appointment);
  } catch (error: any) {
    req.log.error({ error }, "Error updating appointment (PUT)");
    res.status(400).json({ message: "Failed to update appointment" });
  }
});

router.delete("/appointments/:id", requireAuth, async (req: any, res: any) => {
  try {
    await woundenceStorage.deleteAppointment(req.params.id);
    res.json({ message: "Appointment deleted" });
  } catch (error: any) {
    req.log.error({ error }, "Error deleting appointment");
    res.status(500).json({ message: "Failed to delete appointment" });
  }
});

// Wound routes
router.get("/wounds/patient/:patientId", requireAuth, async (req: any, res: any) => {
  try {
    const wounds = await woundenceStorage.getWoundsByPatient(req.params.patientId);
    res.json(wounds);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching wounds");
    res.status(500).json({ message: "Failed to fetch wounds" });
  }
});

router.post("/wounds", requireAuth, async (req: any, res: any) => {
  try {
    const data = insertWoundenceWoundSchema.parse(req.body);
    const wound = await woundenceStorage.createWound(data);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "create", entityType: "wound", entityId: wound.id, newValues: wound, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.status(201).json(wound);
  } catch (error: any) {
    req.log.error({ error }, "Error creating wound");
    res.status(400).json({ message: "Failed to create wound", error: error.message });
  }
});

router.patch("/wounds/:id", requireAuth, async (req: any, res: any) => {
  try {
    const wound = await woundenceStorage.updateWound(req.params.id, req.body);
    res.json(wound);
  } catch (error: any) {
    req.log.error({ error }, "Error updating wound");
    res.status(400).json({ message: "Failed to update wound" });
  }
});

// Wound assessment routes
router.get("/wound-assessments/patient/:patientId", requireAuth, async (req: any, res: any) => {
  try {
    const assessments = await woundenceStorage.getWoundAssessmentsByPatient(req.params.patientId);
    res.json(assessments);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching wound assessments by patient");
    res.status(500).json({ message: "Failed to fetch wound assessments" });
  }
});

router.get("/wounds/:woundId/assessments", requireAuth, async (req: any, res: any) => {
  try {
    const assessments = await woundenceStorage.getWoundAssessmentsByWound(req.params.woundId);
    res.json(assessments);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching wound assessments by wound");
    res.status(500).json({ message: "Failed to fetch wound assessments" });
  }
});

router.post("/wound-assessments", requireAuth, async (req: any, res: any) => {
  try {
    const data = insertWoundenceWoundAssessmentSchema.parse(req.body);
    const assessment = await woundenceStorage.createWoundAssessment(data);

    if (data.imageUrl) {
      try {
        // data.imageUrl is a Supabase Storage object path (e.g.
        // "wounds/<uuid>.webp") set by the /analyze step below, which
        // already uploaded the bytes — this just links that object to the
        // assessment. fileSize is unknown here without an extra Storage
        // round-trip, so it's stored as 0 (informational column only).
        const woundRows = await db.select().from(woundenceWounds).where(eq(woundenceWounds.id, data.woundId)).limit(1);
        const wound = woundRows[0];
        if (wound) {
          const fileName = String(data.imageUrl).split("/").pop() || "wound-image.webp";
          await woundenceStorage.createFile({
            patientId: wound.patientId,
            woundAssessmentId: assessment.id,
            fileName,
            originalName: fileName,
            fileType: "image",
            mimeType: "image/webp",
            fileSize: 0,
            filePath: String(data.imageUrl),
            uploadedBy: req.userId,
          });
        }
      } catch (fileError) {
        req.log.warn({ fileError }, "Failed to create file record for wound assessment image");
      }
    }

    await woundenceStorage.createAuditLog({ userId: req.userId, action: "create", entityType: "wound_assessment", entityId: assessment.id, newValues: assessment, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.status(201).json(assessment);
  } catch (error: any) {
    req.log.error({ error }, "Error creating wound assessment");
    res.status(400).json({ message: "Failed to create wound assessment", error: error.message });
  }
});

router.patch("/wound-assessments/:id", requireAuth, async (req: any, res: any) => {
  try {
    await woundenceStorage.updateWoundAssessment(req.params.id, req.body);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "update", entityType: "wound_assessment", entityId: req.params.id, newValues: req.body, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.json({ message: "Wound assessment updated successfully" });
  } catch (error: any) {
    req.log.error({ error }, "Error updating wound assessment");
    res.status(500).json({ message: "Failed to update wound assessment" });
  }
});

router.delete("/wound-assessments/:id", requireAuth, async (req: any, res: any) => {
  try {
    await woundenceStorage.deleteWoundAssessment(req.params.id);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "delete", entityType: "wound_assessment", entityId: req.params.id, newValues: null, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.json({ message: "Wound assessment deleted successfully" });
  } catch (error: any) {
    req.log.error({ error }, "Error deleting wound assessment");
    res.status(500).json({ message: "Failed to delete wound assessment" });
  }
});

// Legacy alias — frontend posts to /api/wound-assessments/analyze
router.post("/wound-assessments/analyze", requireAuth, analyzeLimiter, woundenceUpload.single("wound-image"), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image file provided" });
    const processedImage = await processWoundImage(req.file.buffer);
    const analysis = await analyzeWoundImage(processedImage.buffer, processedImage.metadata);
    const objectPath = `wounds/${randomUUID()}.webp`;
    await uploadToStorage(objectPath, processedImage.buffer, "image/webp");
    res.json({
      analysis,
      imageMetadata: processedImage.metadata,
      imagePath: objectPath,
    });
  } catch (error: any) {
    req.log.error({ error }, "Error processing wound image");
    res.status(500).json({ message: error.message || "Failed to process wound image" });
  }
});

// Wound imaging - upload & analyze
router.post("/wound-imaging/upload", requireAuth, analyzeLimiter, woundenceUpload.single("wound-image"), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image file provided" });

    const processedImage = await processWoundImage(req.file.buffer);

    const analysis = await analyzeWoundImage(processedImage.buffer, processedImage.metadata);

    const objectPath = `wounds/${randomUUID()}.webp`;
    await uploadToStorage(objectPath, processedImage.buffer, "image/webp");

    res.json({
      analysis,
      imageMetadata: processedImage.metadata,
      imagePath: objectPath,
    });
  } catch (error: any) {
    req.log.error({ error }, "Error processing wound image");
    res.status(500).json({ message: error.message || "Failed to process wound image" });
  }
});

// Serve wound images — redirects to a short-lived Supabase Storage signed
// URL rather than serving the bytes directly, since the bucket is private
// (these are patient health photos). Both web <img> and mobile <Image>
// follow redirects transparently, so no client change is needed.
router.get("/files/:fileId/image", requireAuth, async (req: any, res: any) => {
  try {
    const result = await db.select().from(woundenceFiles).where(eq(woundenceFiles.id, req.params.fileId)).limit(1);
    const file = result[0];
    if (!file) return res.status(404).json({ message: "File not found" });
    if (!file.filePath) return res.status(404).json({ message: "File path not found" });

    const signedUrl = await getSignedUrl(file.filePath);
    res.redirect(302, signedUrl);
  } catch (error: any) {
    req.log.error({ error }, "Failed to serve file");
    res.status(500).json({ message: "Failed to serve file" });
  }
});

// File upload
router.post("/files/upload", requireAuth, woundenceUpload.single("file"), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const isImage = req.file.mimetype.startsWith("image/");
    const ext = req.file.originalname.includes(".") ? req.file.originalname.split(".").pop() : "bin";
    const objectPath = `documents/${randomUUID()}.${ext}`;
    await uploadToStorage(objectPath, req.file.buffer, req.file.mimetype);
    const data = insertWoundenceFileSchema.parse({
      patientId: req.body.patientId,
      visitId: req.body.visitId || null,
      woundAssessmentId: req.body.woundAssessmentId || null,
      fileName: `${randomUUID()}.${ext}`,
      originalName: req.file.originalname,
      fileType: isImage ? "image" : "document",
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: objectPath,
      uploadedBy: req.userId,
    });
    const file = await woundenceStorage.createFile(data);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "create", entityType: "file", entityId: file.id, newValues: file, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.status(201).json(file);
  } catch (error: any) {
    req.log.error({ error }, "Failed to upload file");
    res.status(500).json({ message: "Failed to upload file" });
  }
});

router.get("/files/patient/:patientId", requireAuth, async (req: any, res: any) => {
  try {
    const files = await woundenceStorage.getFilesByPatient(req.params.patientId);
    res.json(files);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching patient files");
    res.status(500).json({ message: "Failed to fetch patient files" });
  }
});

router.get("/wound-assessments/:assessmentId/files", requireAuth, async (req: any, res: any) => {
  try {
    const files = await woundenceStorage.getFilesByWoundAssessment(req.params.assessmentId);
    res.json(files);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching assessment files");
    res.status(500).json({ message: "Failed to fetch assessment files" });
  }
});

// Visit routes
router.get("/visits", requireAuth, async (req: any, res: any) => {
  try {
    const visits = await woundenceStorage.getVisits();
    res.json(visits);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching visits");
    res.status(500).json({ message: "Failed to fetch visits" });
  }
});

router.get("/visits/patient/:patientId", requireAuth, async (req: any, res: any) => {
  try {
    const visits = await woundenceStorage.getVisitsByPatient(req.params.patientId);
    res.json(visits);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching patient visits");
    res.status(500).json({ message: "Failed to fetch patient visits" });
  }
});

router.post("/visits", requireAuth, async (req: any, res: any) => {
  try {
    const data = insertWoundenceVisitSchema.parse(req.body);
    const visit = await woundenceStorage.createVisit(data);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "create", entityType: "visit", entityId: visit.id, newValues: visit, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.status(201).json(visit);
  } catch (error: any) {
    req.log.error({ error }, "Error creating visit");
    res.status(400).json({ message: "Failed to create visit" });
  }
});

router.patch("/visits/:id", requireAuth, async (req: any, res: any) => {
  try {
    const visit = await woundenceStorage.updateVisit(req.params.id, req.body);
    res.json(visit);
  } catch (error: any) {
    req.log.error({ error }, "Error updating visit");
    res.status(400).json({ message: "Failed to update visit" });
  }
});

// Treatment plan routes
router.get("/treatment-plans/patient/:patientId", requireAuth, async (req: any, res: any) => {
  try {
    const plans = await woundenceStorage.getTreatmentPlansByPatient(req.params.patientId);
    res.json(plans);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching treatment plans");
    res.status(500).json({ message: "Failed to fetch treatment plans" });
  }
});

router.post("/treatment-plans", requireAuth, async (req: any, res: any) => {
  try {
    const data = insertWoundenceTreatmentPlanSchema.parse({ ...req.body, createdBy: req.userId });
    const plan = await woundenceStorage.createTreatmentPlan(data);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "create", entityType: "treatment_plan", entityId: plan.id, newValues: plan, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.status(201).json(plan);
  } catch (error: any) {
    req.log.error({ error }, "Error creating treatment plan");
    res.status(400).json({ message: "Failed to create treatment plan" });
  }
});

router.patch("/treatment-plans/:id", requireAuth, async (req: any, res: any) => {
  try {
    const plan = await woundenceStorage.updateTreatmentPlan(req.params.id, req.body);
    res.json(plan);
  } catch (error: any) {
    req.log.error({ error }, "Error updating treatment plan");
    res.status(400).json({ message: "Failed to update treatment plan" });
  }
});

// Insurance routes
router.get("/insurance/rules", requireAuth, async (req: any, res: any) => {
  try {
    const rules = await woundenceStorage.getInsuranceRules();
    res.json(rules);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching insurance rules");
    res.status(500).json({ message: "Failed to fetch insurance rules" });
  }
});

router.post("/insurance/rules", requireAuth, async (req: any, res: any) => {
  try {
    const data = insertWoundenceInsuranceRuleSchema.parse(req.body);
    const rule = await woundenceStorage.createInsuranceRule(data);
    await woundenceStorage.createAuditLog({ userId: req.userId, action: "create", entityType: "insurance_rule", entityId: rule.id, newValues: rule, ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.status(201).json(rule);
  } catch (error: any) {
    req.log.error({ error }, "Error creating insurance rule");
    res.status(400).json({ message: "Failed to create insurance rule" });
  }
});

router.patch("/insurance/rules/:id", requireAuth, async (req: any, res: any) => {
  try {
    const rule = await woundenceStorage.updateInsuranceRule(req.params.id, req.body);
    res.json(rule);
  } catch (error: any) {
    req.log.error({ error }, "Error updating insurance rule");
    res.status(400).json({ message: "Failed to update insurance rule" });
  }
});

// Audit log routes
router.get("/audit-logs", requireAuth, async (req: any, res: any) => {
  try {
    const logs = await woundenceStorage.getAuditLogs();
    res.json(logs);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching audit logs");
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

// Dashboard stats
router.get("/dashboard/stats", requireAuth, async (req: any, res: any) => {
  try {
    const stats = await woundenceStorage.getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    req.log.error({ error }, "Error fetching dashboard stats");
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

// Public booking endpoint — requires BOOKING_API_KEY header (matches legacy behaviour)
const validateBookingApiKey = (req: any, res: any, next: any) => {
  const expectedKey = process.env.BOOKING_API_KEY;
  if (!expectedKey) {
    req.log.warn("BOOKING_API_KEY not configured — public booking endpoint is disabled");
    return res.status(503).json({ message: "Online booking is not configured" });
  }
  const provided = req.headers["x-api-key"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  if (!provided || provided !== expectedKey) {
    return res.status(401).json({ message: "Invalid or missing API key" });
  }
  next();
};

router.post("/public/book-appointment", validateBookingApiKey, async (req: any, res: any) => {
  try {
    const bookingData = woundencePublicBookingSchema.parse(req.body);
    const existingPatient = await woundenceStorage.getPatientByEmail(bookingData.email);
    let patient = existingPatient;

    if (!patient) {
      patient = await woundenceStorage.createPatient({
        firstName: bookingData.firstName,
        lastName: bookingData.lastName,
        dateOfBirth: bookingData.dateOfBirth,
        gender: "unknown",
        phone: bookingData.phone,
        email: bookingData.email,
        address: bookingData.address,
        allergies: bookingData.allergies,
        medications: bookingData.medications,
        insuranceProvider: bookingData.insuranceProvider,
        insuranceMemberId: bookingData.insuranceMemberId,
      });
    }

    const providers = await woundenceStorage.getProviders();
    const providerId = providers[0]?.id;
    if (!providerId) return res.status(500).json({ message: "No providers available" });

    const appointment = await woundenceStorage.createAppointment({
      patientId: patient.id,
      providerId,
      appointmentDate: new Date(bookingData.appointmentDate),
      appointmentType: bookingData.appointmentType,
      bookingSource: "online",
      notes: bookingData.notes,
    });

    res.status(201).json({ message: "Appointment booked successfully", appointment, patient });
  } catch (error: any) {
    req.log.error({ error }, "Error booking appointment");
    res.status(400).json({ message: "Failed to book appointment", error: error.message });
  }
});

export default router;
