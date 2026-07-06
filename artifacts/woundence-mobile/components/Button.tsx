import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import typography from "@/constants/typography";

type ButtonProps = {
  label: string;
  onPress: () => void;
  /**
   * primary: solid navy fill. secondary: teal fill. outline: navy stroke,
   * transparent fill. destructive: muted-red stroke, transparent fill — for
   * actions like cancel/delete that need to read differently from a neutral
   * outline action, without resorting to an alarm red.
   */
  variant?: "primary" | "secondary" | "outline" | "destructive";
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Shared pill-shaped button. Primary actions should be fullWidth per the
 * design system; secondary/outline/destructive are for inline or paired actions.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  fullWidth,
  disabled,
  loading,
  icon,
  style,
}: ButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;
  const isStroked = variant === "outline" || variant === "destructive";

  const backgroundColor =
    variant === "primary" ? colors.primary : variant === "secondary" ? colors.secondary : "transparent";
  const strokeColor = variant === "destructive" ? colors.destructive : colors.primary;
  const textColor = isStroked ? strokeColor : colors.primaryForeground;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          borderRadius: colors.radius.pill,
          backgroundColor,
          borderWidth: isStroked ? 1.5 : 0,
          borderColor: strokeColor,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text style={[typography.bodySemibold, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  fullWidth: {
    width: "100%",
  },
});
