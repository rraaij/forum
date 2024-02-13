import { Link, Stack } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";
import Button from "@components/Button";
import Colors from "@/constants/Colors";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState("");

  const validateInput = () => {
    setErrors("");
    if (!email) {
      setErrors("Email is required");
      return false;
    }
    // validate valid email?
    if (!password) {
      setErrors("Password is required");
      return false;
    }
    return true;
  };

  const onCreateAccount = () => {
    if (!validateInput()) {
      return;
    }
    console.log("[CREATE ACCOUNT]");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Sign in" }} />

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="jon@gmail.com"
        style={styles.input}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <Text style={{ color: "red" }}>{errors}</Text>

      <Button text={"Create account"} onPress={onCreateAccount} />
      <Link href={"/sign-in"} style={styles.textButton}>
        Sign in
      </Link>
    </View>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 10,
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    marginBottom: 20,
  },
  label: {
    color: "gray",
    fontSize: 16,
  },
  textButton: {
    alignSelf: "center",
    fontWeight: "bold",
    color: Colors.light.tint,
    marginVertical: 10,
  },
});
