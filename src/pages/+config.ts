import type { Config } from "vike/types";
import vikeVue from "vike-vue/config";

const config: Config = {
    title: "Лажни Вести",
    description: "Дали стварно?!",

    passToClient: ["user"],
    extends: [vikeVue],
};

export default config;
