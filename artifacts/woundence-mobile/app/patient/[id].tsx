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

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Tag } from "@/components/Tag";
import typography from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import {
  apiImageUrl,
  getAssessmentsForPatient,
  getFilesForPatient,
  getPatient,
  getWoundsForPatient,
  type WoundAssessment,
} from "@/lib/api";
import { computeHealingTrend, HEALING_TREND_LABELS, type HealingTrend } from "@/lib/woundTrend";

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

const TREND_TONE: Record<Exclude<HealingTrend, null>, "good" | "watch" | "concern"> = {
  improving: "good",
  stable: "watch",
  worsening: "concern",
};

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
  const allAssessments: WoundAssessment[] = assessmentsQuery.data ?? [];

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
          <Text style={[typography.body, styles.emptyText, { color: colors.mutedForeground }]}>
            Patient not found.
          </Text>
        ) : (
          <>
            <Card style={{ gap: 4 }}>
              <Text style={[typography.h1, { color: colors.foreground }]}>
                {patient.firstName} {patient.lastName}
              </Text>
              {patient.dateOfBirth ? (
                <Text style={[typography.body, { color: colors.mutedForeground }]}>
                  DOB: {fmtDate(patient.dateOfBirth)}
                </Text>
              ) : null}
              {patient.phone ? (
                <Text style={[typography.body, { color: colors.mutedForeground }]}>
                  {patient.phone}
                </Text>
              ) : null}
              <Button
                label="Capture wound image"
                onPress={() => router.push(`/capture/${patient.id}`)}
                icon={<Feather name="camera" size={16} color={colors.primaryForeground} />}
                fullWidth
                style={{ marginTop: 8 }}
              />
            </Card>

            <Text style={[typography.h3, styles.sectionTitle, { color: colors.foreground }]}>
              Wounds
            </Text>
            {(woundsQuery.data ?? []).length === 0 ? (
              <Text style={[typography.caption, styles.emptyTextSmall, { color: colors.mutedForeground }]}>
                No wounds recorded.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {(woundsQuery.data ?? []).map((wound) => (
                  <Card key={wound.id} style={styles.itemCard}>
                    <Feather name="activity" size={18} color={colors.primary} />
                    <View style={styles.itemInfo}>
                      <Text style={[typography.bodySemibold, { color: colors.foreground }]}>
                        {wound.location}
                      </Text>
                      {wound.woundType ? (
                        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                          {wound.woundType}
                          {wound.status ? ` · ${wound.status}` : ""}
                        </Text>
                      ) : null}
                    </View>
                  </Card>
                ))}
              </View>
            )}

            <Text style={[typography.h3, styles.sectionTitle, { color: colors.foreground }]}>
              Assessment History
            </Text>
            {allAssessments.length === 0 ? (
              <Text style={[typography.caption, styles.emptyTextSmall, { color: colors.mutedForeground }]}>
                No assessments recorded.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {allAssessments.map((assessment) => {
                  const fileId = assessment.id ? filesByAssessment.get(assessment.id) : undefined;
                  const isExpanded = expandedAssessmentId === assessment.id;
                  const trend = computeHealingTrend(allAssessments, assessment);
                  return (
                    <Pressable
                      key={assessment.id}
                      onPress={() => setExpandedAssessmentId(isExpanded ? null : assessment.id)}
                    >
                      <Card>
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
                              <Feather name="image" size={20} color={colors.mutedForeground} />
                            </View>
                          )}
                          <View style={styles.itemInfo}>
                            <Text style={[typography.bodySemibold, { color: colors.foreground }]}>
                              {fmtDate(assessment.assessmentDate)}
                            </Text>
                            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                              {assessment.tissueType ?? "—"}
                              {assessment.length ? ` · ${assessment.length}×${assessment.width ?? "?"}cm` : ""}
                            </Text>
                            {trend ? (
                              <View style={{ marginTop: 2 }}>
                                <Tag label={HEALING_TREND_LABELS[trend]} tone={TREND_TONE[trend]} />
                              </View>
                            ) : null}
                            {assessment.notes ? (
                              <Text
                                numberOfLines={isExpanded ? undefined : 2}
                                style={[typography.caption, { color: colors.mutedForeground }]}
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
                          <View style={[styles.expandedDetail, { borderTopColor: colors.border }]}>
                            <Text style={[typography.caption, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                              {assessment.aiAnalysis.woundClassification}
                              {assessment.aiAnalysis.pressureInjuryStage ? ` · ${assessment.aiAnalysis.pressureInjuryStage}` : ""}
                            </Text>
                            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                              Tissue: {assessment.aiAnalysis.tissueComposition.granulation}% granulation ·{" "}
                              {assessment.aiAnalysis.tissueComposition.slough}% slough ·{" "}
                              {assessment.aiAnalysis.tissueComposition.necrotic}% necrotic
                            </Text>
                            {assessment.aiAnalysis.recommendations.map((rec, i) => (
                              <Text key={i} style={[typography.caption, { color: colors.mutedForeground }]}>
                                • {rec}
                              </Text>
                            ))}
                          </View>
                        )}
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
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
    gap: 10,
  },
  sectionTitle: {
    marginTop: 4,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  assessmentImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  assessmentImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  expandedDetail: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
  },
  emptyTextSmall: {
    marginBottom: 8,
  },
});
