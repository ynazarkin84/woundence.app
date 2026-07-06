import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  apiImageUrl,
  getAssessmentsForPatient,
  getFilesForPatient,
  getPatient,
  getWoundsForPatient,
} from "@/lib/api";

function fmtDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PatientProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);

  const patientQuery = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
    enabled: !!id,
  });
  const woundsQuery = useQuery({
    queryKey: ["wounds", id],
    queryFn: () => getWoundsForPatient(id),
    enabled: !!id,
  });
  const assessmentsQuery = useQuery({
    queryKey: ["assessments", id],
    queryFn: () => getAssessmentsForPatient(id),
    enabled: !!id,
  });
  const filesQuery = useQuery({
    queryKey: ["patient-files", id],
    queryFn: () => getFilesForPatient(id),
    enabled: !!id,
  });

  const patient = patientQuery.data;
  const isLoading = patientQuery.isLoading;

  const filesByAssessment = new Map<string, string>();
  for (const f of filesQuery.data ?? []) {
    if (f.assessmentId && !filesByAssessment.has(f.assessmentId)) {
      filesByAssessment.set(f.assessmentId, f.id);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: patient ? `${patient.firstName} ${patient.lastName}` : "Patient",
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
        ) : !patient ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Patient not found.
          </Text>
        ) : (
          <>
            <View
              style={[
                styles.headerCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.patientName, { color: colors.foreground }]}>
                {patient.firstName} {patient.lastName}
              </Text>
              {patient.dateOfBirth ? (
                <Text
                  style={[styles.patientMeta, { color: colors.mutedForeground }]}
                >
                  DOB: {fmtDate(patient.dateOfBirth)}
                </Text>
              ) : null}
              {patient.phone ? (
                <Text
                  style={[styles.patientMeta, { color: colors.mutedForeground }]}
                >
                  {patient.phone}
                </Text>
              ) : null}
              <Pressable
                onPress={() => router.push(`/capture/${patient.id}`)}
                style={[styles.captureButton, { backgroundColor: colors.primary }]}
              >
                <Feather name="camera" size={16} color={colors.primaryForeground} />
                <Text style={[styles.captureButtonText, { color: colors.primaryForeground }]}>
                  Capture Wound Image
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Wounds
            </Text>
            {(woundsQuery.data ?? []).length === 0 ? (
              <Text
                style={[styles.emptyTextSmall, { color: colors.mutedForeground }]}
              >
                No wounds recorded.
              </Text>
            ) : (
              (woundsQuery.data ?? []).map((wound) => (
                <View
                  key={wound.id}
                  style={[
                    styles.itemCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Feather name="activity" size={18} color={colors.primary} />
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemTitle, { color: colors.foreground }]}>
                      {wound.location}
                    </Text>
                    {wound.woundType ? (
                      <Text
                        style={[styles.itemMeta, { color: colors.mutedForeground }]}
                      >
                        {wound.woundType}
                        {wound.status ? ` · ${wound.status}` : ""}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Assessment History
            </Text>
            {(assessmentsQuery.data ?? []).length === 0 ? (
              <Text
                style={[styles.emptyTextSmall, { color: colors.mutedForeground }]}
              >
                No assessments recorded.
              </Text>
            ) : (
              (assessmentsQuery.data ?? []).map((assessment) => {
                const fileId = assessment.id
                  ? filesByAssessment.get(assessment.id)
                  : undefined;
                const isExpanded = expandedAssessmentId === assessment.id;
                return (
                  <Pressable
                    key={assessment.id}
                    onPress={() =>
                      setExpandedAssessmentId(isExpanded ? null : assessment.id)
                    }
                    style={[
                      styles.assessmentCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {fileId ? (
                        <Image
                          source={{ uri: apiImageUrl(fileId) }}
                          style={styles.assessmentImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.assessmentImage,
                            styles.assessmentImagePlaceholder,
                            { backgroundColor: colors.muted },
                          ]}
                        >
                          <Feather
                            name="image"
                            size={20}
                            color={colors.mutedForeground}
                          />
                        </View>
                      )}
                      <View style={styles.itemInfo}>
                        <Text
                          style={[styles.itemTitle, { color: colors.foreground }]}
                        >
                          {fmtDate(assessment.assessmentDate)}
                        </Text>
                        <Text
                          style={[styles.itemMeta, { color: colors.mutedForeground }]}
                        >
                          {assessment.tissueType ?? "—"}
                          {assessment.length ? ` · ${assessment.length}×${assessment.width ?? "?"}cm` : ""}
                        </Text>
                        {assessment.notes ? (
                          <Text
                            numberOfLines={isExpanded ? undefined : 2}
                            style={[styles.itemMeta, { color: colors.mutedForeground }]}
                          >
                            {assessment.notes}
                          </Text>
                        ) : null}
                      </View>
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.mutedForeground}
                      />
                    </View>

                    {isExpanded && assessment.aiAnalysis && (
                      <View style={styles.expandedDetail}>
                        <Text style={[styles.itemMeta, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                          {assessment.aiAnalysis.woundClassification}
                          {assessment.aiAnalysis.pressureInjuryStage ? ` · ${assessment.aiAnalysis.pressureInjuryStage}` : ""}
                        </Text>
                        <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                          Tissue: {assessment.aiAnalysis.tissueComposition.granulation}% granulation ·{" "}
                          {assessment.aiAnalysis.tissueComposition.slough}% slough ·{" "}
                          {assessment.aiAnalysis.tissueComposition.necrotic}% necrotic
                        </Text>
                        {assessment.aiAnalysis.recommendations.map((rec, i) => (
                          <Text key={i} style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                            • {rec}
                          </Text>
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
    gap: 8,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 4,
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  captureButtonText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  expandedDetail: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
    gap: 4,
  },
  patientName: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  patientMeta: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginTop: 12,
    marginBottom: 4,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  assessmentCard: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  assessmentImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  assessmentImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  itemMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  emptyTextSmall: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
});
