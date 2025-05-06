module.exports = {
  "config": {
    "name": "roulette",
    "aliases": [
      "rl"
    ],
    "version": "1.0",
    "author": "Abdul Kaiyum",
    "countDown": 5,
    "role": 0,
    "shortDescription": {
      "en": "Play Roulette and test your luck!"
    },
    "longDescription": {
      "en": "Experience the thrill of the Roulette wheel. Place your bets and see if you can win big!"
    },
    "category": "Game",
    "guide": {
      "en": "{pn} <bet type> <amount>\n\nBet types:\n- number (0-36)\n- red\n- black\n- odd\n- even\n\nExamples:\n{pn} red 100\n{pn} 17 50\n{pn} odd 200"
    }
  },
  "langs": {
    "en": {
      "invalid_amount": "Please enter a valid and positive amount to bet.",
      "not_enough_money": "Sorry, you don't have enough money to place that bet.",
      "invalid_bet": "Invalid bet type. Please bet on a number (0-36), red, black, odd, or even.",
      "bet_message": "You placed a bet of $%1 on %2.",
      "win_message": "Congratulations! The ball landed on %1. You won $%2.",
      "lose_message": "Sorry, the ball landed on %1. You lost $%2."
    }
  },
  "location": "/home/container/process/octa/scripts/cmds/roulette.js"
};