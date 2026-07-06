import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  analyzeWoundPhoto,
  createWound,
  createWoundAssessment,
  type WoundAnalysisResult,
} from "@/lib/api";

type Photo = { uri: string; fileName: string; mimeType: string };

export default function CaptureWoundScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{
    analysis: WoundAnalysisResult;
    imagePath: string;
  } | null>(null);

  const pickFrom = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        `Woundence needs ${source === "camera" ? "camera" : "photo library"} access to capture wound photos.`
      );
      return;
    }

    const pickerResult =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.9, mediaTypes: ["images"] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.9, mediaTypes: ["images"] });

    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

    const asset = pickerResult.assets[0];
    // iOS photo library assets are frequently HEIC, which the backend's
    // upload filter rejects (it only accepts jpeg/png/webp). Re-encoding to
    // JPEG here guarantees a compatible upload regardless of source format,
    // instead of depending on the server's image library supporting HEIC.
    const jpeg = await ImageManipulator.manipulateAsync(asset.uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.9,
    });
    setPhoto({
      uri: jpeg.uri,
      fileName: `wound-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
    });
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!photo || !patientId) return;
    setIsAnalyzing(true);
    try {
      const response = await analyzeWoundPhoto({ ...photo, patientId });
      setResult({ analysis: response.analysis, imagePath: response.imagePath });
    } catch (err) {
      Alert.alert(
        "Analysis failed",
        err instanceof Error ? err.message : "Could not analyze this photo. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !patientId) return;
    setIsSaving(true);
    try {
      const wound = await createWound({
        patientId,
        location: result.analysis.bodyLocation || "Unknown location",
        stage: result.analysis.healingStage,
        woundType: result.analysis.woundType || "other",
        dateIdentified: new Date().toISOString().split("T")[0],
        isActive: true,
      });
      await createWoundAssessment(wound.id, result.analysis, result.imagePath);

      await queryClient.invalidateQueries({ queryKey: ["assessments", patientId] });
      await queryClient.invalidateQueries({ queryKey: ["wounds", patientId] });
      await queryClient.invalidateQueries({ queryKey: ["patient-files", patientId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      router.back();
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof Error ? err.message : "Could not save this assessment. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Capture Wound Photo" }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        {!photo ? (
          <View style={styles.pickerRow}>
            <Pressable
              onPress={() => pickFrom("camera")}
              style={[styles.pickerButton, { backgroundColor: colors.primary }]}
            >
              <Feather name="camera" size={22} color={colors.primaryForeground} />
              <Text style={[styles.pickerButtonText, { color: colors.primaryForeground }]}>
                Take Photo
              </Text>
            </Pressable>
            <Pressable
              onPress={() => pickFrom("library")}
              style={[
                styles.pickerButton,
                { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <Feather name="image" size={22} color={colors.foreground} />
              <Text style={[styles.pickerButtonText, { color: colors.foreground }]}>
                Choose from Library
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />

            {!result && (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => {
                    setPhoto(null);
                    setResult(null);
                  }}
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                  disabled={isAnalyzing}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                    Retake
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleAnalyze}
                  disabled={isAnalyzing}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                      Analyze with AI
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {result && (
              <View style={styles.resultContainer}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.badgeText, { color: colors.accentForeground }]}>
                      {result.analysis.woundType.replace(/_/g, " ")}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                      Stage {result.analysis.healingStage}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Measurements
                </Text>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  {result.analysis.longestDiameter}cm × {result.analysis.width}cm · Area{" "}
                  {result.analysis.area}cm² · Perimeter {result.analysis.perimeter}cm
                </Text>

                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Tissue composition
                </Text>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  {result.analysis.tissueComposition.granulation}% granulation ·{" "}
                  {result.analysis.tissueComposition.slough}% slough ·{" "}
                  {result.analysis.tissueComposition.necrotic}% necrotic
                </Text>

                {result.analysis.recommendations.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      Recommendations
                    </Text>
                    {result.analysis.recommendations.map((rec, i) => (
                      <Text
                        key={i}
                        style={[styles.bodyText, { color: colors.mutedForeground }]}
                      >
                        • {rec}
                      </Text>
                    ))}
                  </>
                )}

                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => {
                      setPhoto(null);
                      setResult(null);
                    }}
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    disabled={isSaving}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                      Discard
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    disabled={isSaving}
                    style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                        Save Assessment
                      </Text>
                    )}
                  </Pressable>
                </View>
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
    padding: 20,
    paddingBottom: 100,
    gap: 16,
  },
  pickerRow: {
    gap: 12,
    marginTop: 24,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 16,
  },
  pickerButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  preview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  resultContainer: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
