import { elizaLogger } from "@elizaos/core";
import { transcribeYoutubeVideoService } from "../services";

export const transcribeVideoAction = {
    name: "TRANSCRIBE_VIDEO",
    similes: ["VIDEO", "YOUTUBE", "GET_TEXT", "TRANSCRIPTION"],
    description: "Transcribe a YouTube video to text",
    validate: async (_runtime) => {
        console.log("✅ TRANSCRIBE_VIDEO Action Validated");
        return true;
    },
    handler: async (runtime, message, state, _options, callback) => {
        console.log(
            "🔍 TRANSCRIBE_VIDEO Handler Called with message:",
            message
        );

        const youtubeUrl = message?.content?.text?.trim();
        if (!youtubeUrl.startsWith("https://www.youtube.com/")) {
            callback({ text: "Please provide a valid YouTube URL." });
            return false;
        }

        try {
            const service = transcribeYoutubeVideoService(youtubeUrl);
            const response = await service.transcribeVideo(youtubeUrl);

            console.log("🎤 Transcription Response:", response);

            if (!response?.transcription) {
                callback({
                    text: "Failed to transcribe the video. Please try again.",
                });
                return false;
            }

            callback({
                text: `Here is the transcribed text:\n\n${response.transcription}`,
                content: response,
            });

            elizaLogger.success(
                `✅ Successfully transcribed video: ${youtubeUrl}`
            );
            return true;
        } catch (error) {
            elizaLogger.error("❌ Error in TRANSCRIBE_VIDEO handler:", error);
            callback({ text: `Error transcribing video: ${error.message}` });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you transcribe this video for me? The link is https://www.youtube.com/watch?v=TsrTlw76scI",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Let me transcribe this video for you.",
                    action: "TRANSCRIBE_VIDEO",
                },
            },
        ],
    ],
};
