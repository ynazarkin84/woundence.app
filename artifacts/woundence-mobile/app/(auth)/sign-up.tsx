import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { useAuth, useSignUp, useSSO } from "@clerk/expo";
import { Link } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

export default function SignUpScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const isSubmitting = fetchStatus === "fetching";

  const handleSubmit = async () => {
    const { error } = await signUp.password({ emailAddress, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      // No manual navigation here: RootLayoutNav's Stack.Protected guard
      // reacts to isSignedIn and swaps to the (tabs) group on its own once
      // Clerk's session becomes active.
      await signUp.finalize({
        navigate: ({ session }) => {
          if (session?.currentTask) return;
        },
      });
    }
  };

  const handleOAuthSignUp = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      const setLoading = strategy === "oauth_google" ? setIsGoogleLoading : setIsAppleLoading;
      setLoading(true);
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });

        if (createdSessionId && setActive) {
          await setActive({
            session: createdSessionId,
            navigate: async ({ session }) => {
              if (session?.currentTask) return;
            },
          });
        }
      } catch (err) {
        console.error(`${strategy} sign-up failed`, err);
      } finally {
        setLoading(false);
      }
    },
    [startSSOFlow]
  );

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  const needsVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  if (needsVerification) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          bottomOffset={32}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Verify your email
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We sent a code to {emailAddress}
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
            value={code}
            placeholder="Enter verification code"
            placeholderTextColor={colors.mutedForeground}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          {errors.fields.code && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {errors.fields.code.message}
            </Text>
          )}

          <Pressable
            onPress={handleVerify}
            disabled={isSubmitting || !code}
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              (isSubmitting || !code) && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={[styles.buttonText, { color: colors.primaryForeground }]}
              >
                Verify
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => signUp.verifications.sendEmailCode()}
            style={styles.secondaryButton}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>
              I need a new code
            </Text>
          </Pressable>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        bottomOffset={32}
      >
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          accessibilityLabel="Woundence logo"
        />
        <Text style={[styles.title, { color: colors.foreground }]}>
          Create your account
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Join Woundence to start managing patients
        </Text>

        {Platform.OS === "ios" && (
          <Pressable
            onPress={() => handleOAuthSignUp("oauth_apple")}
            disabled={isAppleLoading}
            style={[styles.appleButton]}
          >
            {isAppleLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.oauthButtonContent}>
                <Ionicons name="logo-apple" size={18} color="#ffffff" />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </View>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={() => handleOAuthSignUp("oauth_google")}
          disabled={isGoogleLoading}
          style={[
            styles.googleButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <View style={styles.oauthButtonContent}>
              <Ionicons name="logo-google" size={18} color={colors.foreground} />
              <Text style={[styles.googleButtonText, { color: colors.foreground }]}>
                Continue with Google
              </Text>
            </View>
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
        {errors.fields.emailAddress && (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {errors.fields.emailAddress.message}
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
          placeholder="Create a password"
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
              Sign up
            </Text>
          )}
        </Pressable>

        <View style={styles.linkRow}>
          <Text style={{ color: colors.mutedForeground }}>
            Already have an account?{" "}
          </Text>
          <Link href="/sign-in">
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Sign in
            </Text>
          </Link>
        </View>

        <View nativeID="clerk-captcha" />
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
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignSelf: "center",
    marginBottom: 16,
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
  appleButton: {
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  oauthButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
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
  secondaryButton: {
    alignItems: "center",
    marginTop: 16,
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
