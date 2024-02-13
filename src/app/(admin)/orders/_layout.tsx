import { Stack } from "expo-router";

export default function OrdersLayout() {
  return (
    <Stack>
      {/*<Stack.Screen name={"index"} options={{ title: "Orders" }} />*/}
      <Stack.Screen name={"list"} options={{ headerShown: false }} />
    </Stack>
  );
}
