import React from "react";
import { FlatList, View } from "react-native";
import orders from "@assets/data/orders";
import OrderListItem from "@components/OrderListItem";
import { Order } from "@/types";
import { Stack } from "expo-router";

const OrdersScreen = () => {
  return (
    <View>
      <Stack.Screen options={{ title: "Orders" }} />
      <FlatList
        data={orders}
        renderItem={({ item }) => <OrderListItem order={item} />}
        contentContainerStyle={{ gap: 10, padding: 10 }}
      />
    </View>
  );
};

export default OrdersScreen;
