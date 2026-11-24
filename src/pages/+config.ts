import type { Config } from "vike/types";
import vikeVue from "vike-vue/config";

const config: Config = {
    title: "Лажни вести? — погоди го насловот",
    description: "Дали стварно?! Дневна игра за погодување македонски наслови.",
    lang: "mk",

    passToClient: ["user"],
    extends: [vikeVue],
};

export default config;
