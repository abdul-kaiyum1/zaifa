module.exports = {
  "config": {
    "name": "daily",
    "version": "1.2",
    "author": "NTKhang",
    "countDown": 5,
    "role": 0,
    "description": {
      "vi": "Nhận quà hàng ngày",
      "en": "Receive daily gift"
    },
    "category": "Game",
    "guide": {
      "vi": "   {pn}: Nhận quà hàng ngày\n   {pn} info: Xem thông tin quà hàng ngày",
      "en": "   {pn}\n   {pn} info: View daily gift information"
    },
    "envConfig": {
      "rewardFirstDay": {
        "coin": 100,
        "exp": 10
      }
    }
  },
  "langs": {
    "vi": {
      "monday": "Thứ 2",
      "tuesday": "Thứ 3",
      "wednesday": "Thứ 4",
      "thursday": "Thứ 5",
      "friday": "Thứ 6",
      "saturday": "Thứ 7",
      "sunday": "Chủ nhật",
      "alreadyReceived": "Bạn đã nhận quà rồi",
      "received": "Bạn đã nhận được %1 coin và %2 exp"
    },
    "en": {
      "monday": "Monday",
      "tuesday": "Tuesday",
      "wednesday": "Wednesday",
      "thursday": "Thursday",
      "friday": "Friday",
      "saturday": "Saturday",
      "sunday": "Sunday",
      "alreadyReceived": "You have already received the gift",
      "received": "You have received %1 coin and %2 exp"
    }
  },
  "location": "/home/abdulkaiyum/octa/scripts/cmds/daily.js"
};