const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "accept",
    aliases: ['acp'],
    version: "1.69",
    author: "sheikh",
    countDown: 2,
    role: 2,
    shortDescription: "accept users",
    longDescription: "accept users",
    category: "Utility",
  },

  onStart: async function ({ event, api, commandName, message }) {
    const form = {
      av: api.getCurrentUserID(),
      fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
      fb_api_caller_class: "RelayModern",
      doc_id: "4499164963466303",
      variables: JSON.stringify({ input: { scale: 3 } })
    };
    const listRequest = JSON.parse(await api.httpPost("https://www.facebook.com/api/graphql/", form)).data.viewer.friending_possibilities.edges;

    for (const user of listRequest) {
      try {
        const friendRequestID = user.node.id;
        await acceptFriendRequest(api, friendRequestID);
      } catch (error) {
        console.error("Error accepting friend request:", error);
      }
    }

    message.reply(`All pending friend requests have been accepted.`, event.threadID);
  },
};

async function acceptFriendRequest(api, friendRequestID) {
  const form = {
    av: api.getCurrentUserID(),
    fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
    doc_id: "3147613905362928",
    variables: JSON.stringify({
      input: {
        source: "friends_tab",
        actor_id: api.getCurrentUserID(),
        client_mutation_id: Math.round(Math.random() * 19).toString(),
        friend_requester_id: friendRequestID
      },
      scale: 3,
      refresh_num: 0
    })
  };

  await api.httpPost("https://www.facebook.com/api/graphql/", form);
}