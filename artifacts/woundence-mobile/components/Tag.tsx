import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import typography from "@/constants/typography";

type TagProps = {
  label: string;
  /**
   * Clinical status tone (healing trend, wound severity). Renders as a
   * small filled pill in the matching status color instead of the default
   * outlined gradient stroke — used for good/watch/concern indicators,
   * distinct from generic wound-type/condition/appointment-status labels.
   */
  tone?: "good" | "watch" | "concern";
  style?: ViewStyle;
};

/**
 * Shared tag/pill. Default: outlined, teal-to-navy gradient stroke — used
 * for wound type, condition flags, and appointment status across all
 * modules. With `tone` set: small filled status pill instead.
 */
export function Tag({ label, tone, style }: TagProps) {
  const colors = useColors();

  if (tone) {
    const toneColor =
      tone === "good" ? colors.statusGood : tone === "watch" ? colors.statusWatch : colors.statusConcern;
    const toneForeground =
      tone === "good"
        ? colors.statusGoodForeground
        : tone === "watch"
          ? colors.statusWatchForeground
          : colors.statusConcernForeground;
    return (
      <View
        style={[
          styles.filled,
          { borderRadius: colors.radius.pill, backgroundColor: toneColor },
          style,
        ]}
      >
        <Text style={[typography.label, { color: toneForeground }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.outer, { borderRadius: colors.radius.pill }, style]}
    >
      <View
        style={[
          styles.inner,
          { backgroundColor: colors.card, borderRadius: colors.radius.pill - 1.5 },
        ]}
      >
        <Text style={[typography.label, { color: colors.foreground }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outer: {
    padding: 1.5,
    alignSelf: "flex-start",
  },
  inner: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  filled: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
