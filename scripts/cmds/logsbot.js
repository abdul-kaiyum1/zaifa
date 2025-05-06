const { getTime } = global.utils;

module.exports = {
    config: {
        name: "logsbot",
        isBot: true,
        version: "1.4",
        author: "NTKhang",
        envConfig: {
            allow: true
        },
        category: "events"
    },

    langs: {
        vi: {
            title: "====== Nhật ký bot ======",
            added: "\n✅\nSự kiện: bot được thêm vào nhóm mới\n- Người thêm: %1",
            kicked: "\n❌\nSự kiện: bot bị kick\n- Người kick: %1",
            footer: "\n- User ID: %1\n- Nhóm: %2\n- ID nhóm: %3\n- Thời gian: %4"
        },
        en: {
            title: "====== Bot logs ======",
            added: "\n✅\nEvent: bot has been added to a new group\n- Added by: %1",
            kicked: "\n❌\nEvent: bot has been kicked\n- Kicked by: %1",
            footer: "\n- User ID: %1\n- Group: %2\n- Group ID: %3\n- Time: %4"
        }
    },

    onStart: async ({ usersData, threadsData, event, api, getLang }) => {
        const specificGroupID = "25413444221635115";

        if (
            (event.logMessageType === "log:subscribe" && event.logMessageData.addedParticipants.some(item => item.userFbId === api.getCurrentUserID()))
            || (event.logMessageType === "log:unsubscribe" && event.logMessageData.leftParticipantFbId === api.getCurrentUserID())
        ) {
            let msg = getLang("title");
            const { author, threadID } = event;
            if (author === api.getCurrentUserID()) return;

            let threadName;
            if (event.logMessageType === "log:subscribe") {
                threadName = (await api.getThreadInfo(threadID)).threadName;
                const authorName = await usersData.getName(author);
                msg += getLang("added", authorName);
            } else if (event.logMessageType === "log:unsubscribe") {
                threadName = (await threadsData.get(threadID)).threadName;
                const authorName = await usersData.getName(author);
                msg += getLang("kicked", authorName);
            }

            const time = getTime("DD/MM/YYYY HH:mm:ss");
            msg += getLang("footer", author, threadName, threadID, time);

            api.sendMessage(msg, specificGroupID);
        }
    }
};