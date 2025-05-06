module.exports = {
  config: {
    name: "memory",
    aliases: ['memorygame'],
    version: "1.0",
    author: "sheikh",
    countDown: 5,
    role: 0,
    category: "game",
    guide: "",    
  },
  onStart: async function ({ event, message, api, usersData, args }) {
    // Define letters for the memory game
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Initialize grid with hidden letters
    const numRows = 5;
    const numCols = 6;
    const gridSize = numRows * numCols;
    let grid = Array.from({ length: gridSize / 2 }, (_, i) => letters[i]);

    // Duplicate letters for pairs
    grid = [...grid, ...grid];

    // Shuffle the grid
    grid = shuffle(grid);

    // Store the grid in the game object
    global.game[event.threadID] = {
      grid: grid,
      numRows: numRows,
      numCols: numCols,
      revealed: Array.from({ length: gridSize }, () => false),
      pending: [],
      turn: event.senderID,
      completedPairs: 0
    };

    // Send the initial grid to the user
    sendGrid(event.threadID, message);
  },
  onChat: async function ({ event, message, api, args }) {
    const game = global.game[event.threadID];
    if (!game) return;

    if (event.senderID !== game.turn) {
      message.reply("It's not your turn.");
      return;
    }

    const input = parseInt(event.body);
    if (isNaN(input) || input < 1 || input > game.numRows * game.numCols) {
      message.reply("Please enter a valid cell number.");
      return;
    }

    const index = input - 1;
    if (game.revealed[index]) {
      message.reply("This cell has already been revealed.");
      return;
    }

    // Reveal the selected cell
    game.revealed[index] = true;
    game.pending.push(index);

    // Send updated grid with revealed cells
    sendGrid(event.threadID, message);

    // Check if two cells are revealed
    if (game.pending.length === 2) {
      const [idx1, idx2] = game.pending;
      if (game.grid[idx1] === game.grid[idx2]) {
        // Match found
        game.completedPairs++;
        message.reply("Match found!");

        // Check if all pairs are completed
        if (game.completedPairs === game.numRows * game.numCols / 2) {
          message.reply("Congratulations! You've completed the memory game!");
          delete global.game[event.threadID];
          return;
        }
      } else {
        // No match, switch turn after a brief delay
        setTimeout(() => {
          game.revealed[idx1] = false;
          game.revealed[idx2] = false;
          sendGrid(event.threadID, message);
          game.turn = event.senderID; // Switch turn back to current player
        }, 2000);
      }

      // Clear pending array for next turn
      game.pending = [];
    } else {
      // Switch turn
      game.turn = game.turn === game.player1.id ? game.player2.id : game.player1.id;
    }
  }
};

// Function to shuffle an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Function to send the grid to the user
function sendGrid(threadID, message) {
  const game = global.game[threadID];
  if (!game) return;

  let gridString = 'Memory Game\n';
  for (let i = 0; i < game.numRows; i++) {
    for (let j = 0; j < game.numCols; j++) {
      const idx = i * game.numCols + j;
      if (game.revealed[idx]) {
        gridString += `${game.grid[idx]}  `;
      } else {
        gridString += `${idx + 1 < 10 ? ' ' : ''}${idx + 1} `;
      }
    }
    gridString += '\n';
  }

  message.send(gridString);
}