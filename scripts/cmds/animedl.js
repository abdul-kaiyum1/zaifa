// scripts/cmds/animedl.js
// Author: Abdul Kaiyum

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// --- Configuration ---
// Using the user-provided self-hosted API URL
const ANIME_API_URL = "https://animedl.vercel.app"; 
const CACHE_FOLDER_PATH = path.join(__dirname, 'cache');
fs.ensureDirSync(CACHE_FOLDER_PATH); // Ensure cache directory exists

module.exports = {
    config: {
        name: "animedl",
        aliases: ["anime", "getanime"],
        version: "4.0.0", // Major version change for hianime-api
        author: "Abdul Kaiyum",
        countDown: 10,
        role: 0,
        shortDescription: {
            en: "Search and download anime episodes using your custom API."
        },
        longDescription: {
            en: "Search for an anime by name, select from the results, view details, and then get a direct video link for the episode you want to watch."
        },
        category: "anime",
        guide: {
            en: `Usage:
• {pn} <anime_name> - Searches for an anime.
Example: {pn} Solo Leveling`
        }
    },

    onStart: async function ({ api, event, args }) {
        const searchQuery = args.join(" ");
        if (!searchQuery) {
            let prefix = "!"; // Default prefix
            try { 
                if (global.utils && typeof global.utils.getPrefix === 'function') { 
                    const tp = await global.utils.getPrefix(event.threadID); 
                    if (tp) prefix = tp; 
                } else if (global.config && global.config.PREFIX) { 
                    prefix = global.config.PREFIX; 
                } else if (api && api.PREFIX) { 
                    prefix = api.PREFIX; 
                }
            } catch(e){}
            return api.sendMessage(`Please provide an anime name to search.\nUsage: ${prefix}${this.config.name} <anime_name>`, event.threadID, event.messageID);
        }

        try {
            api.sendMessage(`🔍 Searching for "${searchQuery}"...`, event.threadID, event.messageID);
            
            // FIX: Using the correct search endpoint and query parameter 'q'
            const searchResponse = await axios.get(`${ANIME_API_URL}/api/v2/hianime/search`, {
                params: { q: searchQuery }
            });
            
            // FIX: Accessing the results array from the correct path
            const searchResults = searchResponse.data.data;

            if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
                return api.sendMessage(`❌ No anime found for "${searchQuery}". Please check the spelling or try a different name.`, event.threadID, event.messageID);
            }

            let responseMessage = "🔎 Here are the top search results:\n\n";
            const topResults = searchResults.slice(0, 6); // Limit to top 6 results

            topResults.forEach((anime, index) => {
                responseMessage += `${index + 1}. ${anime.name} (${anime.type || 'N/A'})\n`;
            });
            responseMessage += "\nReply with the number of the anime you want to see details for.";

            api.sendMessage(responseMessage, event.threadID, (err, msgInfo) => {
                if (err) return console.error("Anime search send error:", err);
                global.GoatBot.onReply.set(msgInfo.messageID, {
                    commandName: this.config.name,
                    senderID: event.senderID,
                    type: "anime_selection",
                    searchResults: topResults 
                });
            });

        } catch (error) {
            console.error("Anime Search API Error:", error.response ? error.response.data : error.message);
            api.sendMessage("❌ An error occurred while searching. Your API might be down or the anime was not found. Please try again later.", event.threadID, event.messageID);
        }
    },

    onReply: async function ({ api, event, Reply }) {
        const userChoice = event.body.trim();
        const senderID = event.senderID;

        if (Reply.senderID !== senderID) return;

        switch (Reply.type) {
            case "anime_selection":
                const selectedIndex = parseInt(userChoice) - 1;
                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= Reply.searchResults.length) {
                    return api.sendMessage("⚠️ Invalid number. Please reply with a number from the search results.", event.threadID, event.messageID);
                }

                const selectedAnime = Reply.searchResults[selectedIndex];
                api.unsendMessage(Reply.messageID).catch(e => {});
                api.sendMessage(`⏳ Fetching details for "${selectedAnime.name}"...`, event.threadID, event.messageID);

                try {
                    // FIX: Using the correct info/episodes endpoint
                    const infoResponse = await axios.get(`${ANIME_API_URL}/api/v2/hianime/anime/${selectedAnime.id}/episodes`);
                    // FIX: Accessing the data from the correct path
                    const animeData = infoResponse.data.data;

                    if (!animeData || !animeData.episodes) {
                        return api.sendMessage("❌ Could not fetch details for the selected anime.", event.threadID, event.messageID);
                    }

                    let detailMessage = `🎬 Title: ${selectedAnime.name}\n`;
                    detailMessage += `⭐ Type: ${selectedAnime.type || 'N/A'}\n`;
                    detailMessage += `🔢 Total Episodes: ${animeData.totalEpisodes || 'N/A'}\n\n`;
                    detailMessage += `Reply with the episode number and type you want to watch.\nExample: 1 sub\nExample: 12 dub`;

                    let attachment = null;
                    if (selectedAnime.poster) {
                        try {
                            const imagePath = path.join(CACHE_FOLDER_PATH, `anime_${Date.now()}.jpg`);
                            const imageResponse = await axios.get(selectedAnime.poster, { responseType: 'arraybuffer' });
                            fs.writeFileSync(imagePath, imageResponse.data);
                            attachment = fs.createReadStream(imagePath);
                        } catch (imgError) { console.error("Could not download anime cover image:", imgError.message); }
                    }

                    api.sendMessage({ body: detailMessage, attachment: attachment }, event.threadID, (err, msgInfo) => {
                        if (attachment) { fs.unlink(attachment.path, (unlinkErr) => { if (unlinkErr) console.error("Error deleting cached anime image:", unlinkErr); }); }
                        if (err) return console.error("Anime detail send error:", err);
                        global.GoatBot.onReply.set(msgInfo.messageID, {
                            commandName: this.config.name, senderID: senderID, type: "episode_selection",
                            animeTitle: selectedAnime.name,
                            episodes: animeData.episodes
                        });
                    });

                } catch (error) {
                    console.error("Anime Info API Error:", error.response ? error.response.data : error.message);
                    api.sendMessage("❌ An error occurred while fetching anime details. Please try again.", event.threadID, event.messageID);
                }
                break;

            case "episode_selection":
                const [epNumStr, category = 'sub'] = userChoice.split(" ");
                const episodeNumber = parseInt(epNumStr);
                const chosenCategory = category.toLowerCase();

                if (isNaN(episodeNumber) || episodeNumber <= 0 || episodeNumber > Reply.episodes.length) {
                    return api.sendMessage(`⚠️ Invalid episode number. Please enter a number between 1 and ${Reply.episodes.length}.`, event.threadID, event.messageID);
                }
                if (!['sub', 'dub', 'raw'].includes(chosenCategory)) {
                    return api.sendMessage(`⚠️ Invalid category. Please choose 'sub', 'dub', or 'raw'.`, event.threadID, event.messageID);
                }

                api.unsendMessage(Reply.messageID).catch(e => {});
                api.sendMessage(`⏳ Fetching episode ${episodeNumber} (${chosenCategory.toUpperCase()}) of "${Reply.animeTitle}"...`, event.threadID, event.messageID);

                try {
                    const targetEpisode = Reply.episodes.find(ep => ep.number === episodeNumber);
                    if (!targetEpisode || !targetEpisode.episodeId) {
                        return api.sendMessage(`❌ Could not find data for episode ${episodeNumber}.`, event.threadID, event.messageID);
                    }

                    // FIX: Using the correct servers endpoint
                    const serversResponse = await axios.get(`${ANIME_API_URL}/api/v2/hianime/episode/servers`, {
                        params: { animeEpisodeId: targetEpisode.episodeId }
                    });
                    // FIX: Accessing servers from the correct path
                    const availableServers = serversResponse.data.data[chosenCategory];
                    
                    if (!availableServers || availableServers.length === 0) {
                        return api.sendMessage(`❌ No servers found for the '${chosenCategory.toUpperCase()}' version of this episode. Please try another category.`, event.threadID, event.messageID);
                    }

                    const server = availableServers.find(s => s.serverName === 'vidstreaming') || availableServers.find(s => s.serverName === 'megacloud') || availableServers[0];

                    // FIX: Using the correct sources endpoint
                    const streamResponse = await axios.get(`${ANIME_API_URL}/api/v2/hianime/episode/sources`, {
                        params: {
                            animeEpisodeId: targetEpisode.episodeId,
                            server: server.serverName,
                            category: chosenCategory
                        }
                    });
                    // FIX: Accessing sources from the correct path
                    const streamData = streamResponse.data.data;

                    if (!streamData || !streamData.sources || streamData.sources.length === 0) {
                        return api.sendMessage(`❌ Could not find streaming sources for episode ${episodeNumber} on server ${server.serverName}.`, event.threadID, event.messageID);
                    }

                    let bestSource = streamData.sources.find(s => s.quality === '1080p') || streamData.sources.find(s => s.quality === '720p') || streamData.sources[0];
                    if (!bestSource || !bestSource.url) {
                        return api.sendMessage(`❌ Found sources, but could not extract a valid video URL for episode ${episodeNumber}.`, event.threadID, event.messageID);
                    }

                    let episodeMessage = `🎥 Here is Episode ${episodeNumber} (${chosenCategory.toUpperCase()}) of ${Reply.animeTitle}:\n\n`;
                    episodeMessage += `🔗 Direct Link: ${bestSource.url}\n\n`;
                    episodeMessage += `I will now attempt to send the video directly (this may take a while)...`;
                    api.sendMessage(episodeMessage, event.threadID);

                    let videoAttachment = null;
                    let tempVideoPath = null;
                    try {
                        tempVideoPath = path.join(CACHE_FOLDER_PATH, `anime_episode_${Date.now()}.mp4`);
                        
                        // Using a reliable proxy for M3U8 links
                        const proxyUrl = "https://proxy.anify.tv/proxy?url=";
                        const proxiedVideoUrl = `${proxyUrl}${encodeURIComponent(bestSource.url)}`;
                        
                        const videoResponse = await axios({
                            method: 'get', 
                            url: proxiedVideoUrl, // Use the proxied URL
                            responseType: 'stream',
                            headers: { 'Referer': streamData.headers?.Referer || 'https://hianime.to/' }
                        });
                        
                        const writer = fs.createWriteStream(tempVideoPath);
                        videoResponse.data.pipe(writer);
                        await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
                        videoAttachment = fs.createReadStream(tempVideoPath);
                    } catch (vidError) {
                        console.error("Could not download anime episode video:", vidError.message);
                        api.sendMessage(`⚠️ Could not download the video to send as an attachment. Please use the direct link provided above.`, event.threadID, event.messageID);
                        if (tempVideoPath) fs.unlink(tempVideoPath, (e)=>{});
                        return;
                    }
                    
                    if (videoAttachment) {
                        api.sendMessage({
                            body: `🎬 Episode ${episodeNumber} (${chosenCategory.toUpperCase()}) ready!`,
                            attachment: videoAttachment
                        }, event.threadID, (err) => {
                            if (tempVideoPath) { fs.unlink(tempVideoPath, (unlinkErr) => { if (unlinkErr) console.error("Error deleting cached anime video:", unlinkErr); }); }
                            if (err) {
                                console.error("Error sending video attachment:", err);
                                api.sendMessage(`⚠️ Failed to send the video as an attachment. Please use the direct link provided earlier.`, event.threadID, event.messageID);
                            }
                        });
                    }

                } catch (error) {
                    console.error("Anime Watch API Error:", error.response ? error.response.data : error.message);
                    api.sendMessage(`❌ An error occurred while fetching episode ${episodeNumber}. It might not be available yet.`, event.threadID, event.messageID);
                }
                break;
        }
    }
};
