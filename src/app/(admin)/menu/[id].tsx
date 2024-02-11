import { View, Text, Image, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { defaultPizzaImage } from "@components/ProductListItem";
import products from "@assets/data/products";

const AdminProductDetailScreen = () => {
  const { id } = useLocalSearchParams();

  const product = products.find((p) => p.id.toString() === id);

  if (!product) {
    return <Text>Product not found</Text>;
  }
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: product?.name }} />
      <Image
        source={{ uri: product.image || defaultPizzaImage }}
        style={styles.image}
        resizeMode={"contain"}
      />
      <Text style={styles.title}>${product.name}</Text>
      <Text style={styles.price}>${product.price}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: "white", flex: 1, padding: 10 },
  image: { width: "100%", aspectRatio: 1 },
  title: { fontSize: 20, fontWeight: "bold" },
  price: { fontSize: 18, fontWeight: "bold" },
});

export default AdminProductDetailScreen;
