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

import { useColors } from "@/hooks/useColors";
import {
  apiImageUrl,
  getAssessmentsForPatient,
  getFilesForPatient,
  getPatients,
  type Patient,
} from "@/lib/api";

function fmtDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

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

  if (!selectedPatient) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Select a patient
        </Text>
        {patientsQuery.isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
        ) : (
          <FlatList
            data={patientsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedPatient(item)}
                style={[styles.row, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {item.firstName} {item.lastName}
                </Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={colors.mutedForeground}
                />
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
        <Pressable
          onPress={() => setSelectedPatient(null)}
          style={styles.backRow}
        >
          <Feather name="chevron-left" size={18} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>
            {selectedPatient.firstName} {selectedPatient.lastName}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/capture/${selectedPatient.id}`)}
          style={[styles.captureButton, { backgroundColor: colors.primary }]}
        >
          <Feather name="camera" size={16} color={colors.primaryForeground} />
          <Text style={[styles.captureButtonText, { color: colors.primaryForeground }]}>
            Capture
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Wound Healing History
      </Text>

      {assessmentsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : (assessmentsQuery.data ?? []).length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No wound images recorded for this patient.
        </Text>
      ) : (
        <FlatList
          data={assessmentsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const fileId = filesByAssessment.get(item.id);
            const isExpanded = expandedId === item.id;
            return (
              <Pressable
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
                style={[
                  styles.photoCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.photoRow}>
                  {fileId ? (
                    <Image
                      source={{ uri: apiImageUrl(fileId) }}
                      style={styles.photo}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={[styles.photo, styles.photoPlaceholder, { backgroundColor: colors.muted }]}
                    >
                      <Feather name="image" size={22} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.photoDate, { color: colors.foreground }]}>
                      {fmtDate(item.assessmentDate)}
                    </Text>
                    <Text style={[styles.photoMeta, { color: colors.mutedForeground }]}>
                      {item.tissueType ?? "—"}
                    </Text>
                  </View>
                  <Feather
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </View>

                {isExpanded && item.aiAnalysis && (
                  <View style={styles.expandedDetail}>
                    <Text style={[styles.photoMeta, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {item.aiAnalysis.woundClassification}
                      {item.aiAnalysis.pressureInjuryStage ? ` · ${item.aiAnalysis.pressureInjuryStage}` : ""}
                    </Text>
                    <Text style={[styles.photoMeta, { color: colors.mutedForeground }]}>
                      Tissue: {item.aiAnalysis.tissueComposition.granulation}% granulation ·{" "}
                      {item.aiAnalysis.tissueComposition.slough}% slough ·{" "}
                      {item.aiAnalysis.tissueComposition.necrotic}% necrotic
                    </Text>
                    {item.aiAnalysis.recommendations.map((rec, i) => (
                      <Text key={i} style={[styles.photoMeta, { color: colors.mutedForeground }]}>
                        • {rec}
                      </Text>
                    ))}
                  </View>
                )}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
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
  backText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  captureButtonText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  photoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoDate: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  photoMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  expandedDetail: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
    gap: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 12,
  },
});
