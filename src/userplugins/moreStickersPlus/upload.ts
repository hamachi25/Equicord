/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { findByPropsLazy, findLazy } from "@webpack";
import { ChannelStore, UploadHandler } from "@webpack/common";

import { FFmpegState, Sticker } from "./types";
import { corsFetch } from "./utils";


const MessageUpload = findByPropsLazy("instantBatchUpload");
const CloudUpload = findLazy(m => m.prototype?.trackUploadFinished);
const PendingReplyStore = findByPropsLazy("getPendingReply");
const MessageUtils = findByPropsLazy("sendMessage");
const DraftStore = findByPropsLazy("getDraft", "getState");


export const ffmpeg = new FFmpeg();

// 変更
async function resizeImage(url: string) {
    const originalImage = new Image();
    originalImage.crossOrigin = "anonymous"; // If the image is hosted on a different domain, enable CORS

    const loadImage = new Promise((resolve, reject) => {
        originalImage.onload = resolve;
        originalImage.onerror = reject;
        originalImage.src = url;
    });

    await loadImage;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Set the canvas size to the target dimensions
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    // Draw the resized image onto the canvas
    ctx.drawImage(originalImage, 0, 0);

    // Convert the image data to a Blob
    const blob: Blob | null = await new Promise(resolve => {
        canvas.toBlob(resolve, "image/png");
    });
    if (!blob) throw new Error("Could not convert canvas to blob");

    // return the object URL representing the Blob
    return blob;
}

async function toGIF(url: string, ffmpeg: FFmpeg): Promise<File> {
    const filename = (new URL(url)).pathname.split("/").pop() ?? "image.png";
    await ffmpeg.writeFile(filename, await fetchFile(url));

    const outputFilename = "output.gif";
    await ffmpeg.exec(["-i", filename,
        "-filter_complex", `split[s0][s1];
        [s0]palettegen=
          stats_mode=single:
          transparency_color=000000[p];
        [s1][p]paletteuse=
          new=1:
          alpha_threshold=10`,
        outputFilename]);

    const data = await ffmpeg.readFile(outputFilename);
    await ffmpeg.deleteFile(filename);
    await ffmpeg.deleteFile(outputFilename);
    if (typeof data === "string") {
        throw new Error("Could not read file");
    }
    return new File([data.buffer], outputFilename, { type: "image/gif" });
}

