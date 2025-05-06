module.exports = {
    config: {
        name: "😺",
        version: "1.0",
        author: "team Octa",
        countDown: 5,
        role: 0,
        shortDescription: "ignore this command",
        longDescription: "so beautiful so elegant just looking like a WoW💩",
        category: "no prefix",
    },
    onStart: async function () {},
    onChat: async function ({ event, message, getLang, api }) {
        const trigger = 'aiko';

        if (event.body && event.body.toLowerCase() === trigger) {
            return message.reply(`HEY! Am Here 😺\n\n🌐 System prefix: *\n🛸 Your box chat prefix: *`);
        }
    }
};