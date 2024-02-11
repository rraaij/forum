import { Image, StyleSheet, Text, TextInput, View } from "react-native";
import Button from "@components/Button";
import { useState } from "react";
import { defaultPizzaImage } from "@components/ProductListItem";
import Colors from "@/constants/Colors";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";

const CreateProductScreen = () => {
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [errors, setErrors] = useState<string>("");
  const [image, setImage] = useState<string>("");

  const resetFields = () => {
    setName("");
    setPrice("");
  };

  const validateInput = () => {
    setErrors("");
    if (!name) {
      setErrors("Name is required");
      return false;
    }
    if (!price) {
      setErrors("Price is required");
      return false;
    }
    if (isNaN(parseFloat(price))) {
      setErrors("Price is not a number");
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const onCreate = () => {
    if (!validateInput()) {
      return;
    }
    console.warn("creating...");
    // save in database
    resetFields();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Create Product" }} />

      <Image
        source={{ uri: image || defaultPizzaImage }}
        style={styles.image}
      />
      <Text onPress={pickImage} style={styles.imageButton}>
        Select image
      </Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        placeholder={"Name"}
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Price</Text>
      <TextInput
        placeholder={"9.99"}
        style={styles.input}
        inputMode={"numeric"}
        value={price}
        onChangeText={setPrice}
      />

      <Text style={{ color: "red" }}>{errors}</Text>
      <Button text={"Create"} onPress={onCreate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 10,
  },
  image: {
    width: "50%",
    aspectRatio: 1,
    alignSelf: "center",
  },
  imageButton: {
    alignSelf: "center",
    fontWeight: "bold",
    color: Colors.light.tint,
    marginVertical: 10,
  },
  label: { color: "gray", fontSize: 16 },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    marginBottom: 20,
  },
});
export default CreateProductScreen;
