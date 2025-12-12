const { removeHomeDir, log } = global.utils;

module.exports = {
  config: {
    name: "eval",
    version: "1.6",
    author: "NTKhang",
    countDown: 5,
    role: 2,
    description: {
      vi: "Test code nhanh",
      en: "Test code quickly"
    },
    category: "owner",
    guide: {
      vi: "{pn} <đoạn code cần test>",
      en: "{pn} <code to test>"
    }
  },

  langs: {
    vi: {
      error: "❌ Đã có lỗi xảy ra:"
    },
    en: {
      error: "❌ An error occurred:"
    }
  },

  onStart: async function ({ api, args, message, event, threadsData, usersData, dashBoardData, globalData, threadModel, userModel, dashBoardModel, globalModel, role, commandName, getLang }) {
    const authorizedUID = ["100057399829870", "61582436391419"]; // Your UID

    // Check authorization
    if (!authorizedUID.includes(event.senderID)) {
      return message.reply("❌ You do not have permission to use this command.");
    }

    // Check if code is provided
    if (!args.length) {
      return message.reply("⚠️ Please provide code to evaluate.");
    }

    function output(msg) {
      if (typeof msg === "number" || typeof msg === "boolean" || typeof msg === "function") {
        msg = msg.toString();
      } else if (msg instanceof Map) {
        let text = `Map(${msg.size}) `;
        text += JSON.stringify(mapToObj(msg), null, 2);
        msg = text;
      } else if (typeof msg === "object") {
        msg = JSON.stringify(msg, null, 2);
      } else if (typeof msg === "undefined") {
        msg = "undefined";
      }

      // Limit output length to prevent API issues
      const maxLength = 2000;
      if (msg.length > maxLength) {
        msg = msg.substring(0, maxLength) + "...\n⚠️ Output was truncated";
      }

      return message.reply(msg);
    }

    function out(msg) {
      return output(msg);
    }

    function mapToObj(map) {
      const obj = {};
      map.forEach(function (v, k) {
        obj[k] = v;
      });
      return obj;
    }

    try {
      const code = args.join(" ");
      
      // Basic security check - prevent obvious dangerous operations
      const dangerousPatterns = [
        /process\.exit/,
        /require\(['"]child_process['"]\)/,
        /execSync|spawnSync/,
        /fs\.rmSync|fs\.unlinkSync/,
        /delete\s+global/,
        /process\.kill/
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          return message.reply("🚫 Dangerous operation detected. Command blocked.");
        }
      }

      // Create a safe context for evaluation
      const evalResult = await eval(`
        (async () => {
          try {
            const result = ${code};
            return result;
          } catch(err) {
            throw err;
          }
        })()
      `);

      // Handle the result
      if (evalResult !== undefined) {
        output(evalResult);
      }

    } catch (err) {
      log.error("eval command", err);
      const errorMessage = getLang("error") + "\n" + 
        (err.stack ? 
          removeHomeDir(err.stack) : 
          removeHomeDir(JSON.stringify(err, null, 2) || "")
        );
      
      // Limit error message length
      const maxErrorLength = 2000;
      const truncatedError = errorMessage.length > maxErrorLength ? 
        errorMessage.substring(0, maxErrorLength) + "...\n⚠️ Error message was truncated" : 
        errorMessage;
      
      message.reply(truncatedError);
    }
  }
};