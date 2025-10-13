const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const fs = require("fs");
const path = require("path");

const ADMIN_UID = "100057399829870";

module.exports = {
  config: {
    name: "sh",
    aliases: ["shell"],
    version: "1.0",
    author: "NZ R",
    category: "utility"
  },

  onStart: async function ({ event, message, args }) {
    try {
      if (event.senderID !== ADMIN_UID) return message.reply("You are not authorized to use this command.");

      if (!args.length) return message.reply("Please provide a shell command or code to execute.");

      const command = args.join(" ");
      const tmpDir = path.join(__dirname, "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

      const scriptPath = path.join(tmpDir, `script_${Date.now()}.sh`);
      fs.writeFileSync(scriptPath, command);

      const { stdout, stderr } = await execPromise(`bash ${scriptPath}`);

      fs.unlinkSync(scriptPath);

      const output = stdout || stderr || "No output.";
      const response = output.length > 2000 ? output.substring(0, 1997) + "..." : output;

      await message.reply({
        body: "```bash\n" + response + "\n```"
      });
    } catch (e) {
      await message.reply({
        body: "Error executing command: ```\n" + e.message + "\n```"
      });
    }
  }
};