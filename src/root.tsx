import { component$, useVisibleTask$ } from "@builder.io/qwik";
import {
  QwikCityProvider,
  RouterOutlet,
  ServiceWorkerRegister,
} from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";

// import the Flowbite module
import { initFlowbite } from "flowbite";

import "./global.css";

export default component$(() => {
  /**
   * initialise the event listeners for the data attributes on render
   * [vite] warning: useVisibleTask$() runs eagerly and blocks the main thread,
   * preventing user interaction until the task is finished.
   * Consider using useTask$(), useOn(), useOnDocument(), or useOnWindow() instead.
   * If you have to use a useVisibleTask$(), you can disable the warning with a
   * '// eslint-disable-next-line qwik/no-use-visible-task' comment.
   */
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    initFlowbite();
  });

  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Don't remove the `<head>` and `<body>` elements.
   */
  return (
    <QwikCityProvider>
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <RouterHead />
        <title>Forum</title>
      </head>
      <body lang="en">
        <RouterOutlet />
        <ServiceWorkerRegister />
      </body>
    </QwikCityProvider>
  );
});
