import type { Preview } from "@storybook/vue3";
import { setup } from "@storybook/vue3";
import { appVuetify } from "../src/app/core/plugins/vuetify";
import "../src/app/features/race/components/HorseRace/HorseRaceCanvas.scss";
import "../src/app/features/race/components/RaceRoute.scss";

setup((app) => {
  app.use(appVuetify);
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
  },
};

export default preview;
