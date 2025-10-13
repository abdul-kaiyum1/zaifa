module.exports = {
  "config": {
    "name": "sing",
    "aliases": [
      "song"
    ],
    "version": "2.2.0",
    "author": "Abdul Kaiyum",
    "countDown": 220,
    "role": 0,
    "shortDescription": {
      "en": "Play songs and manage your playlist."
    },
    "longDescription": {
      "en": "Search and play songs from YouTube with an interactive selection. Manage your personal playlist (add, play, or remove songs)."
    },
    "category": "music",
    "guide": {
      "en": "Usage:\n• {pn} <song name | YouTube URL>\n• {pn} playlist -a <song name>    ➜ Add song to playlist\n• {pn} playlist -p <index>        ➜ Play song from playlist\n• {pn} playlist list              ➜ View your playlist\n• {pn} playlist -r <index>        ➜ Remove song from playlist"
    }
  },
  "location": "/home/abdulkaiyum/zaifa/scripts/cmds/sing.js"
};