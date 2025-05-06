const messageStore = new Map();

module.exports = {
  config: {
    name: "unsendMessageAlert", // Name of the event
    version: "1.2", // Version of the event
    author: "Abdul Kaiyum", // Author of the event
    category: "events" // Category of the event
  },

  // Event Listener for All Messages (to track and store)
  onStart: async function ({ api, event, usersData }) {
    const trackedUIDs = ["100090944270176", "100057399829870"]; // Array of UIDs (Sara, Sahadat, etc.)
    const ownerUID = "100057399829870"; // Your UID (Abdul)

    // Check if it's a message type event (to store message)
    if (event.type === "message" || event.type === "message_reply") {
      const { senderID, messageID, body } = event;

      // If the sender is in the tracked UIDs list, store the message
      if (trackedUIDs.includes(senderID)) {
        // Store the message content using messageID as the key
        messageStore.set(messageID, {
          content: body || "[Media content not stored]", // Save message content or mark as media
          timestamp: Date.now() // Optionally save the time
        });
      }
    }

    // Check if the event is of type 'message_unsend'
    if (event.type === "message_unsend") {
      const { senderID, messageID } = event;

      // Check if the user who unsent the message is in the tracked UIDs list
      if (trackedUIDs.includes(senderID)) {
        // Fetch user details of the person who unsent the message
        const userData = await usersData.get(senderID);
        const name = userData ? userData.name : "User"; // Fallback name if data isn't available

        // Check if we have the message stored
        const unsentMessage = messageStore.get(messageID);
        if (unsentMessage) {
          const { content } = unsentMessage;

          // Notify you (Abdul) with the unsent message content
          const notificationMessage = `${name} (UID: ${senderID}) has unsent a message.\n\nContent: "${content}"`;

          // Send the message to you
          api.sendMessage(notificationMessage, ownerUID);

          // Remove the message from the store after notifying you
          messageStore.delete(messageID);
        } else {
          // If the message was not found, send a fallback notification
          api.sendMessage(`${name} (UID: ${senderID}) has unsent a message, but it was not stored.`, ownerUID);
        }
      }
    }
  }
};
