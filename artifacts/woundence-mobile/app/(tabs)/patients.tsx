import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { Tag } from "@/components/Tag";
import typography from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { getPatients, type Patient } from "@/lib/api";

function formatWoundType(value: string) {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default function PatientsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients", search],
    queryFn: () => getPatients(search || undefined),
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.card, borderRadius: colors.radius.pill },
        ]}
      >
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search patients..."
          placeholderTextColor={colors.mutedForeground}
          style={[typography.body, styles.searchInput, { color: colors.foreground }]}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : isError ? (
        <Text style={[typography.body, styles.emptyText, { color: colors.mutedForeground }]}>
          Failed to load patients.
        </Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={[typography.body, styles.emptyText, { color: colors.mutedForeground }]}>
              No patients found.
            </Text>
          }
          renderItem={({ item }: { item: Patient }) => (
            <Pressable onPress={() => router.push(`/patient/${item.id}`)}>
              <Card style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                  <Text style={[typography.bodySemibold, { color: colors.primary }]}>
                    {item.firstName?.[0]}
                    {item.lastName?.[0]}
                  </Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[typography.bodySemibold, { color: colors.foreground }]}>
                    {item.firstName} {item.lastName}
                  </Text>
                  {item.phone ? (
                    <Text style={[typography.caption, styles.meta, { color: colors.mutedForeground }]}>
                      {item.phone}
                    </Text>
                  ) : null}
                  {item.activeWoundTypes && item.activeWoundTypes.length > 0 ? (
                    <View style={styles.tagRow}>
                      {item.activeWoundTypes.map((woundType) => (
                        <Tag key={woundType} label={formatWoundType(woundType)} />
                      ))}
                    </View>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
              </Card>
            </Pressable>
          )}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
    gap: 6,
  },
  meta: {
    marginTop: -2,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
  },
});
