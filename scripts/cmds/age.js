const moment = require("moment");

module.exports = {
  config: {
    name: "age",
    version: "1.2",
    author: "Sahadat Hossen",
    description: {
      en: "Calculate your age and time until your next birthday."
    },
    category: "Utility",
    cooldown: 5,
    guide: {
      en: "{p}age [DD/MM/YYYY]"
    }
  },

  onStart: async function ({ message, args }) {
    if (!args[0]) {
      return message.reply("Please provide your birthdate in DD/MM/YYYY format.");
    }

    const birthdate = moment(args[0], "DD/MM/YYYY", true);
    if (!birthdate.isValid()) {
      return message.reply("Invalid date format. Use DD/MM/YYYY.");
    }

    const now = moment();
    const age = now.diff(birthdate, "years");
    const ageMonths = now.diff(birthdate, "months") % 12;
    const daysInLastMonth = birthdate.clone().add(age, "years").add(ageMonths, "months").daysInMonth();
    const ageDays = now.diff(birthdate, "days") % daysInLastMonth;
    const totalDaysLived = now.diff(birthdate, "days");

    let nextBirthday = birthdate.clone().year(now.year());
    if (nextBirthday.isBefore(now)) {
      nextBirthday.add(1, "year");
    }

    const duration = moment.duration(nextBirthday.diff(now));
    const monthsLeft = Math.floor(duration.asMonths());
    const daysLeft = duration.days();
    const hoursLeft = duration.hours();
    const minutesLeft = duration.minutes();
    const weekday = nextBirthday.format("dddd");

    return message.reply(
      `You are ${age} years, ${ageMonths} months, and ${ageDays} days old.\n\n` +
      `- Total days lived: ${totalDaysLived} days.\n` +
      `- Next birthday: ${monthsLeft} months, ${daysLeft} days, ${hoursLeft} hours, and ${minutesLeft} minutes away, on a ${weekday}.`
    );
  }
};
