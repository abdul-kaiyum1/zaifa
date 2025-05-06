const axios = require("axios");

module.exports = {
  config: {
    name: "ip",
    version: "1.0",
    author: "Abdul Kaiyum",
    role: 0,
    shortDescription: {
      en: "Get information about an IP address."
    },
    category: "utility",
    guide: {
      en: "{p}ip <ip-address>"
    }
  },
  onStart: async function ({ api, event, args }) {
    const ipAddress = args[0];
    if (!ipAddress) {
      api.sendMessage("Please provide an IP address.", event.threadID);
      return;
    }

    try {
      const response = await axios.get(`http://ip-api.com/json/${ipAddress}`);
      const data = response.data;

      if (data.status === "fail") {
        api.sendMessage("Failed to fetch IP information. Please check the provided IP address.", event.threadID);
        return;
      }
      const continent = data.continent || "N/A";
      const country = data.country || "N/A";
      const region = data.regionName || "N/A";
      const city = data.city || "N/A";
      const countryCode = data.countryCode || "N/A";
      const timezone = data.timezone || "N/A";
      const longitude = data.lon || "N/A";
      const latitude = data.lat || "N/A";
      const isp = data.isp || "N/A";

      const message = `
✅ Success ✅

🌍 Continent: ${continent}
🏷 Country: ${country}
🗺 Region: ${region}
🏛 City: ${city}
🏁 Country Code: ${countryCode}
⏱ Timezone: ${timezone}
📉 Longitude: ${longitude}
📈 Latitude: ${latitude}
🔍 ISP: ${isp}
👀 Query: ${ipAddress}
      `;
      api.sendMessage(message, event.threadID);
    } catch (error) {
      console.error("Error fetching IP information:", error);
      api.sendMessage("An error occurred while fetching IP information. Please try again later.", event.threadID);
    }
  }
};
