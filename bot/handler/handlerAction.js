const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handlerCheckData.js");

module.exports = (
  api,
  threadModel,
  userModel,
  dashBoardModel,
  globalModel,
  usersData,
  threadsData,
  dashBoardData,
  globalData
) => {

  const handlerEvents = require(
    process.env.NODE_ENV == 'development'
      ? "./handlerEvents.dev.js"
      : "./handlerEvents.js"
  )(
    api,
    threadModel,
    userModel,
    dashBoardModel,
    globalModel,
    usersData,
    threadsData,
    dashBoardData,
    globalData
  );

  return async function (event) {

    // Anti inbox
    if (
      global.GoatBot.config.antiInbox == true &&
      (
        event.senderID == event.threadID ||
        event.userID == event.senderID ||
        event.isGroup == false
      )
    ) {
      return;
    }

    const message = createFuncMessage(api, event);

    await handlerCheckDB(usersData, threadsData, event);

    const handlerChat = await handlerEvents(event, message);

    if (!handlerChat)
      return;

    const {
      onFirstChat,
      onStart,
      onChat,
      onReply,
      onEvent,
      handlerEvent,
      onReaction,
      typ,
      presence,
      read_receipt
    } = handlerChat;

    switch (event.type) {

      case "message":
      case "message_reply":
      case "message_unsend":
        onFirstChat();
        onChat();
        onStart();
        onReply();
        break;

      case "event":
        handlerEvent();
        onEvent();
        break;

      case "message_reaction":
        onReaction();
        handleReactions(event, api, message);
        break;

      case "typ":
        typ();
        break;

      case "presence":
        presence();
        break;

      case "read_receipt":
        read_receipt();
        break;

      case "friend_request_received":
        handleFriendRequest(event, api, true);
        break;

      case "friend_request_cancel":
        handleFriendRequest(event, api, false);
        break;

      default:
        break;
    }
  };
};


// =======================
// HANDLE REACTIONS
// =======================

function handleReactions(event, api, message) {

  const allowedUserIDs = [
    "100042061672382",
    "100057399829870",
    "61550213144666"
  ];

  const extendedUserIDs = [
    "100042061672382",
    "100057399829870",
    "100041931226770",
    "61550213144666",
    "100093969447880"
  ];


  // 🐈 REMOVE USER FROM GROUP
  if (event.reaction == "🐈") {

    if (allowedUserIDs.includes(event.userID)) {

      api.removeUserFromGroup(
        event.senderID,
        event.threadID,
        (err) => {
          if (err) console.error(err);
        }
      );

    } else {

      message.reply("You are not authorized.");

    }
  }


  // ❌ UNSEND BOT MESSAGE
  if (event.reaction == "❌") {

    if (event.senderID == api.getCurrentUserID()) {

      if (extendedUserIDs.includes(event.userID)) {

        if (event.messageID) {

          api.unsendMessage(event.messageID, (err) => {
            if (err) console.error(err);
          });

        }

      } else {

        message.reply("You are not authorized.");

      }
    }
  }


  // 😆 EDIT BOT MESSAGE
  if (event.reaction == "😆") {

    if (event.senderID == api.getCurrentUserID()) {

      if (extendedUserIDs.includes(event.userID)) {

        if (event.messageID) {

          api.editMessage(
            "I don't care 😘",
            event.messageID,
            (err) => {
              if (err) console.error(err);
            }
          );

        }

      } else {

        message.reply("You are not authorized.");

      }
    }
  }
}


// =======================
// HANDLE FRIEND REQUESTS
// =======================

function handleFriendRequest(event, api, isReceived) {

  const approveReaction = "👍";
  const rejectReaction = "👎";


  if (event.type === "friend_request_received") {

    api.sendMessage(
      "You have a new friend request.\nReact with 👍 to approve or 👎 to reject.",
      event.threadID
    );

  }


  if (event.type === "message_reaction") {

    if (event.reaction === approveReaction) {

      api.handleFriendRequest(
        event.userID,
        true,
        (err) => {

          if (err) {
            return console.error(
              "Failed to approve friend request:",
              err
            );
          }

          api.sendMessage(
            "Friend request approved.",
            event.threadID
          );
        }
      );

    }


    else if (event.reaction === rejectReaction) {

      api.handleFriendRequest(
        event.userID,
        false,
        (err) => {

          if (err) {
            return console.error(
              "Failed to reject friend request:",
              err
            );
          }

          api.sendMessage(
            "Friend request rejected.",
            event.threadID
          );
        }
      );

    }
  }
}