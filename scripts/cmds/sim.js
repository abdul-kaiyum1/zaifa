const axios = require('axios');
const baseApiUrl = "https://www.noobs-api.rf.gd/dipto";

module.exports.config = {
  name: "aiko",
  aliases: [],
  version: "6.9.0",
  author: "Abdul Kaiyum",
  countDown: 0,
  role: 0,
  description: "Chat with Aiko the cutie",
  category: "chat",
  guide: {
    en: "{pn} [anyMessage]"
  }
};

module.exports.onStart = async ({ api, event, args, usersData }) => {
  const link = `${baseApiUrl}/baby`;
  const dipto = args.join(" ").toLowerCase();
  const uid = event.senderID;

  try {
    if (!args[0]) {
      const responses = ["Bolo baby", "hum", "type help baby", "type !baby hi"];
      return api.sendMessage(responses[Math.floor(Math.random() * responses.length)], event.threadID, event.messageID);
    }

    if (args[0] === 'remove') {
      const fina = dipto.replace("remove ", "");
      const { data } = await axios.get(`${link}?remove=${fina}&senderID=${uid}`);
      return api.sendMessage(data.message, event.threadID, event.messageID);
    }

    if (args[0] === 'rm' && dipto.includes('-')) {
      const [fi, f] = dipto.replace("rm ", "").split(' - ');
      const { data } = await axios.get(`${link}?remove=${fi}&index=${f}`);
      return api.sendMessage(data.message, event.threadID, event.messageID);
    }

    if (args[0] === 'list') {
      if (args[1] === 'all') {
        const { data } = await axios.get(`${link}?list=all`);
        const teachers = await Promise.all(data.teacher.teacherList.map(async (item) => {
          const number = Object.keys(item)[0];
          const value = item[number];
          const name = (await usersData.get(number)).name;
          return { name, value };
        }));
        teachers.sort((a, b) => b.value - a.value);
        const output = teachers.map((t, i) => `${i + 1}/ ${t.name}: ${t.value}`).join('\n');
        return api.sendMessage(`Total Teach = ${data.length}\n👑 | List of Teachers of baby\n${output}`, event.threadID, event.messageID);
      } else {
        const { data } = await axios.get(`${link}?list=all`);
        return api.sendMessage(`Total Teach = ${data.length}`, event.threadID, event.messageID);
      }
    }

    if (args[0] === 'msg') {
      const fuk = dipto.replace("msg ", "");
      const { data } = await axios.get(`${link}?list=${fuk}`);
      return api.sendMessage(`Message ${fuk} = ${data.data}`, event.threadID, event.messageID);
    }

    if (args[0] === 'edit') {
      const command = dipto.split(' - ')[1];
      if (!command) return api.sendMessage('❌ | Invalid format! Use edit [YourMessage] - [NewReply]', event.threadID, event.messageID);
      const { data } = await axios.get(`${link}?edit=${args[1]}&replace=${command}&senderID=${uid}`);
      return api.sendMessage(`Changed ${data.message}`, event.threadID, event.messageID);
    }

    if (args[0] === 'teach' && args[1] !== 'amar' && args[1] !== 'react') {
      const [comd, command] = dipto.split(' - ');
      const final = comd.replace("teach ", "");
      if (!command) return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
      const { data } = await axios.get(`${link}?teach=${final}&reply=${command}&senderID=${uid}`);
      const teacher = (await usersData.get(data.teacher)).name;
      return api.sendMessage(`✅ Replies added ${data.message}\nTeacher: ${teacher}\nTeachs: ${data.teachs}`, event.threadID, event.messageID);
    }

    if (args[0] === 'teach' && args[1] === 'amar') {
      const [comd, command] = dipto.split(' - ');
      const final = comd.replace("teach ", "");
      if (!command) return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
      const { data } = await axios.get(`${link}?teach=${final}&senderID=${uid}&reply=${command}&key=intro`);
      return api.sendMessage(`✅ Replies added ${data.message}`, event.threadID, event.messageID);
    }

    if (args[0] === 'teach' && args[1] === 'react') {
      const [comd, command] = dipto.split(' - ');
      const final = comd.replace("teach react ", "");
      if (!command) return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
      const { data } = await axios.get(`${link}?teach=${final}&react=${command}`);
      return api.sendMessage(`✅ Replies added ${data.message}`, event.threadID, event.messageID);
    }

    if (dipto.includes('amar name ki') || dipto.includes('amr nam ki') || dipto.includes('whats my name')) {
      const { data } = await axios.get(`${link}?text=amar name ki&senderID=${uid}&key=intro`);
      return api.sendMessage(data.reply, event.threadID, event.messageID);
    }

    const { data } = await axios.get(`${link}?text=${dipto}&senderID=${uid}&font=1`);
    api.sendMessage(data.reply, event.threadID, (error, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        type: "reply",
        messageID: info.messageID,
        author: event.senderID,
        apiUrl: link
      });
    }, event.messageID);

  } catch (e) {
    console.error(e);
    api.sendMessage("Check console for error", event.threadID, event.messageID);
  }
};

module.exports.onReply = async ({ api, event, Reply }) => {
  try {
    if (event.type === "message_reply") {
      const { data } = await axios.get(`${baseApiUrl}/baby?text=${encodeURIComponent(event.body.toLowerCase())}&senderID=${event.senderID}&font=1`);
      await api.sendMessage(data.reply, event.threadID, (error, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          type: "reply",
          messageID: info.messageID,
          author: event.senderID
        });
      }, event.messageID);
    }
  } catch (err) {
    api.sendMessage(`Error: ${err.message}`, event.threadID, event.messageID);
  }
};

module.exports.onChat = async ({ api, event, message }) => {
  try {
    const body = event.body ? event.body.toLowerCase() : "";
    if (body.startsWith("baby") || body.startsWith("janu")) {
      const arr = body.replace(/^\S+\s*/, "");
      if (!arr) return message.reply("Yes 😀, I am here");
      const { data } = await axios.get(`${baseApiUrl}/baby?text=${encodeURIComponent(arr)}&senderID=${event.senderID}&font=1`);
      await api.sendMessage(data.reply, event.threadID, (error, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          type: "reply",
          messageID: info.messageID,
          author: event.senderID
        });
      }, event.messageID);
    }
  } catch (err) {
    api.sendMessage(`Error: ${err.message}`, event.threadID, event.messageID);
  }
};