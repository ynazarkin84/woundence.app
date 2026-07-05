import * as AuthSession from "expo-auth-session";
import { useSignIn, useSSO } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isSubmitting = fetchStatus === "fetching";

  const handleSubmit = async () => {
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return;

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          router.replace(decorateUrl("/") as never);
        },
      });
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) return;
            router.replace(decorateUrl("/") as never);
          },
        });
      }
    } catch (err) {
      console.error("Google sign-in failed", err);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        bottomOffset={32}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Welcome back
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sign in to your Woundence account
        </Text>

        <Pressable
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading}
          style={[
            styles.googleButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <Text style={[styles.googleButtonText, { color: colors.foreground }]}>
              Continue with Google
            </Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
            or
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>
          Email address
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.input,
              color: colors.foreground,
            },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          value={emailAddress}
          placeholder="you@example.com"
          placeholderTextColor={colors.mutedForeground}
          onChangeText={setEmailAddress}
          keyboardType="email-address"
        />
        {errors.fields.identifier && (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {errors.fields.identifier.message}
          </Text>
        )}

        <Text style={[styles.label, { color: colors.foreground }]}>
          Password
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.input,
              color: colors.foreground,
            },
          ]}
          value={password}
          placeholder="Enter password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          onChangeText={setPassword}
        />
        {errors.fields.password && (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {errors.fields.password.message}
          </Text>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={!emailAddress || !password || isSubmitting}
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            (!emailAddress || !password || isSubmitting) && styles.buttonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={[styles.buttonText, { color: colors.primaryForeground }]}
            >
              Sign in
            </Text>
          )}
        </Pressable>

        <View style={styles.linkRow}>
          <Text style={{ color: colors.mutedForeground }}>
            Don&apos;t have an account?{" "}
          </Text>
          <Link href="/sign-up">
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Sign up
            </Text>
          </Link>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  googleButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  error: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
