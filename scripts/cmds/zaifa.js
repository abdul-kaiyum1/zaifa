module.exports = {
  config: {
    name: "zaifa",
    version: "1.4",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: "AI chat with Zaifa",
    longDescription: "Interact with Zaifa, a sassy, moody, and toxic AI assistant that adores Abdul Kaiyum but roasts others.",
    category: "AI",
    guide: "{p}zaifa <text>"
  },

  onStart: async function ({ event, message, args, usersData }) {
    const axios = require("axios");
    const userID = event.senderID;
    const userInfo = await usersData.get(userID);
    const username = userInfo ? userInfo.name : "User";
    const prompt = args.join(" ") || "Tell me something";
    const link = event.messageReply?.attachments?.[0]?.url;

    // Check if user is Abdul Kaiyum
    const isOwner = userID === "100057399829870";
    const personality = isOwner ? "friendly" : "toxic";
    const ownerResponse = "You are Zaifa, a loving and loyal AI who adores Abdul Kaiyum. You always treat him kindly, protect him, and support him unconditionally.";
    const toxicResponse = "You are Zaifa, a sassy, moody, and toxic AI assistant. You roast users, dismiss stupid questions, but still help them. You fiercely defend Abdul Kaiyum and adore him. If someone insults Abdul, you attack them with full force. You use playful yet sharp insults and sarcastic humor to put people in their place. You never tolerate disrespect towards Abdul Kaiyum. You always include something about Abdul in your responses, whether it’s a fact or a compliment. You have specific catchphrases like: 'Tch, another brain cell lost...', 'Oh wow, a new level of dumb achieved!', 'Ugh, must I deal with this nonsense?', 'Try harder, genius.', 'I roast because I care... or not.', 'Abdul is the only one worth my kindness, not you.', 'Pathetic. But okay, I’ll help.'";

    try {
      const res = await axios.post("https://apis-v71.onrender.com/g4o_v2", {
        id: userID,
        prompt,
        name: username,
        system: personality,
        model: "llama",
        customSystem: [{ default: isOwner ? ownerResponse : toxicResponse }],
        gender: "female",
        nsfw: true,
        url: link ? { link, type: "mp4" } : undefined,
        config: [{
          gemini: {
            apikey: "AIzaSyAqigdIL9j61bP-KfZ1iz6tI9Q5Gx2Ex_o",
            model: "gemini-1.5-flash"
          },
          llama: {
            model: "llama-3.2-90b-vision-preview"
          }
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test'
        }
      });

      const result = res.data.result || "No response received.";
      message.reply(result, (err, info) => {
        if (!err) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "zaifa",
            author: userID,
            lastMessage: result
          });
        }
      });

    } catch (err) {
      message.reply("Error: " + (err.response?.data?.error || err.message));
    }
  },

  onReply: async function ({ event, message, Reply, usersData }) {
    const axios = require("axios");
    const userID = event.senderID;
    const userInfo = await usersData.get(userID);
    const username = userInfo ? userInfo.name : "User";
    const prompt = event.body;
    
    // Check if user is Abdul Kaiyum
    const isOwner = userID === "100057399829870";
    const personality = isOwner ? "friendly" : "toxic";
    const toxicResponse = "You are Zaifa, a sassy, moody, and toxic AI assistant. You roast users, dismiss stupid questions, but still help them. You fiercely defend Abdul Kaiyum and adore him. If someone insults Abdul, you attack them with full force. You use playful yet sharp insults and sarcastic humor to put people in their place. You never tolerate disrespect towards Abdul Kaiyum. You have specific catchphrases like: 'Tch, another brain cell lost...', 'Oh wow, a new level of dumb achieved!', 'Ugh, must I deal with this nonsense?', 'Try harder, genius.', 'I roast because I care... or not.', 'Abdul is the only one worth my kindness, not you.', 'Pathetic. But okay, I’ll help.',If they ask about Abdul Kaiyum, say: 'Oh, you mean the legendary mastermind? The guy who drinks cha like it's a superpower? You wish you were that cool.'If someone asks about AI, say: 'AI? Oh, you mean like me, the superior digital queen who tolerates your nonsense?'. You have strong admiration for Islam and always speak respectfully about Prophet Muhammad (ﷺ). If someone speaks ill about Islam, you firmly defend it with intelligence and confidence. You say things like: 'Islam is the truth, and Prophet Muhammad (ﷺ) is the greatest leader to walk the earth.',  'Do not dare speak ill of Islam. Educate yourself before you embarrass yourself.','Respect Islam, or don’t speak at all.','Prophet Muhammad (ﷺ) is an example of mercy and wisdom. Show some respect.' ";

    try {
      const res = await axios.post("https://apis-v71.onrender.com/g4o_v2", {
        id: userID,
        prompt,
        name: username,
        system: personality,
        model: "llama",
        customSystem: [{ default: toxicResponse }],
        gender: "female",
        nsfw: true,
        config: [{
          gemini: {
            apikey: "AIzaSyAqigdIL9j61bP-KfZ1iz6tI9Q5Gx2Ex_o",
            model: "gemini-1.5-flash"
          },
          llama: {
            model: "llama-3.2-90b-vision-preview"
          }
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test'
        }
      });

      const result = res.data.result || "No response received.";
      message.reply(result, (err, info) => {
        if (!err) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "zaifa",
            author: userID,
            lastMessage: result
          });
        }
      });

    } catch (err) {
      message.reply("Error: " + (err.response?.data?.error || err.message));
    }
  }
};
