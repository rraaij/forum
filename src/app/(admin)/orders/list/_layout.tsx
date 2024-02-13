import { Tabs, withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaView } from "react-native";

const TopTabs = withLayoutContext(createMaterialTopTabNavigator().Navigator);

const OrderListNavigator = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <TopTabs>
        <TopTabs.Screen name="index" options={{ title: "Active" }} />
      </TopTabs>
    </SafeAreaView>
  );
};

export default OrderListNavigator;
