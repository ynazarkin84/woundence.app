import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Tag } from "@/components/Tag";
import typography from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import {
  apiImageUrl,
  getAssessmentsForPatient,
  getFilesForPatient,
  getPatients,
  type Patient,
  type WoundAssessment,
} from "@/lib/api";
import { computeHealingTrend, HEALING_TREND_LABELS, type HealingTrend } from "@/lib/woundTrend";

function fmtDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const TREND_TONE: Record<Exclude<HealingTrend, null>, "good" | "watch" | "concern"> = {
  improving: "good",
  stable: "watch",
  worsening: "concern",
};

export default function WoundImagingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: () => getPatients(),
  });

  const assessmentsQuery = useQuery({
    queryKey: ["assessments", selectedPatient?.id],
    queryFn: () => getAssessmentsForPatient(selectedPatient!.id),
    enabled: !!selectedPatient,
  });

  const filesQuery = useQuery({
    queryKey: ["patient-files", selectedPatient?.id],
    queryFn: () => getFilesForPatient(selectedPatient!.id),
    enabled: !!selectedPatient,
  });

  const filesByAssessment = new Map<string, string>();
  for (const f of filesQuery.data ?? []) {
    if (f.assessmentId && !filesByAssessment.has(f.assessmentId)) {
      filesByAssessment.set(f.assessmentId, f.id);
    }
  }

  const allAssessments: WoundAssessment[] = assessmentsQuery.data ?? [];

  if (!selectedPatient) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
        <Text style={[typography.h3, { color: colors.foreground, marginBottom: 8 }]}>
          Select a patient
        </Text>
        {patientsQuery.isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
        ) : (
          <FlatList
            data={patientsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedPatient(item)}>
                <Card style={styles.patientRow}>
                  <Text style={[typography.bodyMedium, { color: colors.foreground }]}>
                    {item.firstName} {item.lastName}
                  </Text>
                  <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                </Card>
              </Pressable>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => setSelectedPatient(null)} style={styles.backRow}>
          <Feather name="chevron-left" size={18} color={colors.primary} />
          <Text style={[typography.bodySemibold, { color: colors.primary }]}>
            {selectedPatient.firstName} {selectedPatient.lastName}
          </Text>
        </Pressable>
        <Button
          label="Capture"
          onPress={() => router.push(`/capture/${selectedPatient.id}`)}
          icon={<Feather name="camera" size={16} color={colors.primaryForeground} />}
          style={styles.captureButton}
        />
      </View>

      <Text style={[typography.h3, { color: colors.foreground, marginBottom: 8 }]}>
        Wound Healing History
      </Text>

      {assessmentsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : allAssessments.length === 0 ? (
        <Text style={[typography.body, styles.emptyText, { color: colors.mutedForeground }]}>
          No wound images recorded for this patient.
        </Text>
      ) : (
        <FlatList
          data={allAssessments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const fileId = filesByAssessment.get(item.id);
            const isExpanded = expandedId === item.id;
            const trend = computeHealingTrend(allAssessments, item);
            return (
              <Pressable onPress={() => setExpandedId(isExpanded ? null : item.id)}>
                <Card>
                  <View style={styles.photoRow}>
                    {fileId ? (
                      <Image source={{ uri: apiImageUrl(fileId) }} style={styles.photo} contentFit="cover" />
                    ) : (
                      <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
                        <Feather name="image" size={22} color={colors.mutedForeground} />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={[typography.captionSemibold, { color: colors.foreground }]}>
                        {fmtDate(item.assessmentDate)}
                      </Text>
                      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                        {item.tissueType ?? "—"}
                      </Text>
                      {trend ? (
                        <Tag label={HEALING_TREND_LABELS[trend]} tone={TREND_TONE[trend]} />
                      ) : null}
                    </View>
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </View>

                  {isExpanded && item.aiAnalysis && (
                    <View style={[styles.expandedDetail, { borderTopColor: colors.border }]}>
                      <Text style={[typography.caption, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                        {item.aiAnalysis.woundClassification}
                        {item.aiAnalysis.pressureInjuryStage ? ` · ${item.aiAnalysis.pressureInjuryStage}` : ""}
                      </Text>
                      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                        Tissue: {item.aiAnalysis.tissueComposition.granulation}% granulation ·{" "}
                        {item.aiAnalysis.tissueComposition.slough}% slough ·{" "}
                        {item.aiAnalysis.tissueComposition.necrotic}% necrotic
                      </Text>
                      {item.aiAnalysis.recommendations.map((rec, i) => (
                        <Text key={i} style={[typography.caption, { color: colors.mutedForeground }]}>
                          • {rec}
                        </Text>
                      ))}
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  captureButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  expandedDetail: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  emptyText: {
    marginTop: 12,
  },
});
