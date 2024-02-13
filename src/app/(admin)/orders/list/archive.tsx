import { FlatList, View } from "react-native";
import orders from "@assets/data/orders";
import OrderListItem from "@components/OrderListItem";
import { Stack } from "expo-router";

const AdminOrdersArchiveScreen = () => {
  return (
    <View>
      <Stack.Screen options={{ title: "Archive" }} />
      <FlatList
        data={orders}
        renderItem={({ item }) => <OrderListItem order={item} />}
        contentContainerStyle={{ gap: 10, padding: 10 }}
      />
    </View>
  );
};

export default AdminOrdersArchiveScreen;
