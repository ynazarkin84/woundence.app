import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  createAppointment,
  getPatients,
  getProviders,
  type Patient,
  type Provider,
} from "@/lib/api";

const APPOINTMENT_TYPES: { value: string; label: string }[] = [
  { value: "new_patient", label: "New Patient" },
  { value: "follow_up", label: "Follow-up" },
  { value: "wound_assessment", label: "Wound Assessment" },
  { value: "debridement", label: "Debridement" },
  { value: "dressing_change", label: "Dressing Change" },
];

const DURATIONS = [15, 30, 45, 60];

function buildTimeSlots() {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

function fmtSlotLabel(slot: string) {
  const [h, m] = slot.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function NewAppointmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const dateKey = date ?? new Date().toISOString().split("T")[0];

  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [appointmentType, setAppointmentType] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const timeSlots = useMemo(() => buildTimeSlots(), []);

  const patientsQuery = useQuery({
    queryKey: ["patients", patientSearch],
    queryFn: () => getPatients(patientSearch),
    enabled: !selectedPatient,
  });

  const providersQuery = useQuery({
    queryKey: ["providers"],
    queryFn: () => getProviders(),
  });

  const canSubmit = !!selectedPatient && !!selectedProvider && !!appointmentType && !!selectedSlot;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const appointmentDate = new Date(`${dateKey}T${selectedSlot}:00`).toISOString();
      await createAppointment({
        patientId: selectedPatient!.id,
        providerId: selectedProvider!.id,
        appointmentDate,
        appointmentType: appointmentType!,
        duration,
        room: room || undefined,
        notes: notes || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["appointments", dateKey] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      router.back();
    } catch (err) {
      Alert.alert(
        "Could not create appointment",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "New Appointment" }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Patient</Text>
        {selectedPatient ? (
          <View style={[styles.selectedChip, { backgroundColor: colors.accent }]}>
            <Text style={[styles.selectedChipText, { color: colors.accentForeground }]}>
              {selectedPatient.firstName} {selectedPatient.lastName}
            </Text>
            <Pressable onPress={() => setSelectedPatient(null)} hitSlop={8}>
              <Feather name="x" size={16} color={colors.accentForeground} />
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]}
              placeholder="Search patients..."
              placeholderTextColor={colors.mutedForeground}
              value={patientSearch}
              onChangeText={setPatientSearch}
            />
            {patientsQuery.isLoading ? (
              <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} />
            ) : (
              (patientsQuery.data ?? []).slice(0, 6).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedPatient(p)}
                  style={[styles.listRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground }}>{p.firstName} {p.lastName}</Text>
                </Pressable>
              ))
            )}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Provider</Text>
        <View style={styles.chipWrap}>
          {(providersQuery.data ?? []).map((p) => {
            const isSelected = selectedProvider?.id === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelectedProvider(p)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: isSelected ? colors.primaryForeground : colors.foreground }}>
                  {p.firstName} {p.lastName}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appointment Type</Text>
        <View style={styles.chipWrap}>
          {APPOINTMENT_TYPES.map((t) => {
            const isSelected = appointmentType === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setAppointmentType(t.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: isSelected ? colors.primaryForeground : colors.foreground }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Time ({dateKey})
        </Text>
        <View style={styles.chipWrap}>
          {timeSlots.map((slot) => {
            const isSelected = selectedSlot === slot;
            return (
              <Pressable
                key={slot}
                onPress={() => setSelectedSlot(slot)}
                style={[
                  styles.slotChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: isSelected ? colors.primaryForeground : colors.foreground, fontSize: 12 }}>
                  {fmtSlotLabel(slot)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Duration (minutes)</Text>
        <View style={styles.chipWrap}>
          {DURATIONS.map((d) => {
            const isSelected = duration === d;
            return (
              <Pressable
                key={d}
                onPress={() => setDuration(d)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: isSelected ? colors.primaryForeground : colors.foreground }}>{d}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Room (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]}
          placeholder="e.g. 3"
          placeholderTextColor={colors.mutedForeground}
          value={room}
          onChangeText={setRoom}
        />

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]}
          placeholder="Add notes..."
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || isSaving}
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (!canSubmit || isSaving) && styles.submitButtonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
              Create Appointment
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  listRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedChipText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  slotChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 28,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
