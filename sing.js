module.exports = {
  "config": {
    "name": "sing",
    "aliases": [
      "song"
    ],
    "version": "2.0",
    "author": "Abdul Kaiyum",
    "countDown": 40,
    "role": 0,
    "shortDescription": {
      "en": "Play songs, get lyrics, and manage a playlist."
    },
    "longDescription": {
      "en": "Play songs by name, fetch lyrics, or manage a playlist."
    },
    "category": "music",
    "guide": {
      "en": "{pn} <song name>\n{pn} playlist -a <song name>\n{pn} playlist -p <index>\n{pn} lyrics <song name>\n\nTo play a song from your playlist, use 'sing playlist play [number]'."
    }
  },
  "location": "/home/abdulkaiyum/octa/scripts/cmds/sing.js"
};