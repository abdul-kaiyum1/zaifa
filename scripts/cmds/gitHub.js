const { exec } = require('child_process');

module.exports = {
  config: {
    name: "github",
    aliases: ["gh"],
    version: "1.0",
    role:2,
    author: "Abdul Kaiyum",
    shortDescription: "GitHub pull and push operations",
    longDescription: "Execute GitHub pull and push commands from the bot",
    category: "admin",
    guide: "{pn} pull\n{pn} push <commit-message>"
  },

  onStart: async function ({ message, args, event }) {
    const authorizedUserId = "100057399829870";
    
    // Check if the user is authorized
    if (event.senderID !== authorizedUserId) {
      return message.reply("You are not authorized to use this command.");
    }

    const operation = args[0]; // "pull" or "push"
    const commitMessage = args.slice(1).join(" "); // Commit message for push

    if (!operation) {
      return message.reply("Usage: {pn} pull\n{pn} push <commit-message>");
    }

    const validOperations = ["pull", "push"];

    if (!validOperations.includes(operation)) {
      return message.reply("Invalid operation. Usage: {pn} pull\n{pn} push <commit-message>");
    }

    const execGitCommand = (command, successMessage) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing ${command}: ${error.message}`);
          return message.reply(`Failed to execute ${command}: ${error.message}`);
        }
        if (stderr) {
          console.error(`Stderr from ${command}: ${stderr}`);
        }
        console.log(`Stdout from ${command}: ${stdout}`);
        message.reply(successMessage);
      });
    };

    if (operation === "pull") {
      execGitCommand('git pull', 'Successfully pulled from GitHub.');
    } else if (operation === "push") {
      if (!commitMessage) {
        return message.reply("Please provide a commit message for push.");
      }
      execGitCommand(`git add . && git commit -m "${commitMessage}" && git push origin main`, 'Successfully pushed to GitHub.');
    }
  }
};