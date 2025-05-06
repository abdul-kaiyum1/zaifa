const { MongoClient } = require('mongodb');
const { createCanvas } = require('canvas');
const path = require('path');
const fs = require('fs');

// Database connection setup
const mongoURI = "mongodb+srv://abdulkaiyum:abdulkaiyum5426@octa.elx1m1f.mongodb.net/GoatBotV2?retryWrites=true&w=majority&appName=octa";
const dbName = 'GoatBotV2';
let db;

MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to Database');
  })
  .catch(error => console.error('Error connecting to MongoDB:', error));

const unlistedCommands = ["eval", "usage", "restart", "spamkick", "cmd"];
const maxBarsToShow = 15;

module.exports = {
  config: {
    name: "usage",
    version: "2.0",
    author: "Abdul Kaiyum",
    role: 0,
    shortDescription: { en: "Usage" },
    longDescription: { en: "Usage" },
    category: "admin",
    guide: { en: "{pn}" },
  },

  onStart: async function ({ api, args, message, event, role }) {
    if (role != 2) return message.reply("Unauthorized Access");
    try {
      const collection = db.collection('commandUsage');
      const commandUsage = await collection.find({}).sort({ usage: -1 }).limit(maxBarsToShow).toArray();

      if (commandUsage.length === 0) return message.reply("No command usage data available.");

      const canvasWidth = commandUsage.length * 120;
      const canvasHeight = 400;
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // Create background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
      gradient.addColorStop(0, '#f6f8fa');
      gradient.addColorStop(1, '#dfe6e9');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Add labels and grid lines
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px Arial';
      ctx.fillText("Commands", canvasWidth / 2 - 30, canvasHeight - 5);

      ctx.save();
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("Usage Count", -canvasHeight / 2, 20);
      ctx.restore();

      const numGridLines = 5;
      const gridSpacing = (canvasHeight - 100) / numGridLines;

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      for (let i = 1; i <= numGridLines; i++) {
        const y = canvasHeight - 50 - (gridSpacing * i);
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }

      const barWidth = 50;
      const spacing = 20;
      let xPos = 50;
      const maxUsage = Math.max(...commandUsage.map(cmd => cmd.usage));

      for (const cmd of commandUsage) {
        const barHeight = (cmd.usage / maxUsage) * (canvasHeight - 100);
        const hue = Math.floor(Math.random() * 360);
        const gradientBar = ctx.createLinearGradient(xPos, canvasHeight - barHeight - 50, xPos + barWidth, canvasHeight);
        gradientBar.addColorStop(0, `hsl(${hue}, 70%, 50%)`);
        gradientBar.addColorStop(1, `hsl(${hue}, 50%, 70%)`);
        ctx.fillStyle = gradientBar;
        ctx.fillRect(xPos, canvasHeight - barHeight - 50, barWidth, barHeight);

        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.strokeRect(xPos, canvasHeight - barHeight - 50, barWidth, barHeight);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(cmd.name, xPos + (barWidth / 2), canvasHeight - 30);
        ctx.fillText(cmd.usage, xPos + (barWidth / 2), canvasHeight - barHeight - 60);

        xPos += barWidth + spacing;
      }

      // Add "aiko" text in the middle of the graph
      const aikoText = "aiko cmds usages data";
      const textFontSize = Math.max(24, (canvasWidth / commandUsage.length) * 0.6); // Dynamically adjust text size
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.font = `bold ${textFontSize}px Arial`;
      ctx.fillText(aikoText, canvasWidth / 2, canvasHeight / 2);

      const buffer = canvas.toBuffer('image/png');
      const cacheFolderPath = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }
      const cachedImagePath = path.join(cacheFolderPath, 'usage_chart.png');
      fs.writeFileSync(cachedImagePath, buffer);

      message.reply({
        body: "",
        attachment: fs.createReadStream(cachedImagePath),
      });
    } catch (error) {
      message.reply(error.message);
    }
  },

  onChat: async function ({ event, message }) {
    const text = event.body;
    if (!text) return;

    const prefix = await global.utils.getPrefix(event.threadID);
    if (text.startsWith(prefix)) {
      const commandText = text.slice(prefix.length).split(" ")[0].toLowerCase();
      if (unlistedCommands.includes(commandText)) return;

      // Fetch the available commands and aliases from global.GoatBot
      const { commands, aliases } = global.GoatBot;

      // Check if the command is in the list of available commands or aliases
      const commandExists = commands.has(commandText) || aliases.has(commandText);
      if (!commandExists) return;  // If the command is not available, do not count it

      const collection = db.collection('commandUsage');
      const existingCommand = await collection.findOne({ name: commandText });

      if (existingCommand) {
        await collection.updateOne({ name: commandText }, { $inc: { usage: 1 } });
      } else {
        await collection.insertOne({ name: commandText, usage: 1 });
      }
    }
  }
};