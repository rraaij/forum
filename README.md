# Expo Router Example

Use [`expo-router`](https://docs.expo.dev/router/introduction/) to build native navigation using files in the `app/` directory.

## 🚀 create react-native project with Expo and expo-router

```sh
$ npx create-expo-app -e with-router
// or
$ pnpx create expo-app -e with-router
// add typescript
$ touch tsconfig.json
```

## 📝 Notes

- [Expo Router: Docs](https://docs.expo.dev/router/introduction/)

## ERRORS
### expo-router/babel is deprecated in favor of babel-preset-expo in SDK 50.
solution: https://stackoverflow.com/questions/77869840/how-to-fix-react-native-error-after-updating-expo-to-50-0

- ```pnpm install babel-preset-expo```
- update babel.config.js: remove line that says ```plugins: ["expo-router/babel"],```
- clear cache ```npx expo start --clear```

### Unable to resolve module `@babel/runtime/helpers/interopRequireDefault`
solution https://stackoverflow.com/questions/52486219/unable-to-resolve-module-babel-runtime-helpers-interoprequiredefault
- ```pnpm install @babel/runtime```

