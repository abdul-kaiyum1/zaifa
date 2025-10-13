const { getStreamFromUrl } = global.utils;

// Store recent messages to capture content before unsend
const messageCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

module.exports = {
    config: {
        name: "unsendAlert",
        version: "6.0",
        author: "Sahadat Hossen",
        countDown: 1,
        role: 2,
        shortDescription: {
            en: "Enable/Disable Anti unsend mode"
        },
        longDescription: {
            en: "Anti unsend mode. Works with audio, video, images, and text messages. Alerts admin when someone unsends a message with the original content."
        },
        category: "Admins",
        guide: {
            en: "{pn} on or off\nex: {pn} on"
        },
        envConfig: {
            deltaNext: 5
        }
    },

    onStart: async function ({ api, message, event, threadsData, args }) {
        if (!args[0] || (args[0].toLowerCase() !== "on" && args[0].toLowerCase() !== "off")) {
            return message.reply("Please use 'on' or 'off' to enable or disable unsendAlert.\nExample: unsendAlert on");
        }

        const setting = args[0].toLowerCase() === "on";
        await threadsData.set(event.threadID, setting, "settings.unsendAlert");
        
        return message.reply(`✅ Unsend Alert has been ${setting ? "enabled" : "disabled"} for this group.`);
    },

    onChat: async function ({ api, threadsData, event, usersData, message }) {
        // Cache all messages for potential unsend detection
        if (event.type !== "message_unsend") {
            const messageData = {
                messageID: event.messageID,
                senderID: event.senderID,
                threadID: event.threadID,
                body: event.body || "",
                attachments: event.attachments || [],
                timestamp: Date.now()
            };
            
            messageCache.set(event.messageID, messageData);
            
            // Clean old messages from cache
            const now = Date.now();
            for (const [id, data] of messageCache.entries()) {
                if (now - data.timestamp > CACHE_DURATION) {
                    messageCache.delete(id);
                }
            }
        }

        // Handle unsend detection
        if (event.type === "message_unsend") {
            const adminBoxID = "7388254684526242";
            const unsendAlertEnabled = await threadsData.get(event.threadID, "settings.unsendAlert");

            if (!unsendAlertEnabled) return;

            try {
                const threadInfo = await api.getThreadInfo(event.threadID);
                const threadName = threadInfo.threadName || "Unknown Group";
                const senderInfo = await usersData.getName(event.senderID);
                const senderName = senderInfo || "Unknown User";

                // Get the cached message content
                const cachedMessage = messageCache.get(event.messageID);
                
                let messageContent = "❌ Content not captured (message may be too old)";
                let attachmentInfo = "";

                if (cachedMessage) {
                    // Handle text content
                    if (cachedMessage.body && cachedMessage.body.trim()) {
                        messageContent = `� Text: "${cachedMessage.body}"`;
                    } else if (cachedMessage.attachments && cachedMessage.attachments.length > 0) {
                        messageContent = "� Media content (see attachments below)";
                    } else {
                        messageContent = "� Empty message or reaction";
                    }

                    // Handle attachments
                    if (cachedMessage.attachments && cachedMessage.attachments.length > 0) {
                        const attachmentTypes = cachedMessage.attachments.map(att => {
                            if (att.type === "photo") return "�️ Image";
                            if (att.type === "video") return "� Video";
                            if (att.type === "audio") return "� Audio";
                            if (att.type === "file") return "� File";
                            return "� Attachment";
                        });
                        attachmentInfo = `\n� Attachments: ${attachmentTypes.join(", ")}`;
                    }

                    // Remove from cache after processing
                    messageCache.delete(event.messageID);
                }

                const alertMessage = `� UNSEND ALERT �

� Group: ${threadName}
� Sender: ${senderName} (ID: ${event.senderID})
� Message ID: ${event.messageID}
� Time: ${new Date().toLocaleString()}

� Unsent Content:
${messageContent}${attachmentInfo}

⚠️ Someone has unsent a message in your monitored group!`;

                // Send alert to admin
                await api.sendMessage(alertMessage, adminBoxID);

                // If there were attachments in the cached message, try to forward them
                if (cachedMessage && cachedMessage.attachments && cachedMessage.attachments.length > 0) {
                    try {
                        const attachmentStreams = [];
                        for (const attachment of cachedMessage.attachments) {
                            if (attachment.url) {
                                const stream = await getStreamFromUrl(attachment.url);
                                if (stream) {
                                    attachmentStreams.push(stream);
                                }
                            }
                        }

                        if (attachmentStreams.length > 0) {
                            await api.sendMessage({
                                body: "� Recovered attachments from unsent message:",
                                attachment: attachmentStreams
                            }, adminBoxID);
                        }
                    } catch (attachmentError) {
                        console.error("Error recovering attachments:", attachmentError);
                        await api.sendMessage("❌ Could not recover media attachments (may have expired)", adminBoxID);
                    }
                }

            } catch (error) {
                console.error("Error in unsendAlert:", error);
                await api.sendMessage(`❌ Error processing unsend alert: ${error.message}`, adminBoxID);
            }
        }
    }
};
