import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { telefunc } from "telefunc/vite";
import vike from "vike/plugin";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [vike(), tailwindcss(), telefunc(), vue()],
});
