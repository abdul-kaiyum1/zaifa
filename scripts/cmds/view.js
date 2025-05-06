const axios = require('axios');

module.exports = {
    config: {
        name: "view",
        aliases: ["listfiles", "showfiles"],
        version: "1.3",
        author: "Abdul Kaiyum",
        role: 1,
        shortDescription: "View files saved on GitHub by tag",
        longDescription: "This command allows you to view the files saved on GitHub, organized by tag.",
        category: "storage",
        guide: "{pn} <tag> (optional)"
    },

    onStart: async function ({ api, event, args }) {
        const tag = args.join(" ") || "untagged"; // Use the provided tag, or default to "untagged"

        try {
            const owner = "abdul-kaiyum1";
            const repo = "save";
            const token = "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";
            
            // GitHub API URL to get the list of files in the specified tag folder
            const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${tag}`;
            
            // Fetch the file list from the GitHub repository
            const response = await axios.get(githubUrl, {
                headers: {
                    Authorization: `token ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const files = response.data;

            if (files.length === 0) {
                return api.sendMessage(`No files found under the tag "${tag}".`, event.threadID);
            }

            // Prepare the list of files
            let fileList = `📂 Files under tag "${tag}":\n\n`;
            files.forEach(file => {
                fileList += `- ${file.name} (${file.html_url})\n`;
            });

            return api.sendMessage(fileList, event.threadID);
        } catch (error) {
            console.error(error);
            return api.sendMessage(`❌ Failed to fetch files for the tag "${tag}".`, event.threadID);
        }
    }
};