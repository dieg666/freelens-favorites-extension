import { Main } from "@freelensapp/extensions";

export default class CustomMain extends Main.LensExtension {
  async onActivate() {
    console.log("[CustomMain] Extension activated");
  }
}
