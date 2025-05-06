module.exports = {
  "config": {
    "name": "callad",
    "version": "1.6",
    "author": "NTKhang",
    "countDown": 5,
    "role": 0,
    "shortDescription": {
      "vi": "gửi tin nhắn về admin bot",
      "en": "send message to admin bot"
    },
    "longDescription": {
      "vi": "gửi báo cáo, góp ý, báo lỗi,... của bạn về admin bot",
      "en": "send report, feedback, bug,... to admin bot"
    },
    "category": "support",
    "guide": {
      "vi": "   {pn} <tin nhắn>",
      "en": "   {pn} <message>"
    }
  },
  "langs": {
    "vi": {
      "missingMessage": "Vui lòng nhập tin nhắn bạn muốn gửi về admin",
      "sendByGroup": "\n- Được gửi từ nhóm: %1\n- Thread ID: %2",
      "sendByUser": "\n- Được gửi từ người dùng",
      "content": "\n\nNội dung:\n─────────────────\n%1\n─────────────────\nPhản hồi tin nhắn này để gửi tin nhắn về người dùng",
      "success": "Đã gửi tin nhắn của bạn về %1 admin thành công!\n%2",
      "failed": "Đã có lỗi xảy ra khi gửi tin nhắn của bạn về %1 admin\n%2\nKiểm tra console để biết thêm chi tiết",
      "reply": "📍 Phản hồi từ admin %1:\n─────────────────\n%2\n─────────────────\nPhản hồi tin nhắn này để tiếp tục gửi tin nhắn về admin",
      "replySuccess": "Đã gửi phản hồi của bạn về admin thành công!",
      "feedback": "📝 Phản hồi từ người dùng %1:\n- User ID: %2%3\n\nNội dung:\n─────────────────\n%4\n─────────────────\nPhản hồi tin nhắn này để gửi tin nhắn về người dùng",
      "replyUserSuccess": "Đã gửi phản hồi của bạn về người dùng thành công!",
      "noAdmin": "Hiện tại bot chưa có admin nào"
    },
    "en": {
      "missingMessage": "Please enter the message you want to send to admin",
      "sendByGroup": "\n- Sent from group: %1\n- Thread ID: %2",
      "sendByUser": "\n- Sent from user",
      "content": "\n\nContent:\n─────────────────\n%1\n─────────────────\nReply this message to send message to user",
      "success": "Sent your message to %1 admin successfully!\n%2",
      "failed": "An error occurred while sending your message to %1 admin\n%2\nCheck console for more details",
      "reply": "📍 Reply from admin %1:\n─────────────────\n%2\n─────────────────\nReply this message to continue send message to admin",
      "replySuccess": "Sent your reply to admin successfully!",
      "feedback": "📝 Feedback from user %1:\n- User ID: %2%3\n\nContent:\n─────────────────\n%4\n─────────────────\nReply this message to send message to user",
      "replyUserSuccess": "Sent your reply to user successfully!",
      "noAdmin": "Bot has no admin at the moment"
    }
  },
  "location": "/home/abdulkaiyum/octa/scripts/cmds/callad.js"
};