const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

module.exports = {
  config: {
    name: "html",
    aliases: ["render", "web"],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 10,
    role: 0,
    shortDescription: "Render HTML code to image",
    longDescription: "Execute simple HTML/CSS/JS code and show result as an image.",
    category: "utility",
    guide: {
      en: "{p}html <your html code>"
    }
  },

  onStart: async function ({ message, args }) {
    let htmlCode = args.join(" ");
    if (!htmlCode) {
      return message.reply("⚠️ Please provide some HTML code to render!");
    }

    // Add wrapper for styling (so raw text is valid HTML)
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
        </style>
      </head>
      <body>
        ${htmlCode}
      </body>
      </html>
    `;

    const filePath = path.join(__dirname, "html_preview.png");

    try {
      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });

      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: "networkidle0" });
      await page.screenshot({ path: filePath, fullPage: true });
      await browser.close();

      await message.reply({
        body: "✅ Here’s your rendered design:\n\n📜 HTML Code:\n" + htmlCode,
        attachment: fs.createReadStream(filePath)
      });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(err);
      message.reply("❌ Failed to render HTML.");
    }
  }
};