const { google } = require("googleapis");
const axios = require("axios");

module.exports = {
    config: {
        name: "sing",
        version: "1.1",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Listen your favourite songs 🎵",
        longDescription: "Listen your favourite songs just by their names video support also",
        category: "media",
        guide: "{pn} <song name> [video]"
    },
    onStart: async function ({ api, event, args }) {
        const youtube = google.youtube({
            version: 'v3',
            auth: 'AIzaSyDw2dm4V9TTsPmD2gdoScIuV68-GBDn9uE'
        });

        try {
            const query = args.join(" ");
            const isVideo = query.toLowerCase().endsWith("video");
            const songName = isVideo ? query.slice(0, -6) : query;

            if (!songName) {
                return api.sendMessage("Please provide a song name", event.threadID);
            }

            api.sendMessage("⏳ Searching...", event.threadID);

            const searchResponse = await youtube.search.list({
                part: ['id', 'snippet'],
                q: songName,
                maxResults: 1,
                type: 'video'
            });

            if (!searchResponse.data.items[0]) {
                return api.sendMessage("No results found", event.threadID);
            }

            const videoId = searchResponse.data.items[0].id.videoId;
            const videoDetails = await youtube.videos.list({
                part: ['snippet', 'statistics', 'contentDetails'],
                id: [videoId]
            });

            const video = videoDetails.data.items[0];
            const channelDetails = await youtube.channels.list({
                part: ['snippet', 'statistics'],
                id: [video.snippet.channelId]
            });

            const downloadUrl = ⁦`https://www.hungdev.id.vn/media/downAIO?url=https://youtu.be/${videoId}&apikey=YdXxx4rIT⁩0`;
            const downloadResponse = await axios.get(downloadUrl);
            const mediaData =⁦ downloadResponse.data?.data?.media⁩s;
            let mediaUrl;

            if (isVideo) {
                mediaUrl = mediaData.find(m => m.type === "video")?.url;
                if (!mediaUrl) {
                    return api.sendMessage("Video format not available", event.threadID);
                }
            } else {
                mediaUrl = mediaData.find(m => m.extension === "mp3")?.url;
                if (!mediaUrl) {
                    return api.sendMessage("MP3 format not available", event.threadID);
                }
            }

            const formatNumber = (num) => {
                if (num >= 1000000000) {
                    return (num / 1000000000).toFixed(1) + 'B';
                }
                if (num >= 1000000) {
                    return (num / 1000000).toFixed(1) + 'M';
                }
                if (num >= 1000) {
                    return (num / 1000).toFixed(1) + 'K';
                }
                return num.toString();
            };

            const formatDuration = (duration) => {
                const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
                const hours = (match[1] || '').slice(0, -1);
                const minutes = (match[2] || '').slice(0, -1);
                const seconds = (match[3] || '').slice(0, -1);

                let result = '';
                if (hours) result += `${hours}:`;
                result += `${minutes.padStart(2, '0')}:`;
                result += seconds.padStart(2, '0');
                return result;
            };

            const publishDate = new Date(video.snippet.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const messageBody = `🎵 Title: ${video.snippet.title}\n` +
                `👤 Artist: ${video.snippet.channelTitle}\n` +
                `⏱️ Duration: ${formatDuration(video.contentDetails.duration)}\n` +
                `👁️ Views: ${formatNumber(video.statistics.viewCount)}\n` +
                `👍 Likes: ${formatNumber(video.statistics.likeCount)}\n` +
                `📅 Released: ${publishDate}\n` +
                `💟 Channel Subscribers: ${formatNumber(channelDetails.data.items[0].statistics.subscriberCount)}\n\n` +
                `${isVideo ? '🎥 Downloading Video...' : '🎵 Downloading Audio...'}`

            const stream = await global.utils.getStreamFromURL(mediaUrl);

            await api.sendMessage(
                {
                    body: messageBody,
                    attachment: stream
                },
                event.threadID
            );

        } catch (error) {
            return api.sendMessage(`Error: ${error.message}`, event.threadID);
        }
    }
};