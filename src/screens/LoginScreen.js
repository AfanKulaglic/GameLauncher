import React, { useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { colors } from "../utils/colors";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../utils/useResponsive";

const background = require("../../assets/games/battleship.jpg");

function toReadableAuthError(err) {
  switch (err?.code) {
    case "auth/email-already-in-use": return "This email is already in use.";
    case "auth/invalid-email": return "Invalid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "Invalid email or password.";
    default: return err?.message || "An unknown error occurred.";
  }
}

export function LoginScreen({ navigation }) {
  const { scale, vScale, hScale } = useResponsive();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle, googleEnabled } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(toReadableAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ImageBackground source={background} style={styles.background}>
        <View style={styles.overlay} />
      </ImageBackground>
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Card style={[styles.card, { padding: vScale(16), maxWidth: hScale(340) }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.kicker, { fontSize: scale(9), letterSpacing: scale(1.5) }]}>Fun4Four</Text>
              <Text style={[styles.title, { fontSize: scale(18), marginTop: vScale(4) }]}>Welcome back</Text>
              <Text style={[styles.subtitle, { fontSize: scale(10), marginTop: vScale(3) }]}>Sign in to continue your co-op sessions.</Text>
            </View>
            <View style={[styles.logo, { width: scale(30), height: scale(30), borderRadius: scale(10) }]}>
              <Text style={[styles.logoText, { fontSize: scale(11) }]}>FF</Text>
            </View>
          </View>

          <View style={[styles.form, { gap: vScale(6), marginTop: vScale(12) }]}>
            <Text style={[styles.label, { fontSize: scale(10) }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { fontSize: scale(12), paddingVertical: vScale(7), paddingHorizontal: hScale(12), borderRadius: scale(12) }]}
            />
            <Text style={[styles.label, { fontSize: scale(10) }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              style={[styles.input, { fontSize: scale(12), paddingVertical: vScale(7), paddingHorizontal: hScale(12), borderRadius: scale(12) }]}
            />
            {error ? <Text style={[styles.error, { fontSize: scale(10) }]}>{error}</Text> : null}
            <Button onPress={handleSubmit} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <Button
              variant="outline"
              onPress={async () => {
                setError(null);
                try {
                  await loginWithGoogle();
                } catch (err) {
                  setError(err?.message || "Google sign-in is not configured.");
                }
              }}
              disabled={loading || !googleEnabled}
            >
              Sign in with Google
            </Button>
            {!googleEnabled ? (
              <Text style={[styles.helper, { fontSize: scale(9) }]}>Google sign-in not configured.</Text>
            ) : null}
          </View>

          <Text style={[styles.footer, { fontSize: scale(10), marginTop: vScale(10) }]}>
            New here?{" "}
            <Text style={styles.link} onPress={() => navigation.navigate("Register")}>
              Create an account
            </Text>
          </Text>
        </Card>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    fontWeight: "700",
    color: colors.brandRed,
    textTransform: "uppercase",
  },
  title: {
    fontWeight: "700",
    color: colors.gray900,
  },
  subtitle: {
    color: colors.gray600,
  },
  logo: {
    backgroundColor: "rgba(225,29,72,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.brandRed,
    fontWeight: "700",
  },
  form: {
    gap: 10,
  },
  label: {
    color: colors.gray700,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.8)",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  error: {
    color: colors.brandRed,
  },
  helper: {
    color: colors.gray500,
    textAlign: "center",
  },
  footer: {
    color: colors.gray600,
  },
  link: {
    color: colors.brandRed,
    fontWeight: "700",
  },
});
