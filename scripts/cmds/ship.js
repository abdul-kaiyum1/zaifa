// scripts/cmds/ship.js
// Author: Abdul Kaiyum

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const CACHE_FOLDER_PATH = path.join(__dirname, 'cache');
fs.ensureDirSync(CACHE_FOLDER_PATH);

// Helper function to draw a circular image with a border
function drawCircularImage(ctx, image, x, y, size, borderWidth, borderColor) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(image, x, y, size, size);

    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    
    ctx.restore();
}


module.exports = {
    config: {
        name: "ship",
        aliases: ["love", "pair"],
        version: "1.1.0", // Updated version
        author: "Abdul Kaiyum",
        countDown: 10,
        role: 0,
        shortDescription: {
            en: "Calculate a love percentage between two people."
        },
        longDescription: {
            en: "Mention one person to ship with you, or two people to ship them together. Calculates a love percentage, creates a ship name, and generates a cute image."
        },
        category: "fun",
        guide: {
            en: "Usage: {pn} @user1 @user2\nOr: {pn} @user (to ship with yourself)"
        }
    },

    onStart: async function ({ api, event, usersData }) {
        const mentions = Object.keys(event.mentions);
        let uid1, uid2;
        let name1, name2;

        if (mentions.length === 1) {
            uid1 = event.senderID;
            uid2 = mentions[0];
            try {
                name1 = await usersData.getName(uid1);
                name2 = event.mentions[uid2].replace('@', '');
            } catch (e) {
                return api.sendMessage("Could not fetch user names.", event.threadID, event.messageID);
            }
        } else if (mentions.length >= 2) {
            uid1 = mentions[0];
            uid2 = mentions[1];
            name1 = event.mentions[uid1].replace('@', '');
            name2 = event.mentions[uid2].replace('@', '');
        } else {
            return api.sendMessage("Please mention one person (to ship with you) or two people.", event.threadID, event.messageID);
        }

        // Create a consistent percentage based on UIDs
        const percentage = Math.floor((parseInt(uid1.slice(0, 5)) + parseInt(uid2.slice(0, 5))) % 101);

        // Create a ship name
        const name1Clean = name1.split(" ")[0];
        const name2Clean = name2.split(" ")[0];
        const shipName = name1Clean.slice(0, Math.ceil(name1Clean.length / 2)) + name2Clean.slice(Math.floor(name2Clean.length / 2)).toLowerCase();

        try {
            const avatarUrl1 = await usersData.getAvatarUrl(uid1);
            const avatarUrl2 = await usersData.getAvatarUrl(uid2);
            
            const avatar1 = await loadImage(avatarUrl1);
            const avatar2 = await loadImage(avatarUrl2);

            const canvas = createCanvas(600, 250);
            const ctx = canvas.getContext('2d');

            // Background
            const gradient = ctx.createLinearGradient(0, 0, 600, 250);
            gradient.addColorStop(0, '#ff9a9e');
            gradient.addColorStop(1, '#fad0c4');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 600, 250);

            // Draw avatars as circles with borders
            drawCircularImage(ctx, avatar1, 50, 75, 120, 6, 'white');
            drawCircularImage(ctx, avatar2, 430, 75, 120, 6, 'white');

            // Draw heart
            ctx.font = '100px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('❤️', 300, 135);

            // Draw percentage
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(`${percentage}%`, 300, 175);
            ctx.shadowColor = 'transparent'; // Reset shadow

            // Draw names
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#333';
            ctx.fillText(name1Clean, 110, 40);
            ctx.fillText(name2Clean, 490, 40);
            
            // Draw ship name
            ctx.font = 'italic bold 28px Arial';
            ctx.fillStyle = '#333';
            ctx.fillText(shipName, 300, 80);

            const imagePath = path.join(CACHE_FOLDER_PATH, `ship_${uid1}_${uid2}.png`);
            const out = fs.createWriteStream(imagePath);
            const stream = canvas.createPNGStream();
            stream.pipe(out);

            out.on('finish', () => {
                api.sendMessage({
                    body: `💘 Calculating love between ${name1} & ${name2}...\n\nTheir ship name is **${shipName}** with a love percentage of **${percentage}%**! 💖`,
                    attachment: fs.createReadStream(imagePath)
                }, event.threadID, () => fs.unlinkSync(imagePath));
            });

        } catch (error) {
            console.error("Error creating ship image:", error);
            api.sendMessage(`💘 Calculating love between ${name1} & ${name2}...\n\nTheir ship name is **${shipName}** with a love percentage of **${percentage}%**! 💖\n(Could not generate image due to an error)`, event.threadID);
        }
    }
};