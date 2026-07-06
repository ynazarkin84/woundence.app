import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  getAppointments,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "@/lib/api";

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function fmtDayLabel(d: Date) {
  const today = new Date();
  if (toDateKey(d) === toDateKey(today)) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (toDateKey(d) === toDateKey(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

// 7-day window centered on the selected date — re-centers whenever the
// selection changes, so tapping the leading/trailing day scrolls the whole
// strip forward/back a week over time without needing a real ScrollView.
function getWeekWindow(centerDate: Date): Date[] {
  const days: Date[] = [];
  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + offset);
    days.push(d);
  }
  return days;
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  arrived: "Arrived",
  in_room: "In Room",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const TYPE_LABELS: Record<string, string> = {
  new_patient: "New Patient",
  follow_up: "Follow-up",
  wound_assessment: "Wound Assessment",
  debridement: "Debridement",
  dressing_change: "Dressing Change",
};

function nextAction(status: AppointmentStatus): { label: string; next: AppointmentStatus } | null {
  switch (status) {
    case "scheduled":
      return { label: "Check In", next: "arrived" };
    case "arrived":
      return { label: "Room", next: "in_room" };
    case "in_room":
      return { label: "Complete", next: "completed" };
    default:
      return null;
  }
}

export default function AppointmentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateKey = toDateKey(selectedDate);
  const weekWindow = getWeekWindow(selectedDate);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["appointments", dateKey],
    queryFn: () => getAppointments(dateKey),
  });

  const shiftWeek = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(d);
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    await updateAppointmentStatus(id, status);
    queryClient.invalidateQueries({ queryKey: ["appointments", dateKey] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <Text style={[typography.h2, { color: colors.foreground, flex: 1 }]}>{fmtDayLabel(selectedDate)}</Text>
        <Pressable
          onPress={() => router.push(`/appointment/new?date=${dateKey}`)}
          style={[styles.newButton, { backgroundColor: colors.primary, borderRadius: colors.radius.pill }]}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <View style={styles.weekStrip}>
        <Pressable onPress={() => shiftWeek(-1)} hitSlop={12}>
          <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
        </Pressable>
        {weekWindow.map((day) => {
          const isSelected = toDateKey(day) === dateKey;
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => setSelectedDate(day)}
              style={[
                styles.dayPill,
                {
                  borderRadius: colors.radius.pill,
                  backgroundColor: isSelected ? colors.primary : colors.accent,
                },
              ]}
            >
              <Text
                style={[
                  typography.label,
                  { color: isSelected ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {day.toLocaleDateString(undefined, { weekday: "narrow" })}
              </Text>
              <Text
                style={[
                  typography.bodySemibold,
                  { color: isSelected ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {day.getDate()}
              </Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => shiftWeek(1)} hitSlop={12}>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : (data ?? []).length === 0 ? (
        <Text style={[typography.body, styles.emptyText, { color: colors.mutedForeground }]}>
          No appointments scheduled for this day.
        </Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }: { item: Appointment }) => {
            const action = nextAction(item.status);
            const isTerminal = item.status === "completed" || item.status === "cancelled" || item.status === "no_show";
            return (
              <Pressable onPress={() => router.push(`/patient/${item.patientId}`)}>
                <Card style={{ gap: 4 }}>
                  <View style={styles.cardTop}>
                    <Text style={[typography.bodySemibold, { color: colors.foreground }]}>
                      {fmtTime(item.appointmentDate)}
                    </Text>
                    <Tag label={STATUS_LABELS[item.status] ?? item.status} />
                  </View>
                  <Text style={[typography.h3, { color: colors.foreground, marginTop: 2 }]}>
                    {item.patient.firstName} {item.patient.lastName}
                  </Text>
                  <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                    {TYPE_LABELS[item.appointmentType] ?? item.appointmentType}
                    {item.room ? ` · Room ${item.room}` : ""}
                    {" · Dr. "}{item.provider.firstName} {item.provider.lastName}
                  </Text>

                  {!isTerminal && (
                    <View style={styles.actionRow}>
                      {action && (
                        <Button
                          label={action.label}
                          onPress={() => handleStatusChange(item.id, action.next)}
                          style={styles.actionButton}
                        />
                      )}
                      <Button
                        label="Cancel"
                        variant="destructive"
                        onPress={() => handleStatusChange(item.id, "cancelled")}
                        style={styles.actionButton}
                      />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  newButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  weekStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    gap: 2,
  },
  emptyText: {
    marginTop: 32,
    textAlign: "center",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
  },
});
