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
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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

function statusColor(status: AppointmentStatus, colors: ReturnType<typeof useColors>) {
  switch (status) {
    case "scheduled":
      return colors.accent;
    case "arrived":
    case "in_room":
      return colors.secondary;
    case "completed":
      return colors.muted;
    case "cancelled":
    case "no_show":
      return colors.destructive;
    default:
      return colors.muted;
  }
}

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
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateKey = toDateKey(selectedDate);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["appointments", dateKey],
    queryFn: () => getAppointments(dateKey),
  });

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    await updateAppointmentStatus(id, status);
    queryClient.invalidateQueries({ queryKey: ["appointments", dateKey] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.dateRow}>
        <Pressable onPress={() => shiftDay(-1)} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.dateLabel, { color: colors.foreground }]}>
          {fmtDayLabel(selectedDate)}
        </Text>
        <Pressable onPress={() => shiftDay(1)} hitSlop={12}>
          <Feather name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => router.push(`/appointment/new?date=${dateKey}`)}
          style={[styles.newButton, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : (data ?? []).length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
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
              <Pressable
                onPress={() => router.push(`/patient/${item.patientId}`)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.time, { color: colors.foreground }]}>{fmtTime(item.appointmentDate)}</Text>
                  <View style={[styles.badge, { backgroundColor: statusColor(item.status, colors) }]}>
                    <Text style={[styles.badgeText, { color: colors.foreground }]}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.patientName, { color: colors.foreground }]}>
                  {item.patient.firstName} {item.patient.lastName}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {TYPE_LABELS[item.appointmentType] ?? item.appointmentType}
                  {item.room ? ` · Room ${item.room}` : ""}
                  {" · Dr. "}{item.provider.firstName} {item.provider.lastName}
                </Text>

                {!isTerminal && (
                  <View style={styles.actionRow}>
                    {action && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleStatusChange(item.id, action.next);
                        }}
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      >
                        <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>
                          {action.label}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleStatusChange(item.id, "cancelled");
                      }}
                      style={[styles.actionButton, styles.cancelButton, { borderColor: colors.destructive }]}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.destructive }]}>Cancel</Text>
                    </Pressable>
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  dateLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  newButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 32,
    textAlign: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  time: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  meta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
