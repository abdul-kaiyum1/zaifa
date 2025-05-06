const axios = require('axios');
const path = require('path');
const crypto = require('crypto'); // To generate a unique identifier for file names

module.exports = {
    config: {
        name: "save",
        aliases: ["store", "backup"],
        version: "1.3",
        author: "Abdul Kaiyum",
        role: 1,
        shortDescription: "Save audio, videos, and pictures to GitHub with a tag",
        longDescription: "This command will save replied audio, videos, and pictures to your GitHub repository with an optional tag for better organization.",
        category: "storage",
        guide: "{pn} <tag> (optional)"
    },

    onStart: async function ({ api, event, args }) {
        const { messageReply } = event;

        // Check if the message has a reply and if it has attachments
        if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
            return api.sendMessage("❌ Please reply to a message containing an audio, video, or picture.", event.threadID);
        }

        const attachment = messageReply.attachments[0];
        const fileType = attachment.type;

        // Check for supported file types: photo, video, and audio
        if (fileType !== 'photo' && fileType !== 'video' && fileType !== 'audio') {
            return api.sendMessage("❌ Unsupported file type. Only audio, video, and pictures are allowed.", event.threadID);
        }

        const fileUrl = attachment.url;

        // Use the provided tag, or "untagged" if no tag is provided
        const tag = args.join(" ") || "untagged";
        
        // Generate a unique name for the file (e.g., audio_<randomID>.mp3, video_<randomID>.mp4, photo_<randomID>.jpg)
        const fileExt = path.extname(fileUrl); // Get the file extension based on the attachment
        const fileName = `${fileType}_${crypto.randomBytes(4).toString('hex')}${fileExt}`; // Create a unique file name

        try {
            // Download the file from the provided URL
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const fileData = Buffer.from(response.data, 'binary').toString('base64'); // Convert the file to Base64

            // GitHub repository details
            const owner = "abdul-kaiyum1";
            const repo = "save";
            const token = "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";

            // GitHub API URL for creating/updating file (organized by tag)
            const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${tag}/${fileName}`;

            // GitHub commit data
            const githubData = {
                message: `Save ${fileName} under tag ${tag}`, // Commit message
                content: fileData, // Base64 content
                committer: {
                    name: "Abdul Kaiyum", // Committer's name
                    email: "abdulkaiyum22113344@gmail.com" // Committer's email
                }
            };

            // Send request to GitHub API
            await axios.put(githubUrl, githubData, {
                headers: {
                    Authorization: `token ${token}`, // GitHub token for authentication
                    "Content-Type": "application/json"
                }
            });

            // Success message
            return api.sendMessage(`✅ File "${fileName}" has been successfully saved under tag "${tag}".`, event.threadID);
        } catch (error) {
            console.error(error); // Log any error to the console
            return api.sendMessage("❌ Failed to save the file to GitHub.", event.threadID); // Error message
        }
    }
};