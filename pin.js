module.exports = {
  "config": {
    "name": "pin",
    "version": "1.1",
    "author": "Rishad",
    "countDown": 40,
    "role": 0,
    "shortDescription": {
      "vi": "Xem uid",
      "en": "get pictures from Pinterest"
    },
    "longDescription": {
      "uid": "Xem user id facebook của người dùng",
      "en": "get pictures from Pinterest"
    },
    "category": "picture ",
    "guide": {
      "vi": "   {pn}: dùng để xem id facebook của bạn\n   {pn} @tag: xem id facebook của những người được tag\n   {pn} <link profile>: xem id facebook của link profile",
      "en": "   {pn} <picture name> < - number of pictures you want(1-9)>\n   example: {pn} naruto-9"
    }
  },
  "langs": {
    "vi": {
      "syntaxError": "Vui lòng tag người muốn xem uid hoặc để trống để xem uid của bản thân"
    },
    "en": {
      "syntaxError": "Baka! that's not how you do it\nlearn first!"
    }
  },
  "location": "/home/abdulkaiyum/octa/scripts/cmds/pin.js"
};