import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

type CardProps = {
  children: React.ReactNode;
  /** Icy-blue tint background instead of white — for secondary/nested surfaces. */
  tint?: boolean;
  style?: ViewStyle | ViewStyle[];
};

/**
 * Shared card surface: rounded corners, soft shadow, no hard border.
 * Used across Patients, Wound History, Wound Imaging, and Appointments
 * so all four modules share the exact same card shape.
 */
export function Card({ children, tint, style }: CardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: colors.radius.lg,
          backgroundColor: tint ? colors.accent : colors.card,
          shadowColor: colors.primary,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
});
