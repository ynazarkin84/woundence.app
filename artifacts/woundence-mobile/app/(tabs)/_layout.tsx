import { isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens beyond tint/icon
// color — liquid glass is a system-level appearance rendered by iOS (no
// gradient fill, no custom shape) and cannot be overridden further. The
// floating gradient pill bar only exists on the ClassicTabLayout path below.
function NativeTabLayout() {
  const colors = useColors();
  return (
    <NativeTabs tintColor={colors.primary} iconColor={{ default: colors.mutedForeground, selected: colors.primary }}>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="patients">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Patients</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wound-imaging">
        <Icon sf={{ default: "camera", selected: "camera.fill" }} />
        <Label>Wound Imaging</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="appointments">
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
        <Label>Appointments</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// Floating rounded pill with the brand gradient fill and a white capsule
// highlighting the active tab, per the design system's nav bar spec.
function FloatingGradientTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.tabBar, { borderRadius: colors.radius.pill }]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const icon = options.tabBarIcon?.({
            focused: isFocused,
            color: isFocused ? colors.primary : "rgba(255,255,255,0.75)",
            size: 22,
          });

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
              {isFocused ? (
                <View style={[styles.activePill, { backgroundColor: colors.card, borderRadius: colors.radius.pill }]}>
                  {icon}
                </View>
              ) : (
                icon
              )}
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs tabBar={(props) => <FloatingGradientTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="square.grid.2x2" tintColor={color} size={24} />
            ) : (
              <Feather name="grid" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={24} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="wound-imaging"
        options={{
          title: "Wound Imaging",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="camera" tintColor={color} size={24} />
            ) : (
              <Feather name="camera" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={24} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 0,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: "#1E4FD6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  activePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
