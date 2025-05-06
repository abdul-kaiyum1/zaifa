module.exports = {
  config: {
    name: "blackjack",
     aliases: ["bljk"],
    version: "1.0",
    countDown: 50,
    author: "Abdul Kaiyum",
    shortDescription: {
      en: "Enjoy the Blackjack game with realistic features and a chance to win!",
    },
    longDescription: {
      en: "Play Blackjack with the bot and experience the thrill of winning big!",
    },
    category: "Game",
  },
  langs: {
    en: {
      invalid_amount: "Invalid amount. Please enter a positive number.",
      not_enough_money: "Not enough money to place the bet.",
      blackjack_message: "🃏 Your hand: %1\n🃏 Dealer's hand: %2\n🎉 Result: %3\n💸 Winnings: $%4",
    },
  },
  onStart: async function ({ args, message, event, usersData, getLang, commandName }) {
    if (commandName !== "blackjack" || this.config.author !== "Abdul Kaiyum") {
        return message.reply("Command disabled. Please contact the original author for assistance.");
    }

    try {
      const { senderID } = event;
      const userData = await usersData.get(senderID);

      const betAmount = parseInt(args[0]);

      if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply(getLang("invalid_amount"));
      }

      if (betAmount > userData.money) {
        return message.reply(getLang("not_enough_money"));
      }

 
      const playerHand = [drawCard(), drawCard()];
      const dealerHand = [drawCard(), drawCard()];

 
      const result = playBlackjack(playerHand, dealerHand);

      const winnings = calculateWinnings(result, betAmount);
      await usersData.set(senderID, {
        money: userData.money + winnings,
        data: userData.data,
      });

   
      const messageText = getLang("blackjack_message", formatHand(playerHand), formatHand(dealerHand), result, winnings);
      return message.reply(messageText);
    } catch (error) {
      console.error("Error in Blackjack onStart:", error);
      return message.reply("An error occurred while playing Blackjack.");
    }
  },
};

function drawCard() {
  return Math.floor(Math.random() * 11) + 1;
}

function formatHand(hand) {
  const cardEmojis = {
    1: "🂡", // Ace
    2: "🂢", // 2
    3: "🂣", // 3
    4: "🂤", // 4
    5: "🂥", // 5
    6: "🂦", // 6
    7: "🂧", // 7
    8: "🂨", // 8
    9: "🂩", // 9
    10: "🂪", // 10
    11: "🂫", // Jack
    12: "🂭", // Queen
    13: "🂮", // King
  };

  return hand.map(card => cardEmojis[card]).join(" ");
}

// Helper function to play the Blackjack game and determine the result
function playBlackjack(playerHand, dealerHand) {
  const playerTotal = calculateHandTotal(playerHand);
  const dealerTotal = calculateHandTotal(dealerHand);

  if (playerTotal === 21) {
    return "Blackjack! You win!";
  } else if (dealerTotal === 21) {
    return "Dealer has Blackjack. You lose.";
  } else if (playerTotal > 21) {
    return "Bust! You went over 21. You lose.";
  } else if (dealerTotal > 21) {
    return "Dealer busts! You win!";
  } else if (playerTotal > dealerTotal) {
    return "You win!\nYour hand is higher.";
  } else if (playerTotal < dealerTotal) {
    return "You lose!\nDealer's hand is higher.";
  } else {
    return "It's a tie!\nYour hand is equal to the dealer's.";
  }
}

// Helper function to calculate the total value of a hand in Blackjack
function calculateHandTotal(hand) {
  let total = 0;
  let numAces = 0;

  for (const card of hand) {
    if (card === 1) {
      // Ace
      total += 11;
      numAces += 1;
    } else if (card > 10) {
      // Face cards
      total += 10;
    } else {
      // Number cards
      total += card;
    }
  }

  // Adjust for Aces
  while (total > 21 && numAces > 0) {
    total -= 10;
    numAces -= 1;
  }

  return total;
}

function calculateWinnings(result, betAmount) {
  if (result.includes("Blackjack")) {
    return betAmount * 2; 
  } else if (result.includes("You win")) {
    return betAmount; 
  } else if (result.includes("You lose")) {
    return -betAmount; 
  } else {
    return 0; 
  }
}
