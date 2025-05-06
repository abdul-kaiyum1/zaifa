const { MongoClient } = require('mongodb');
const { getPrefix } = global.utils;

module.exports = {
  config: {
    name: "topcmd",
    version: "1.0",
    author: "Abdul Kaiyum",
    category: "utility",
    cooldown: 5,
    role: 0,
    shortDescription: "View top 15 most used commands",
    longDescription: "Displays the top 15 most used commands from the analytics in the GoatBotV2.globals MongoDB collection.",
    guide: "{pn}"
  },
  
  onStart: async function ({ message, event }) {
    // MongoDB connection URI (Make sure it's correct and replace accordingly)
    const uri = "mongodb+srv://abdulkaiyum:abdulkaiyum5426@octa.elx1m1f.mongodb.net/GoatBotV2?retryWrites=true&w=majority&appName=octa";
    
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    
    try {
      await client.connect();
      const db = client.db("GoatBotV2");
      const globalsCollection = db.collection("globals");
      
      // Retrieve the analytics data from the "globals" collection
      const analyticsData = await globalsCollection.findOne({ key: "analytics" });
      
      if (!analyticsData || !analyticsData.data) {
        return message.reply("No analytics data found.");
      }
      
      const usageData = analyticsData.data;
      
      // Convert the usage data to an array of [command, count] pairs and sort by count
      const sortedUsage = Object.entries(usageData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15); // Take top 15
      
      let replyMessage = "📊 Top 15 Command Usage 📊\n\n";
      
      sortedUsage.forEach(([command, count], index) => {
        replyMessage += `${index + 1}. ${command}: ${count}\n`;
      });
      
      replyMessage += `\nTip: Use the bot more to increase the command usage stats!`;
      
      // Send the message
      message.reply(replyMessage);

    } catch (err) {
      console.error(err);
      message.reply("Error retrieving usage statistics.");
    } finally {
      await client.close();
    }
  }
};