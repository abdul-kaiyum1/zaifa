
const fs = require('fs');
const util = require('util');
const textToSpeech = require('@google-cloud/text-to-speech');
const path = require('path');
const client = new textToSpeech.TextToSpeechClient();

const availableVoices = {
  'en-US': ['en-US-Standard-A', 'en-US-Standard-B', 'en-US-Wavenet-A', 'en-US-Wavenet-B'],
  'es-ES': ['es-ES-Standard-A', 'es-ES-Standard-B', 'es-ES-Wavenet-B', 'es-ES-Wavenet-C'],
  'fr-FR': ['fr-FR-Standard-A', 'fr-FR-Standard-B', 'fr-FR-Wavenet-A', 'fr-FR-Wavenet-B'],
  'de-DE': ['de-DE-Standard-A', 'de-DE-Standard-B', 'de-DE-Wavenet-A', 'de-DE-Wavenet-B'],
  'it-IT': ['it-IT-Standard-A', 'it-IT-Standard-B', 'it-IT-Wavenet-A', 'it-IT-Wavenet-B'],
  'ja-JP': ['ja-JP-Standard-A', 'ja-JP-Standard-B', 'ja-JP-Wavenet-A', 'ja-JP-Wavenet-B'],
};

function getRandomVoice(languageCode) {
  const voices = availableVoices[languageCode] || availableVoices['en-US'];
  return voices[Math.floor(Math.random() * voices.length)];
}

function detectLanguage(text) {
  const langPatterns = {
    'en-US': /^[a-zA-Z\s.,!?]+$/,
    'es-ES': /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s.,!?¿¡]+$/,
    'fr-FR': /^[a-zàâäéèêëîïôöùûüçA-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ\s.,!?]+$/,
    'de-DE': /^[a-zäöüßA-ZÄÖÜ\s.,!?]+$/,
    'it-IT': /^[a-zàèéìíîòóùA-ZÀÈÉÌÍÎÒÓÙ\s.,!?]+$/,
    'ja-JP': /^[ぁ-んァ-ン一-龯\s。、！？]+$/,
  };

  for (const [lang, pattern] of Object.entries(langPatterns)) {
    if (pattern.test(text)) return lang;
  }
  return 'en-US';
}

async function synthesizeSpeech(text, languageCode, pitch, speakingRate) {
  const request = {
    input: {text: text},
    voice: {languageCode: languageCode, name: getRandomVoice(languageCode)},
    audioConfig: {
      audioEncoding: 'MP3',
      pitch: pitch,
      speakingRate: speakingRate,
    },
  };

  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}

module.exports = {
  config: {
    name: "v",
    version: "1.0.0",
    author: "Abdul Kaiyum",
    countDown: 15,
    role: 0,
    shortDescription: {
      en: "Convert text to speech with advanced options"
    },
    longDescription: {
      en: "Convert text to speech using Google Cloud Text-to-Speech API with language detection, pitch, and speed control"
    },
    category: "utility",
    guide: {
      en: "{prefix}tts <text> | [pitch] | [speed]\nPitch range: -20 to 20\nSpeed range: 0.25 to 4.0"
    }
  },
  
  onStart: async function ({ api, event, args }) {
    const fullText = args.join(" ");
    const [text, pitch = "0", speed = "1"] = fullText.split("|").map(str => str.trim());

    if (!text) {
      api.setMessageReaction("❌", event.messageID, (err) => {}, true);
      return api.sendMessage("Please provide some text to convert to speech.", event.threadID);
    }

    api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

    const pitchValue = Math.max(-20, Math.min(20, parseFloat(pitch)));
    const speedValue = Math.max(0.25, Math.min(4.0, parseFloat(speed)));

    try {
      const detectedLanguage = detectLanguage(text);
      const audioContent = await synthesizeSpeech(text, detectedLanguage, pitchValue, speedValue);

      const writeFile = util.promisify(fs.writeFile);
      const outputFile = path.join(__dirname, `output_${event.messageID}.mp3`);
      await writeFile(outputFile, audioContent, 'binary');

      api.sendMessage(
        {
          attachment: fs.createReadStream(outputFile),
          body: `Here's your text-to-speech audio:\nLanguage: ${detectedLanguage}\nPitch: ${pitchValue}\nSpeed: ${speedValue}`
        },
        event.threadID,
        () => {
          api.setMessageReaction("✅", event.messageID, (err) => {}, true);
          fs.unlinkSync(outputFile);
        }
      );
    } catch (error) {
      console.error('ERROR:', error);
      api.setMessageReaction("❌", event.messageID, (err) => {}, true);
      api.sendMessage("An error occurred while converting text to speech.", event.threadID);
    }
  }
};
