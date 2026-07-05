import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        onPress={() => setSelectedPatient(null)}
        style={styles.backRow}
      >
        <Feather name="chevron-left" size={18} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>
          {selectedPatient.firstName} {selectedPatient.lastName}
        </Text>
      </Pressable>

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
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const fileId = filesByAssessment.get(item.id);
            return (
              <View
                style={[
                  styles.photoCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
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
                <Text style={[styles.photoDate, { color: colors.foreground }]}>
                  {fmtDate(item.assessmentDate)}
                </Text>
                <Text style={[styles.photoMeta, { color: colors.mutedForeground }]}>
                  {item.tissueType ?? "—"}
                </Text>
              </View>
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  backText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  photoCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  photo: {
    width: "100%",
    aspectRatio: 1,
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
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 12,
  },
});