async function getOverlayTextImage(overlayTextImageUrl: string, overlayText: string): Promise<string> {
    const regex = /product\/(\d+)\/sticker\/(\d+)/;
    const match = overlayTextImageUrl.match(regex);

    if (match) {
        const productId = match[1];
        const stickerId = match[2];
        console.log(`Product ID: ${productId}`);
        console.log(`Sticker ID: ${stickerId}`);

        const baseUrl = `https://store.line.me/overlay/sticker/${productId}/${stickerId}/iPhone/sticker.png`;
        const url = `${baseUrl}?text=${encodeURIComponent(overlayText)}`;
        const refererHeader = `https://store.line.me/stickershop/product/${productId}/ja`;

        try {
            const response = await corsFetch(url, {
                headers: {
                    "Referer": refererHeader
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            return imageUrl;
        } catch (error) {
            console.error("Error fetching or saving image:", error);
            throw error;
        }
    } else {
        console.log("No matches found.");
    }

    return overlayTextImageUrl;
}

async function compositeImage(url: string, overlaryUrl: string, ffmpeg: FFmpeg): Promise<File> {
    const filename = "image.png";
    await ffmpeg.writeFile(filename, await fetchFile(url));

    const overlayFilename = "overlay.png";
    await ffmpeg.writeFile(overlayFilename, await fetchFile(overlaryUrl));

    const outputFilename = "output." + filename?.split(".").pop()?.toLowerCase();
    await ffmpeg.exec(["-i", filename, "-i", overlayFilename,
        "-filter_complex", "[0][1]overlay=0:0:format=auto,format=rgba",
        "-y", outputFilename]);

    const data = await ffmpeg.readFile(outputFilename);
    await ffmpeg.deleteFile(filename);
    await ffmpeg.deleteFile(overlayFilename);
    await ffmpeg.deleteFile(outputFilename);
    if (typeof data === "string") {
        throw new Error("Could not read file");
    }

    let mimeType = "image/png";
    switch (filename?.split(".").pop()?.toLowerCase()) {
        case "jpg":
        case "jpeg":
            mimeType = "image/jpeg";
            break;
        case "webp":
            mimeType = "image/webp";
            break;
    }
    return new File([data.buffer], outputFilename, { type: mimeType });
}

export async function sendSticker({
    channelId,
    sticker,
    sendAsLink,
    ctrlKey,
    shiftKey,
    ffmpegState,
    overlayText
}: { channelId: string; sticker: Sticker; sendAsLink?: boolean; ctrlKey: boolean; shiftKey: boolean; ffmpegState?: FFmpegState; overlayText: string; }) {

    let messageContent = "";
    // 変更
    const { textEditor } = Vencord.Plugins.plugins.MoreStickersPlus as any;
    if (DraftStore) {
        messageContent = DraftStore.getDraft(channelId, 0);
    }

    let messageOptions = {};
    if (PendingReplyStore) {
        const pendingReply = PendingReplyStore.getPendingReply(channelId);
        if (pendingReply) {
            messageOptions = MessageUtils.getSendMessageOptionsForReply(pendingReply);
        }
    }

    if ((ctrlKey || !sendAsLink) && !shiftKey) {
        let file: File | null = null;

        if (sticker?.isAnimated) {
            if (!ffmpegState) {
                throw new Error("FFmpeg state is not provided");
            }
            if (!ffmpegState?.ffmpeg) {
                throw new Error("FFmpeg is not provided");
            }
            if (!ffmpegState?.isLoaded) {
                throw new Error("FFmpeg is not loaded");
            }

            file = await toGIF(sticker.image, ffmpegState.ffmpeg);
        }
        else if (sticker.overlayTextImageUrl) {
            if (!ffmpegState?.ffmpeg || !ffmpegState?.isLoaded) {
                throw new Error("FFmpeg state is incomplete or not provided");
            }

            sticker.overlayText = overlayText;
            if (sticker.overlayText && sticker.overlayText !== "") {
                sticker.overlayTextImageUrl = await getOverlayTextImage(sticker.overlayTextImageUrl, sticker.overlayText || "");
            }

            file = await compositeImage(sticker.image, sticker.overlayTextImageUrl, ffmpegState.ffmpeg);
        }
        else {
            sticker.image = sticker.image.replace("android", "iPhone");
            sticker.image = sticker.image.replace("sticker.png", "sticker@2x.png");

            const url = new URL(sticker.image);
            url.searchParams.set("t", Date.now().toString()); // To prevent caching, in order to avoid CORS bug in Chrome
            const response = await fetch(sticker.image);
            const orgImageUrl = URL.createObjectURL(await response.blob());
            const processedImage = await resizeImage(orgImageUrl);

            const filename = sticker.filename ?? (new URL(sticker.image)).pathname.split("/").pop();
            let mimeType = "image/png";
            switch (filename?.split(".").pop()?.toLowerCase()) {
                case "jpg":
                case "jpeg":
                    mimeType = "image/jpeg";
                    break;
                case "gif":
                    mimeType = "image/gif";
                    break;
                case "webp":
                    mimeType = "image/webp";
                    break;
                case "svg":
                    mimeType = "image/svg+xml";
                    break;
            }
            file = new File([processedImage], filename!, { type: mimeType });
        }

        if (ctrlKey) {
            UploadHandler.promptToUpload([file], ChannelStore.getChannel(channelId), 0);
            return;
        }

        MessageUpload.uploadFiles({
            channelId,
            draftType: 0,
            hasSpoiler: false,
            options: messageOptions || {},
            parsedMessage: {
                content: messageContent
            },
            uploads: [
                new CloudUpload({
                    file,
                    platform: 1
                }, channelId, false, 0)
            ]
        });
    } else if (shiftKey) {
        if (!messageContent.endsWith(" ") || !messageContent.endsWith("\n")) messageContent += " ";
        messageContent += sticker.image;

        if (ctrlKey && textEditor && textEditor.insertText && typeof textEditor.insertText === "function") {
            textEditor.insertText(messageContent);
        } else {
            MessageUtils._sendMessage(channelId, {
                content: sticker.image
            }, messageOptions || {});
        }
    } else {
        MessageUtils._sendMessage(channelId, {
            content: `${messageContent} ${sticker.image}`.trim()
        }, messageOptions || {});
    }
}
