import type { Plugin } from "@elizaos/core";
import { transcribeVideoAction } from "./actions/transcribeVideo";

export * as actions from "./actions";

export const youtubeToTextPlugin: Plugin = {
    name: "youtube",
    description: "Youtube to Text plugin for Eliza",
    actions: [transcribeVideoAction],
    evaluators: [],
    providers: [],
};

// ✅ Log to confirm the plugin is being loaded
console.log("🔌 YouTube Plugin Loaded:", youtubeToTextPlugin);

export default youtubeToTextPlugin;
