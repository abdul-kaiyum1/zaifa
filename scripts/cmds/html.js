const fs = require("fs-extra");
const path = require("path");

const RUNS_DIR = path.join(__dirname, "html_runs");

// --- Helpers ---
function ensureDir() {
  if (!fs.existsSync(RUNS_DIR)) fs.ensureDirSync(RUNS_DIR);
}

function nowTs() {
  return Date.now();
}

function cleanFilename(name) {
  return String(name || "")
    .replace(/[^a-z0-9_\-.]/gi, "_")
    .slice(0, 40);
}

function extractFromFences(text = "") {
  // Supports ```html ... ``` or ``` ... ```
  const fenceHtml = /```html([\s\S]*?)```/i.exec(text);
  if (fenceHtml) return fenceHtml[1].trim();
  const fenceAny = /```([\s\S]*?)```/i.exec(text);
  if (fenceAny) return fenceAny[1].trim();
  return text.trim();
}

function wrapBoilerplate(bodyContent = "", title = "HTML Preview") {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${title}</title>`,
    "  <style>",
    "    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;line-height:1.5;padding:24px;}",
    "    .container{max-width:960px;margin:0 auto}",
    "    .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06)}",
    "  </style>",
    "</head>",
    "<body>",
    '  <div class="container">',
    bodyContent,
    "  </div>",
    "</body>",
    "</html>",
  ].join("\n");
}

const TEMPLATES = {
  basic: wrapBoilerplate(
    [
      '<div class="card">',
      "  <h1>Basic Template</h1>",
      "  <p>You can edit this file and re-upload it.</p>",
      "</div>",
    ].join("\n"),
    "Basic Template"
  ),
  tailwind: [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    "  <title>Tailwind Starter</title>",
    '  <script src="https://cdn.tailwindcss.com"></script>',
    "</head>",
    '<body class="bg-gray-50 text-gray-900">',
    '  <div class="max-w-3xl mx-auto p-6">',
    '    <div class="bg-white shadow rounded-2xl p-6">',
    '      <h1 class="text-2xl font-bold">Tailwind Starter</h1>',
    '      <p class="mt-2 text-gray-600">Build something awesome ✨</p>',
    "    </div>",
    "  </div>",
    "</body>",
    "</html>",
  ].join("\n"),
  bootstrap: [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    "  <title>Bootstrap Starter</title>",
    '  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">',
    "</head>",
    '<body class="bg-light">',
    '  <div class="container py-4">',
    '    <div class="card shadow-sm">',
    '      <div class="card-body">',
    '        <h1 class="h3">Bootstrap Starter</h1>',
    "        <p class=\"text-muted mb-0\">You can add components and JS below.</p>",
    "      </div>",
    "    </div>",
    "  </div>",
    '  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>',
    "</body>",
    "</html>",
  ].join("\n"),
};

function saveHtmlForUser(userID, html, baseName = "preview") {
  ensureDir();
  const safeBase = cleanFilename(baseName || "preview");
  const fileName = `${safeBase}_${userID}_${nowTs()}.html`;
  const abs = path.join(RUNS_DIR, fileName);
  fs.writeFileSync(abs, html, "utf8");
  return abs;
}

function shortHelp(prefix = "{p}") {
  return [
    "🧪 HTML Runner — Commands:",
    `• ${prefix}html code <your html>`,
    `• ${prefix}html send   (reply to a message containing HTML)`,
    `• ${prefix}html wrap <body content>`,
    `• ${prefix}html template list`,
    `• ${prefix}html template <basic|tailwind|bootstrap>`,
    "",
    "Tips:",
    "• You can paste code inside ```html ... ``` fences.",
    "• The bot will send back a .html file you can open in your browser.",
  ].join("\n");
}

// ---- Command export ----
module.exports = {
  config: {
    name: "html",
    aliases: ["runhtml", "previewhtml"],
    version: "1.1.0",
    author: "Abdul Kaiyum",
    countDown: 3,
    role: 0,
    shortDescription: {
      en: "Save and send HTML as a real .html file"
    },
    longDescription: {
      en: "Paste or reply with HTML to generate a downloadable .html file you can open in a browser."
    },
    category: "tools",
    guide: {
      en: shortHelp("{p}")
    }
  },

  onStart: async function ({ api, event, args }) {
    const sub = (args[0] || "").toLowerCase();
    const uid = event.senderID;
    const tid = event.threadID;

    if (!sub) {
      return api.sendMessage(shortHelp(global.prefix || "{p}"), tid);
    }

    // html code <HTML...>
    if (sub === "code") {
      const raw = args.slice(1).join(" ");
      if (!raw) return api.sendMessage("❌ Provide HTML after `html code`.", tid);
      const html = extractFromFences(raw);
      if (!html) return api.sendMessage("❌ Could not find HTML content.", tid);

      const filePath = saveHtmlForUser(uid, html, "code");
      return api.sendMessage(
        {
          body: "✅ Generated HTML file. Open in a browser to execute.",
          attachment: fs.createReadStream(filePath)
        },
        tid
      );
    }

    // html send  (must be used replying to a message with HTML)
    if (sub === "send") {
      if (!event.messageReply || !event.messageReply.body) {
        return api.sendMessage("↩️ Reply to a message that contains HTML.", tid);
      }
      const html = extractFromFences(event.messageReply.body);
      if (!html) return api.sendMessage("❌ No HTML detected in the replied message.", tid);

      const filePath = saveHtmlForUser(uid, html, "reply");
      return api.sendMessage(
        {
          body: "✅ Generated HTML from reply.",
          attachment: fs.createReadStream(filePath)
        },
        tid
      );
    }

    // html wrap <body content>
    if (sub === "wrap") {
      const body = args.slice(1).join(" ");
      if (!body) return api.sendMessage("❌ Provide body content after `html wrap`.", tid);
      const html = wrapBoilerplate(body, "Wrapped Preview");
      const filePath = saveHtmlForUser(uid, html, "wrap");
      return api.sendMessage(
        {
          body: "✅ Wrapped your content in a full HTML page.",
          attachment: fs.createReadStream(filePath)
        },
        tid
      );
    }

    // html template list
    if (sub === "template" && args[1] && args[1].toLowerCase() === "list") {
      const names = Object.keys(TEMPLATES);
      return api.sendMessage(
        "📦 Templates:\n• " + names.join("\n• "),
        tid
      );
    }

    // html template <name>
    if (sub === "template") {
      const name = (args[1] || "").toLowerCase();
      if (!name || name === "list") {
        return api.sendMessage("Usage:\n• html template list\n• html template <basic|tailwind|bootstrap>", tid);
      }
      const tpl = TEMPLATES[name];
      if (!tpl) return api.sendMessage("❌ Unknown template. Use `html template list`.", tid);

      const filePath = saveHtmlForUser(uid, tpl, `template_${name}`);
      return api.sendMessage(
        {
          body: `✅ Generated template: ${name}`,
          attachment: fs.createReadStream(filePath)
        },
        tid
      );
    }

    // Fallback: maybe user just pasted raw HTML without subcommand
    const asRaw = extractFromFences(args.join(" "));
    if (asRaw && /<\s*html|<\s*head|<\s*body/i.test(asRaw)) {
      const filePath = saveHtmlForUser(uid, asRaw, "raw");
      return api.sendMessage(
        {
          body: "✅ Detected raw HTML. Saved & sent.",
          attachment: fs.createReadStream(filePath)
        },
        tid
      );
    }

    // Help
    return api.sendMessage(shortHelp(global.prefix || "{p}"), tid);
  },

  // No interactive replies needed for this command,
  // but you could add onReply to implement an edit flow if you want later.
  onReply: async function () {}
};