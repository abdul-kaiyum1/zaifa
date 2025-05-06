const axios = require('axios');

module.exports = {
    config: {
        name: "recent",
        aliases: [],
        version: "1.0",
        author: "Sahadat Hossen",
        countDown: 15,
        role: 0,
        shortDescription: "Get the top 5 users by message count in the current chat",
        longDescription: "Get the top 5 users by message count in the current chat",
        category: "box chat",
        guide: "{p}{n}",
    },
    onStart: async function ({ api, event }) {
        const threadId = event.threadID;
        const senderId = event.senderID;

        // Extended random notes array with cute and aesthetic emojis
        const randomNotes = [
            "You're truly the chat master! ✨",
            "Keep up the amazing participation! 💬🔥",
            "The chat is yours to rule! 🎉",
            "You're setting the chat on fire! 🔥💯",
            "Your energy is unmatched! ⚡💥",
            "The conversation flows like magic with you around! ✨💬",
            "You're the heartbeat of this chat! 💓🎶",
            "Your presence lights up the whole group! 💡🌟",
            "Can't imagine the chat without you! 💭💖",
            "You're the king/queen of this realm! 🌟",
            "Leading the conversation like a pro! 📝🎯",
            "Your words are like gold in this chat! 💬💛",
            "The community thrives because of you! 🌱🌸",
            "You're the unstoppable chat warrior! 🛡⚔",
            "A true champion of chat culture! 🏆💬",
            "Your enthusiasm is contagious! 😄✨",
            "You’re making this chat legendary! 📜🌟",
            "Commanding the room like a pro! 👑🗣",
            "Bringing the energy every single time! ⚡🚀",
            "You’ve mastered the art of conversation! 🎨📝",
            "You’re the chat MVP! 🏅💬",
            "An absolute legend in these parts! 🏆✨",
            "Every message you send is fire! 🔥💥",
            "This chat runs on your vibe! 🎶🌟",
            "You’re the life of the conversation! 🎉💬",
            "Chat royalty right here! 🎊✨",
            "Ruling the chat with style! 🌟💬",
            "You're making history here! 📜✨",
            "The chat wouldn’t be the same without you! 💖🗣",
            "Your contributions are pure gold! 💛💬",
            "Your vibe is unmatched, keep going! ⚡💫",
            "You bring the magic to this place! ✨💬",
            "Your chat game is top-notch! 💬🏆",
            "Chat kingpin, no one compares! 💬",
            "You're the pulse of this chat! 💓🎶",
            "Only Aiko is real "
        ];

        try {
            const participants = await api.getThreadInfo(threadId, { participantIDs: true });

            const messageCounts = {};

            // Initialize message counts
            participants.participantIDs.forEach(participantId => {
                messageCounts[participantId] = 0;
            });

            // Get message history and count messages per participant
            const messages = await api.getThreadHistory(threadId, 1000); // Adjust limit as needed

            messages.forEach(message => {
                const messageSender = message.senderID;
                if (messageCounts[messageSender] !== undefined) {
                    messageCounts[messageSender]++;
                }
            });

            // Sort users by message count and get the top 5
            const topUsers = Object.entries(messageCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const userList = [];
            for (let i = 0; i < topUsers.length; i++) {
                const [userId, messageCount] = topUsers[i];
                const userInfo = await api.getUserInfo(userId);
                const userName = userInfo[userId]?.name || "Facebook user";

                if (i === 0) {
                    // Pick a random note for the top 1st member
                    const randomNote = randomNotes[Math.floor(Math.random() * randomNotes.length)];
                    userList.push(`👑『${userName}』 \nSent ${messageCount} messages\n✉ Meow ${randomNote}』`);
                } else {
                    userList.push(`『${userName}』 \nSent ${messageCount} messages`);
                }
            }

            // Construct the message
            const messageText = `Recently sent messages to top 5 members from:\n${userList.join('\n\n')}`;

            // Send the message
            api.sendMessage({ body: messageText, mentions: [{ tag: senderId, id: senderId, type: "user" }] }, threadId);

        } catch (error) {
            console.error(error);
        }
    },
};
