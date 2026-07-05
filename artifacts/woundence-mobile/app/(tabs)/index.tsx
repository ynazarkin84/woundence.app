import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { getDashboardStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: number | string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: colors.accent }]}
      >
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.cardValue, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            Welcome{user?.firstName ? `, ${user.firstName}` : ""}
          </Text>
          <Text style={[styles.subGreeting, { color: colors.mutedForeground }]}>
            Here's today's overview
          </Text>
        </View>
        <Pressable
          onPress={() => logout()}
          hitSlop={12}
          style={[styles.signOutButton, { backgroundColor: colors.muted }]}
        >
          <Feather name="log-out" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator
          style={{ marginTop: 32 }}
          color={colors.primary}
        />
      ) : (
        <View style={styles.grid}>
          <StatCard
            icon="users"
            label="Patients"
            value={data?.totalPatients ?? 0}
          />
          <StatCard
            icon="calendar"
            label="Today's Appointments"
            value={data?.todayAppointments ?? 0}
          />
          <StatCard
            icon="activity"
            label="Active Wounds"
            value={data?.activeWounds ?? 0}
          />
          <StatCard
            icon="clipboard"
            label="Pending Assessments"
            value={data?.pendingAssessments ?? 0}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  signOutButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  subGreeting: {
    fontSize: 15,
    marginTop: 4,
    marginBottom: 20,
    fontFamily: "Inter_400Regular",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardValue: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
