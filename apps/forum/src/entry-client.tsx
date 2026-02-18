import { mount, StartClient } from "@solidjs/start/client";

// biome-ignore lint/style/noNonNullAssertion: SolidStart convention — #app always exists
mount(() => <StartClient />, document.getElementById("app")!);
