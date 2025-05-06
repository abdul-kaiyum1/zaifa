const { exec } = require('child_process');
const os = require('os');

module.exports = {
  config: {
    name: "stats",
    version: "2.0",
    author: "Abdul Kaiyum",
    countDown: 0,
    role: 0,
    category: "Utility",
    shortDescription: "Get detailed system stats",
    guide: {
      en: "{pn} stats - Get detailed system stats",
    },
  },

  onStart: async function ({ api, args, message }) {
    try {
      const [
        osInfo,
        ramStats,
        storageStats,
        uptime,
        cpuStats,
        networkStats,
      ] = await Promise.all([
        getOsInfo(),
        getRamStats(),
        getStorageStats(),
        getUptime(),
        getCpuStats(),
        getNetworkStats(),
      ]);

      const statsMessage = `
🖥️ OS: ${osInfo.name} ${osInfo.version}
🔒 RAM Usage:
  🔵 Total: ${ramStats.total}
  🔴 Used: ${ramStats.used}
  ⚪ Free: ${ramStats.free}
💽 Storage Usage:
  🔵 Total: ${storageStats.total}
  🔴 Used: ${storageStats.used}
  ⚪ Free: ${storageStats.free}
⏲ Uptime: ${uptime}
💻 CPU Stats:
${cpuStats.map((core, index) => `  🔄 Core ${index + 1}:
    💼 Model: ${core.model}
    ⚡ Speed: ${core.speed} MHz
    ⌛ Times: ${JSON.stringify(core.times)}`).join('\n')}
📊 Load Average: ${cpuStats[cpuStats.length - 1].loadAvg.join(', ')}
🌐 Network Stats:
${networkStats.map((interface) => `  🔄 ${interface.name}:
    📥 Received: ${interface.rx}
    📤 Transmitted: ${interface.tx}`).join('\n')}
`;

      message.reply(statsMessage);
    } catch (error) {
      message.reply(`Error: ${error.message}`);
    }
  }
};

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function prettyMilliseconds(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];

  if (days > 0) parts.push(`${days} days`);
  if (hours > 0) parts.push(`${hours} hours`);
  if (minutes > 0) parts.push(`${minutes} minutes`);
  if (seconds > 0) parts.push(`${seconds} seconds`);

  return parts.join(', ');
}

async function getOsInfo() {
  return new Promise((resolve, reject) => {
    exec('cat /etc/os-release', (error, stdout) => {
      if (error) {
        reject(new Error(`Error getting OS info: ${error.message}`));
      } else {
        const osInfo = {};
        const lines = stdout.split('\n');
        lines.forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            osInfo[key.trim()] = value.trim().replace(/"/g, '');
          }
        });

        resolve({
          name: osInfo.NAME,
          version: osInfo.VERSION,
        });
      }
    });
  });
}

function getRamStats() {
  const totalMemory = formatBytes(os.totalmem());
  const freeMemory = formatBytes(os.freemem());
  const usedMemory = formatBytes(os.totalmem() - os.freemem());

  return { total: totalMemory, used: usedMemory, free: freeMemory };
}

function getStorageStats() {
  return new Promise((resolve, reject) => {
    exec('df -h --total', (error, stdout) => {
      if (error) {
        reject(new Error(`Error getting storage stats: ${error.message}`));
      } else {
        const lines = stdout.split('\n');
        const lastLine = lines[lines.length - 2];
        const [filesystem, size, used, available] = lastLine.split(/\s+/);
        const storageStats = { total: size, used: used, free: available };
        resolve(storageStats);
      }
    });
  });
}

function getUptime() {
  return Promise.resolve(prettyMilliseconds(os.uptime() * 1000));
}

async function getCpuStats() {
  const cpuInfo = os.cpus();
  const loadAvg = os.loadavg();
  const cpuStats = cpuInfo.map((core, index) => {
    return {
      model: core.model,
      speed: core.speed,
      times: core.times,
    };
  });

  cpuStats.push({
    loadAvg: loadAvg.map(load => load.toFixed(2)),
  });

  return cpuStats;
}

async function getNetworkStats() {
  const networkInterfaces = os.networkInterfaces();
  const networkStats = [];

  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    if (interfaces.length > 0) {
      const rx = interfaces[0].rx_bytes || 0;
      const tx = interfaces[0].tx_bytes || 0;

      networkStats.push({
        name,
        rx: formatBytes(rx),
        tx: formatBytes(tx),
      });
    }
  }

  return networkStats;
}