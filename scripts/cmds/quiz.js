const fs = require('fs');
const path = require('path');
const axios = require('axios');

const quizCachePath = path.join(__dirname, 'quiz_cache.json');
const userDataPath = path.join(__dirname, 'user_data.json');

let userData = {};
if (fs.existsSync(userDataPath)) {
  userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
}

async function fetchQuizQuestionsFromAPI(category) {
  try {
    const response = await axios.get(`https://opentdb.com/api.php?amount=50&type=multiple&category=${category}`);
    const questions = response.data.results.map(q => ({
      category: q.category,
      type: q.type,
      difficulty: q.difficulty,
      question: q.question,
      options: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
      answer: q.correct_answer,
    }));
    return questions;
  } catch (error) {
    console.error('Error fetching quiz questions from API:', error);
    return [];
  }
}

async function getQuizQuestions(category) {
  try {
    const cachedQuestions = JSON.parse(fs.readFileSync(quizCachePath, 'utf8'));
    const filteredQuestions = cachedQuestions.filter(q => q.category.toLowerCase() === category);
    if (filteredQuestions.length > 0) {
      return filteredQuestions;
    } else {
      console.log('No cached questions found for category, fetching from API...');
      return await fetchQuizQuestionsFromAPI(category);
    }
  } catch (error) {
    console.error('Quiz cache not found or invalid, fetching new questions...');
    return await fetchQuizQuestionsFromAPI(category);
  }
}

module.exports = {
  config: {
    name: "quiz",
    version: "2.0",
    description: "Answer quiz questions to earn money",
    guide: {
      en: "{pn}quiz <category> to start a quiz\nAnswer by replying to the question.\nAvailable categories: science, history, sports, animals, celebrities, general_knowledge, etc."
    },
    category: "games",
    countDown: 10,
    role: 0,
    author: "Abdul Kaiyum"
  },

  onStart: async function ({ message, event, api, args, usersData }) {
    const categoryMap = {
      science: "science",
      history: "history",
      sports: "sports",
      animals: "animals",
      'general knowledge': "general knowledge",
      celebrities: "celebrities",
      general_knowledge: "general_knowledge",
      geography: "geography",
      mythology: "mythology",
      art: "art",
      literature: "literature",
      music: "music",
      television: "television",
      film: "film",
      video_games: "video_games",
      board_games: "board_games",
      computers: "computers",
      mathematics: "mathematics",
      comic_books: "comic_books",
      gadgets: "gadgets",
      cartoon_animations: "cartoon_animations",
      anime_manga: "anime_manga"
    };

    const categoryArg = args.join(' ').toLowerCase();
    const category = categoryMap[categoryArg];

    if (!category) {
      return message.reply("Please specify a valid category: science, history, sports, animals,art, celebrities, general_knowledge,anime_manga,mythology,geography, literature, etc.");
    }

    const userId = event.senderID;

    if (!userData[userId]) {
      userData[userId] = { money: 0, quiz: {} };
    } else if (!userData[userId].quiz) {
      userData[userId].quiz = {};
    }

    const quizQuestions = await getQuizQuestions(category);

    if (quizQuestions.length === 0) {
      return message.reply("Unable to fetch quiz questions at the moment. Please try again later.");
    }

    const randomQuestion = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];

    try {
      message.reply({
        body: `Quiz Time!\nCategory: ${randomQuestion.category}\nQuestion: ${randomQuestion.question}\nOptions:\n${randomQuestion.options.map((opt, index) => `${index + 1}. ${opt}`).join('\n')}\n\nReply with the correct option number.`,
      }, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          answer: randomQuestion.answer,
          options: randomQuestion.options,
          answered: false
        });
      });
    } catch (error) {
      console.error('Error sending quiz question:', error);
      message.reply("Failed to send the quiz question. Please try again.");
    }
  },

  onReply: async function ({ message, Reply, event, usersData }) {
    const { author, answer, messageID, options } = Reply;

    if (event.senderID !== author) {
      return message.reply("⚠ You are not the player of this question.");
    }

    // Check if the user has already answered
    if (Reply.answered) {
      return message.reply("⚠ You have already answered this question.");
    }

    const userAnswerIndex = parseInt(event.body.trim()) - 1;

    if (isNaN(userAnswerIndex) || userAnswerIndex < 0 || userAnswerIndex >= options.length) {
      return message.reply("⚠ Invalid option. Please reply with the correct option number.");
    }

    const userAnswer = options[userAnswerIndex];
    const correctAnswer = answer;

    global.GoatBot.onReply.set(messageID, { ...Reply, answered: true });

    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
      const reward = Math.floor(Math.random() * 651) + 50; // Earn between $50 and $700
      userData[event.senderID].money = (userData[event.senderID].money || 0) + reward;
      await usersData.set(event.senderID, { money: userData[event.senderID].money });
      message.reply(`🎉 Correct answer! You've earned $${reward}. Your new balance is $${userData[event.senderID].money}.`);
    } else {
      message.reply(`❌ Wrong answer. Better luck next time!`);
    }

    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), 'utf8');
  }
};
