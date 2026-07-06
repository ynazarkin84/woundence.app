import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{
    analysis: WoundAnalysisResult;
    imagePath: string;
  } | null>(null);

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Woundence needs camera access to capture wound photos.");
        return;
      }
    }
    setIsCameraReady(false);
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) return;
    setIsCapturing(true);
    try {
      const captured = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!captured?.uri) return;
      setPhoto({
        uri: captured.uri,
        fileName: `wound-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
      });
      setResult(null);
      setShowCamera(false);
    } catch (err) {
      Alert.alert("Capture failed", err instanceof Error ? err.message : "Could not take a photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Woundence needs photo library access to attach wound photos.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ["images"] });
    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

    const asset = pickerResult.assets[0];
    // Library assets (esp. iOS) are frequently HEIC, which the backend's
    // upload filter rejects (it only accepts jpeg/png/webp). Re-encoding to
    // JPEG here guarantees a compatible upload regardless of source format.
    // compress: 1 (no additional lossy compression) since this step exists
    // purely for format conversion — the backend already applies the
    // intentional, final compression pass in processWoundImage.
    const jpeg = await ImageManipulator.manipulateAsync(asset.uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 1,
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

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <Stack.Screen options={{ title: "Capture Wound Photo", headerShown: false }} />
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setIsCameraReady(true)}
        />
        <View style={styles.overlayCenter} pointerEvents="none">
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.frameGuideOuter}
          >
            <View style={styles.frameGuideInner} />
          </LinearGradient>
          <Text style={styles.frameGuideHint}>Center the wound within the frame</Text>
        </View>
        <View style={styles.cameraControls}>
          <Pressable
            onPress={() => setShowCamera(false)}
            style={[styles.cameraCloseButton, { backgroundColor: "rgba(0,0,0,0.4)" }]}
          >
            <Feather name="x" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={takePicture}
            disabled={!isCameraReady || isCapturing}
            style={[styles.shutterButton, { opacity: !isCameraReady || isCapturing ? 0.5 : 1 }]}
          >
            {isCapturing ? <ActivityIndicator color="#0B3D91" /> : <View style={styles.shutterInner} />}
          </Pressable>
          <View style={{ width: 44 }} />
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Capture Wound Photo" }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        {!photo ? (
          <View style={styles.pickerRow}>
            <Button label="Take photo" onPress={openCamera} fullWidth icon={<Feather name="camera" size={20} color={colors.primaryForeground} />} />
            <Button
              label="Choose from library"
              onPress={pickFromLibrary}
              variant="outline"
              fullWidth
              icon={<Feather name="image" size={20} color={colors.primary} />}
            />
          </View>
        ) : (
          <>
            <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />

            {!result && (
              <View style={styles.actionRow}>
                <Button
                  label="Retake"
                  variant="outline"
                  onPress={() => {
                    setPhoto(null);
                    setResult(null);
                  }}
                  disabled={isAnalyzing}
                  style={styles.actionButton}
                />
                <Button
                  label="Analyze with AI"
                  onPress={handleAnalyze}
                  loading={isAnalyzing}
                  style={styles.actionButton}
                />
              </View>
            )}

            {result && (
              <View style={styles.resultContainer}>
                <View style={styles.badgeRow}>
                  <Tag label={result.analysis.woundType.replace(/_/g, " ")} />
                  <Tag label={`Stage ${result.analysis.healingStage}`} />
                </View>

                <Card>
                  <Text style={[typography.h3, { color: colors.foreground, marginBottom: 4 }]}>
                    Measurements
                  </Text>
                  <Text style={[typography.body, { color: colors.mutedForeground }]}>
                    {result.analysis.longestDiameter}cm × {result.analysis.width}cm · Area{" "}
                    {result.analysis.area}cm² · Perimeter {result.analysis.perimeter}cm
                  </Text>
                </Card>

                <Card>
                  <Text style={[typography.h3, { color: colors.foreground, marginBottom: 4 }]}>
                    Tissue composition
                  </Text>
                  <Text style={[typography.body, { color: colors.mutedForeground }]}>
                    {result.analysis.tissueComposition.granulation}% granulation ·{" "}
                    {result.analysis.tissueComposition.slough}% slough ·{" "}
                    {result.analysis.tissueComposition.necrotic}% necrotic
                  </Text>
                </Card>

                {result.analysis.recommendations.length > 0 && (
                  <Card>
                    <Text style={[typography.h3, { color: colors.foreground, marginBottom: 4 }]}>
                      Recommendations
                    </Text>
                    {result.analysis.recommendations.map((rec, i) => (
                      <Text key={i} style={[typography.body, { color: colors.mutedForeground }]}>
                        • {rec}
                      </Text>
                    ))}
                  </Card>
                )}

                <View style={styles.actionRow}>
                  <Button
                    label="Discard"
                    variant="outline"
                    onPress={() => {
                      setPhoto(null);
                      setResult(null);
                    }}
                    disabled={isSaving}
                    style={styles.actionButton}
                  />
                  <Button
                    label="Save assessment"
                    onPress={handleSave}
                    loading={isSaving}
                    style={styles.actionButton}
                  />
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
  preview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  resultContainer: {
    gap: 12,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  frameGuideOuter: {
    width: 280,
    height: 280,
    borderRadius: 24,
    padding: 3,
  },
  frameGuideInner: {
    flex: 1,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    borderStyle: "dashed",
  },
  frameGuideHint: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },
  cameraControls: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
  },
  cameraCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: "#0B3D91",
  },
});
