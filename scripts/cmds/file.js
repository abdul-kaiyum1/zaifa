const { resolve } = require("path");
const axios = require("axios");
const fs = require("fs");
const request = require("request");
const cheerio = require("cheerio");

module.exports = {
  config: {
    name: "file",
    version: "1.0",
    author: "Shahadat",//Main File My Ohio03 দূর্নীতি শুধু :")
    countDown: 5,
    role: 0,
    shortDescription: "out script file",
    longDescription: "out script file",
    category: "owner",
    guide: {
      vi: "{pn} <cmd file name>",
      en: "{pn} <cmd file name>",
    },
  },
  onStart: async function ({ api, event, args, messageReply, type }) {
    const permission = ["100042061672382","100057399829870"];
    if (!permission.includes(event.senderID)) {
      return api.sendMessage(
        "You don't have enough permission to use this command. Only Tawsin and Abdul can use it.",
        event.threadID,
        event.messageID
      );
    }
    const name = args.join(" ");
    if (!name) {
      return api.sendMessage("Please provide the file name.", event.threadID);
    }
    try {
      const fileContent = fs.readFileSync(__dirname + `/${name}.js`, "utf8");
      api.sendMessage(fileContent, event.threadID);
    } catch (error) {
      api.sendMessage(`Error: ${error.message}`, event.threadID);
    }
  }
};