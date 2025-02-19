import type { WhisperResponse, YoutubeResponse } from "./types";
import fs from "fs/promises";
import path from "path";
import {
    AutomaticSpeechRecognitionOutput,
    pipeline,
} from "@huggingface/transformers";
import wavefile from "wavefile";
import ytdl from "@distube/ytdl-core";
import { exec } from "child_process";

const DATA_DIR = path.join(process.cwd(), "data");

export const transcribeYoutubeVideoService = (youtubeUrl: string) => {
    const downloadAudio = async (url: string): Promise<string> => {
        try {
            if (!ytdl.validateURL(url)) {
                throw new Error("Invalid YouTube URL");
            }

            const info = await ytdl.getInfo(url);
            const title = info.videoDetails.title.replace(/[^\w\s]/gi, "");
            const mp3Path = path.join(DATA_DIR, `${title}.mp3`);
            const wavPath = path.join(DATA_DIR, `${title}.wav`);

            await fs.mkdir(DATA_DIR, { recursive: true });

            console.log(`Downloading audio to: ${mp3Path}`);

            const audioStream = ytdl(url, { filter: "audioonly" });
            const audioBuffer: Buffer[] = [];

            return new Promise((resolve, reject) => {
                audioStream.on("data", (chunk) => {
                    audioBuffer.push(chunk);
                });

                audioStream.on("end", async () => {
                    try {
                        await fs.writeFile(mp3Path, Buffer.concat(audioBuffer));
                        console.log("Download finished:", mp3Path);

                        // Convert MP3 to WAV using ffmpeg
                        exec(
                            `ffmpeg -i "${mp3Path}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`,
                            (error) => {
                                if (error) {
                                    console.error(
                                        "FFmpeg conversion error:",
                                        error
                                    );
                                    reject(error);
                                } else {
                                    console.log(
                                        "Conversion complete:",
                                        wavPath
                                    );
                                    resolve(wavPath);
                                }
                            }
                        );
                    } catch (err) {
                        reject(err);
                    }
                });

                audioStream.on("error", (err) => {
                    console.error("Download error:", err);
                    reject(err);
                });
            });
        } catch (error) {
            console.error("Download failed:", error);
            throw error;
        }
    };

    const transcribeAudio = async (filePath: string): Promise<string> => {
        console.log("Starting transcription...");
        let transcriber = await pipeline(
            "automatic-speech-recognition",
            "onnx-community/whisper-small"
        );
        let buffer = await fs.readFile(filePath);
        try {
            let wav = new wavefile.WaveFile(buffer);
            wav.toBitDepth("32f"); // Pipeline expects input as a Float32Array
            wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
            let audioData = wav.getSamples();
            if (Array.isArray(audioData)) {
                if (audioData.length > 1) {
                    const SCALING_FACTOR = Math.sqrt(2);
                    for (let i = 0; i < audioData[0].length; ++i) {
                        audioData[0][i] =
                            (SCALING_FACTOR *
                                (audioData[0][i] + audioData[1][i])) /
                            2;
                    }
                }
                audioData = audioData[0];
            }
            let output: AutomaticSpeechRecognitionOutput | any =
                await transcriber(audioData, {
                    chunk_length_s: 30,
                    stride_length_s: 5,
                });

            console.log("Transcription complete:", output.text);
            return output.text;
        } catch (error) {
            console.error("Error processing WAV file:", error);
            throw new Error("Invalid or corrupted WAV file.");
        }
    };

    const transcribeVideo = async (
        url = youtubeUrl
    ): Promise<YoutubeResponse> => {
        try {
            const outputPath = await downloadAudio(url);
            const transcription = await transcribeAudio(outputPath);
            return { transcription: transcription };
        } catch (error) {
            console.error("Error transcribing video:", error);
            throw error;
        }
    };

    return { transcribeVideo };
};
