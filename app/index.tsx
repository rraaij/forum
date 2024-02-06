import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";

const LoginPage = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>LoginPage</Text>
      <Link href={"/register"}>
        Create
        {/*<Pressable>*/}
        {/*  <Text>Create account</Text>*/}
        {/*</Pressable>*/}
      </Link>
    </View>
  );
};
export default LoginPage;
