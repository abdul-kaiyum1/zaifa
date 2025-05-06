const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "bank",
    version: "2.2",
    description: "Advanced bank system with taxes, deposits, withdrawals, interest, transfers, and loans",
    guide: {
      en: `
- bank balance/bal
- bank deposit [amount] (1% tax)
- bank withdraw [amount]
- bank interest (0.2% every 6 hours, 15% tax)
- bank transfer/send [amount] [userID] (2% tax)
- bank loan [amount] (max $4000, 5% fee)
- bank payloan [amount]
- bank invest [low/med/high] [amount]
- bank richest/top
- bank details
- bank history
- bank status

Investment Options 
• Low risk: 3% return, 5% risk (6h)
• Medium Risk: 8% return, 15% risk (12h)
• High Risk: 15% return, 30% risk (24h)

Grow your money through investments! Choose between Low (3%), Medium (8%), or High (15%) returns. Higher rewards mean higher risks—invest wisely!
`
    },
    category: "Economy",
    countDown: 5,
    role: 0,
    author: "Sahadat Hossen"
  },

  onStart: async function(params) {
    try {
      const { args, message, event, api, usersData } = params;
      const { getPrefix } = global.utils;
      const p = getPrefix(event.threadID);
      const userID = event.senderID;
      const userMoney = await usersData.get(userID, "money");
      const userInfo = await api.getUserInfo(userID);
      const userName = userInfo[userID]?.name || "User";

      // Bank constants
      const interestRate = 0.002; // 0.2%
      const interestCooldown = 21600 * 1000; // 6 hours in ms
      const maxLoanAmount = 4000;
      const TAX_RATES = {
        DEPOSIT: 0.01,    // 1% tax on deposits
        INTEREST: 0.15,   // 15% tax on interest earnings
        TRANSFER: 0.02,   // 2% tax on transfers
        LOAN: 0.05        // 5% loan processing fee
      };

      // Bank data file path
      const bankDataPath = path.join(__dirname ,'data' ,'bank.json');

      // Initialize bank data if file doesn't exist
      if (!fs.existsSync(bankDataPath)) {
        fs.writeFileSync(bankDataPath, JSON.stringify({}), "utf8");
      }

      // Load bank data
      let bankData = JSON.parse(fs.readFileSync(bankDataPath, "utf8"));

      // Initialize user data if not exists
      if (!bankData[userID]) {
        bankData[userID] = { 
          bank: 0, 
          lastInterestClaimed: 0, 
          history: [], 
          loan: 0, 
          loanPayed: true,
          accountCreated: Date.now()
        };
      }

      const userBankData = bankData[userID];
      const bankBalance = userBankData.bank || 0;

      // Helper functions
      const saveBankData = () => {
        fs.writeFileSync(bankDataPath, JSON.stringify(bankData, null, 2), "utf8");
      };

      const generateTransactionID = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const addTransaction = (type, amount, recipient = null, tax = 0) => {
        const transactionID = generateTransactionID();
        const transaction = {
          id: transactionID,
          type,
          amount,
          tax,
          date: new Date().toISOString(),
          recipient
        };
        userBankData.history.push(transaction);
        return transactionID;
      };

      const calculateTax = (amount, taxType) => {
        const rate = TAX_RATES[taxType] || 0;
        const tax = amount * rate;
        return {
          taxedAmount: amount - tax,
          taxDeducted: tax
        };
      };

      const formatMoney = (amount) => {
        if (amount >= 1e6) {
          const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No"];
          const tier = Math.log10(amount) / 3 | 0;
          if (tier >= suffixes.length) return `${amount.toExponential(2)}`;
          const suffix = suffixes[tier];
          const scale = Math.pow(10, tier * 3);
          const scaled = amount / scale;
          return `${scaled.toFixed(2)}${suffix}`;
        }
        return amount.toFixed(2);
      };

      const generateAccountNumber = (id) => {
        const hash = id.toString().split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        return `BANK-${Math.abs(hash).toString().slice(0, 4)}-${id.toString().slice(-4)}`;
      };

      const command = args[0]?.toLowerCase();
      const amount = parseFloat(args[1]);
      const recipientID = args[2] ? parseInt(args[2]) : null;

      switch (command) {
        case "deposit":
          if (isNaN(amount)) {
            return message.reply(`❌ Please specify a valid amount to deposit.\nExample: ${p}bank deposit 500`);
          }

          if (amount <= 0) {
            return message.reply("❌ Deposit amount must be greater than (zero).");
          }

          if (amount > userMoney) {
            return message.reply(`❌ You only have $${formatMoney(userMoney)} in your wallet.`);
          }

          const depositTax = calculateTax(amount, "DEPOSIT");
          const amountAfterTax = depositTax.taxedAmount;

          if (bankBalance + amountAfterTax > 1e104) {
            return message.reply("❌ Maximum bank balance limit ($1e104) would be exceeded.");
          }

          await usersData.set(userID, { money: userMoney - amount });
          userBankData.bank += amountAfterTax;
          const depositTxID = addTransaction("deposit", amountAfterTax, null, depositTax.taxDeducted);
          saveBankData();

          return message.reply(
            `✅ Successfully deposited $${formatMoney(amountAfterTax)} to your bank account.\n` +
            `▣ Tax Deducted: $${formatMoney(depositTax.taxDeducted)} (${TAX_RATES.DEPOSIT * 100}%)\n` +
            `▣ Transaction ID: ${depositTxID}\n` +
            `- New balance: $${formatMoney(userBankData.bank)}`
          );
          break;

        case "withdraw":
          if (isNaN(amount)) {
            return message.reply(`❌ Please specify a valid amount to withdraw.\nExample: ${p}bank withdraw 500`);
          }

          if (amount <= 0) {
            return message.reply("❌ Withdrawal amount must be greater than zero.");
          }

          if (amount > bankBalance) {
            return message.reply(`❌ Your bank balance is only $${formatMoney(bankBalance)}.`);
          }

          if (userMoney + amount > 1e104) {
            return message.reply("❌ Maximum wallet balance ($1e104) would be exceeded.");
          }

          await usersData.set(userID, { money: userMoney + amount });
          userBankData.bank -= amount;
          const withdrawTxID = addTransaction("withdraw", amount);
          saveBankData();

          return message.reply(
            `✅ Successfully withdrew $${formatMoney(amount)} from your bank account.\n` +
            `▣ Transaction ID: ${withdrawTxID}\n` +
            `- New balance: $${formatMoney(userBankData.bank)}`
          );
          break;

        case "balance":
        case "bal":
          return message.reply(
            `▣ Bank Account Summary for ${userName}:\n\n` +
            `• Wallet Balance: $${formatMoney(userMoney)}\n` +
            `• Bank Balance: $${formatMoney(bankBalance)}\n` +
            `• Active Loan: $${formatMoney(userBankData.loan || 0)}\n` +
            `• Total Assets: $${formatMoney(userMoney + bankBalance)}\n\n` +
            `- Tip: Use "${p}bank interest" to earn 0.2% interest every 6 hours!`
          );
          break;

        case "interest":
          const lastClaim = userBankData.lastInterestClaimed || 0;
          const now = Date.now();

          if (now - lastClaim < interestCooldown) {
            const remaining = interestCooldown - (now - lastClaim);
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            return message.reply(`⌛ You can claim interest again in ${hours}h ${minutes}m.`);
          }

          if (bankBalance <= 0) {
            return message.reply("❌ You need money in your bank account to earn interest.");
          }

          const grossInterest = bankBalance * interestRate;
          const interestTax = calculateTax(grossInterest, "INTEREST");
          const netInterest = interestTax.taxedAmount;

          userBankData.bank += netInterest;
          userBankData.lastInterestClaimed = now;
          const interestTxID = addTransaction("interest", netInterest, null, interestTax.taxDeducted);
          saveBankData();

          return message.reply(
            `🟢 You earned $${formatMoney(netInterest)} in interest (after ${TAX_RATES.INTEREST * 100}% tax)!\n` +
            `▣ Gross Interest: $${formatMoney(grossInterest)}\n` +
            `▣ Tax Paid: $${formatMoney(interestTax.taxDeducted)}\n` +
            `▣ Transaction ID: ${interestTxID}\n` +
            `- New bank balance: $${formatMoney(userBankData.bank)}\n\n` +
            `- Next interest available in 6 hours.`
          );
          break;

        case "transfer":
        case "send":
          if (isNaN(amount)) {
            return message.reply(`❌ Please specify a valid amount to transfer.\nExample: ${p}bank transfer 500 123456789`);
          }

          if (!recipientID) {
            return message.reply("❌ Please specify a recipient ID.");
          }

          const transferTax = calculateTax(amount, "TRANSFER");
          const transferAmountAfterTax = transferTax.taxedAmount;

          if (amount <= 0) {
            return message.reply("❌ Transfer amount must be greater than zero.");
          }

          if (recipientID === userID) {
            return message.reply("❌ You cannot transfer money to yourself.");
          }

          if (amount > bankBalance) {
            return message.reply(`❌ Your bank balance is only $${formatMoney(bankBalance)}.`);
          }

          // Initialize recipient if not exists
          if (!bankData[recipientID]) {
            bankData[recipientID] = { 
              bank: 0, 
              lastInterestClaimed: 0, 
              history: [], 
              loan: 0, 
              loanPayed: true 
            };
          }

          if (bankData[recipientID].bank + transferAmountAfterTax > 1e104) {
            return message.reply("❌ Recipient would exceed maximum bank balance ($1e104).");
          }

          userBankData.bank -= amount; // Deduct full amount (including tax)
          bankData[recipientID].bank += transferAmountAfterTax;

          const transferTxID = generateTransactionID();

          // Add transaction history for sender
          userBankData.history.push({
            id: transferTxID,
            type: "transfer",
            amount: transferAmountAfterTax,
            tax: transferTax.taxDeducted,
            date: new Date().toISOString(),
            recipient: recipientID
          });

          // Add transaction history for recipient
          bankData[recipientID].history.push({
            id: transferTxID,
            type: "received",
            amount: transferAmountAfterTax,
            date: new Date().toISOString(),
            sender: userID
          });

          saveBankData();

          const recipientName = (await api.getUserInfo(recipientID))[recipientID]?.name || "Unknown User";
          return message.reply(
            `✅ Successfully transferred $${formatMoney(transferAmountAfterTax)} to ${recipientName}.\n` +
            `▣ Tax Deducted: $${formatMoney(transferTax.taxDeducted)} (${TAX_RATES.TRANSFER * 100}%)\n` +
            `▣ Transaction ID: ${transferTxID}\n` +
            `- Your new balance: $${formatMoney(userBankData.bank)}`
          );
          break;

        case "loan":
          const currentLoan = userBankData.loan || 0;
          const hasActiveLoan = !userBankData.loanPayed && currentLoan > 0;

          if (isNaN(amount)) {
            return message.reply(`❌ Please specify a valid loan amount (max $${maxLoanAmount}).`);
          }

          const loanFee = calculateTax(amount, "LOAN");
          const loanAmountAfterFee = loanFee.taxedAmount;

          if (amount <= 0) {
            return message.reply("❌ Loan amount must be greater than zero.");
          }

          if (amount > maxLoanAmount) {
            return message.reply(`❌ Maximum loan amount is $${maxLoanAmount}.`);
          }

          if (hasActiveLoan) {
            return message.reply(`❌ You already have an active loan of $${formatMoney(currentLoan)}. Please pay it off first.`);
          }

          if (userBankData.bank + loanAmountAfterFee > 1e104) {
            return message.reply("❌ Taking this loan would exceed your maximum bank balance.");
          }

          userBankData.bank += loanAmountAfterFee;
          userBankData.loan = currentLoan + amount; // Original amount + fee
          userBankData.loanPayed = false;
          const loanTxID = addTransaction("loan", loanAmountAfterFee, null, loanFee.taxDeducted);
          saveBankData();

          return message.reply(
            `📝 You've taken a loan of $${formatMoney(loanAmountAfterFee)}.\n` +
            `▣ Processing Fee: $${formatMoney(loanFee.taxDeducted)} (${TAX_RATES.LOAN * 100}%)\n` +
            `▣ Transaction ID: ${loanTxID}\n` +
            `• Total debt: $${formatMoney(userBankData.loan)}\n` +
            `• New bank balance: $${formatMoney(userBankData.bank)}\n\n` +
            `⚠️ Remember to repay your loan on time!`
          );
          break;

        case "payloan":
          const loanAmount = userBankData.loan || 0;
          const isLoanPaid = userBankData.loanPayed;

          if (isNaN(amount)) {
            return message.reply(`❌ Please specify a valid amount to repay.\nCurrent loan: $${formatMoney(loanAmount)}`);
          }

          if (amount <= 0) {
            return message.reply("❌ Payment amount must be greater than zero.");
          }

          if (isLoanPaid || loanAmount <= 0) {
            return message.reply("✅ You don't have any outstanding loans.");
          }

          if (amount > loanAmount) {
            return message.reply(`❌ Your loan is only $${formatMoney(loanAmount)}.`);
          }

          if (amount > userMoney) {
            return message.reply(`❌ You only have $${formatMoney(userMoney)} in your wallet.`);
          }

          await usersData.set(userID, { money: userMoney - amount });
          userBankData.loan -= amount;

          if (userBankData.loan <= 0) {
            userBankData.loan = 0;
            userBankData.loanPayed = true;
          }

          const paymentTxID = addTransaction("loan_payment", amount);
          saveBankData();

          return message.reply(
            `✅ Paid $${formatMoney(amount)} towards your loan.\n` +
            `▣ Transaction ID: ${paymentTxID}\n` +
            `• Remaining debt: $${formatMoney(userBankData.loan)}\n` +
            `• New wallet balance: $${formatMoney(userMoney - amount)}`
          );
          break;

        case "richest":
        case "top":
          const sortedUsers = Object.entries(bankData)
            .filter(([id]) => id !== "null")
            .sort((a, b) => (b[1].bank || 0) - (a[1].bank || 0))
            .slice(0, 10);

          const topList = await Promise.all(sortedUsers.map(async ([id, data], index) => {
            const name = (await api.getUserInfo(id))[id]?.name || "Unknown User";
            return `${index + 1}. ${name} - $${formatMoney(data.bank || 0)}`;
          }));

          return message.reply(
            `▣ Top 10 Richest Users by Bank Balance:\n\n` +
            topList.join("\n") +
            `\n\n- Total money in circulation: $${formatMoney(
              Object.values(bankData).reduce((sum, user) => sum + (user.bank || 0), 0)
            )}`
          );
          break;

        case "details":
          const accountCreationDate = new Date(userBankData.accountCreated);
          const accountAgeDays = Math.floor((Date.now() - userBankData.accountCreated) / (1000 * 60 * 60 * 24));
          const accountAgeText = accountAgeDays > 365 
              ? `${Math.floor(accountAgeDays/365)} years, ${Math.floor((accountAgeDays%365)/30)} months`
              : accountAgeDays > 30 
                  ? `${Math.floor(accountAgeDays/30)} months, ${accountAgeDays%30} days`
                  : `${accountAgeDays} days`;

          const lastInterestDate = userBankData.lastInterestClaimed 
              ? new Date(userBankData.lastInterestClaimed).toLocaleString()
              : "Never";

          const nextInterestDate = userBankData.lastInterestClaimed 
              ? new Date(userBankData.lastInterestClaimed + interestCooldown).toLocaleString()
              : "Available now";

          const estimatedDailyInterest = bankBalance * interestRate * 4;
          const estimatedMonthlyInterest = estimatedDailyInterest * 30;

          const loanStatus = userBankData.loan > 0 
              ? `$${formatMoney(userBankData.loan)} (${userBankData.loanPayed ? "Paid" : "Unpaid"})`
              : "No active loans";

          const loanUtilization = userBankData.loan > 0 
              ? `${((userBankData.loan / maxLoanAmount) * 100).toFixed(1)}% of limit`
              : "0% utilized";

          let userTransactionCount = userBankData.history?.length || 0;
          const transactionStats = {
              deposits: 0,
              withdrawals: 0,
              transfers: 0,
              interests: 0,
              taxes: 0
          };
          let userTotalDeposited = 0;
          let userTotalWithdrawn = 0;
          let userTotalTaxPaid = 0;

          if (userTransactionCount > 0) {
              userBankData.history.forEach(tx => {
                  transactionStats[tx.type] = (transactionStats[tx.type] || 0) + 1;
                  if (tx.type === "deposit") userTotalDeposited += tx.amount;
                  if (tx.type === "withdraw") userTotalWithdrawn += tx.amount;
                  if (tx.type === "tax") userTotalTaxPaid += tx.amount;
              });
          }

          const lastTransaction = userTransactionCount > 0 
              ? `${userBankData.history[userTransactionCount-1].type} $${formatMoney(userBankData.history[userTransactionCount-1].amount)} (ID: ${userBankData.history[userTransactionCount-1].id})` 
              : "None";

          return message.reply(
              `ADV Bank Account Statement\n\n` +
              `Account Holder: ${userName}\n` +
              `Account #: ${generateAccountNumber(userID)}\n` +
              `Member Since: ${accountCreationDate.toLocaleDateString()} (${accountAgeText})\n\n` +

              `Balance Summary:\n` +
              `- Wallet: $${formatMoney(userMoney)}\n` +
              `- Bank: $${formatMoney(bankBalance)}\n` +
              `- Net Worth: $${formatMoney(userMoney + bankBalance)}\n\n` +

              `Interest Analysis:\n` +
              `- Rate: 0.2% every 6 hours\n` +
              `- Last Claim: ${lastInterestDate}\n` +
              `- Next Available: ${nextInterestDate}\n` +
              `- Est. Daily: ~$${formatMoney(estimatedDailyInterest)}\n` +
              `- Est. Monthly: ~$${formatMoney(estimatedMonthlyInterest)}\n\n` +

              `Loan Status:\n` +
              `- Status: ${loanStatus}\n` +
              `- Utilization: ${loanUtilization}\n` +
              `- Limit: $${maxLoanAmount}\n\n` +

              `Transaction Activity:\n` +
              `- Total Transactions: ${userTransactionCount}\n` +
              `- Deposits: ${transactionStats.deposits} ($${formatMoney(userTotalDeposited)})\n` +
              `- Withdrawals: ${transactionStats.withdrawals} ($${formatMoney(userTotalWithdrawn)})\n` +
              `- Transfers: ${transactionStats.transfers}\n` +
              `- Interests: ${transactionStats.interests}\n` +
              `- Taxes Paid: $${formatMoney(userTotalTaxPaid)}\n` +
              `- Last Transaction: ${lastTransaction}\n\n` +

              `Use '${p}bank history' for full transaction log\n` +
              `Your account is FDIC insured up to $250,000`
          );
          break;

        case "invest":
  // Investment configuration
  const INVESTMENT_OPTIONS = {
    low: {
      name: "Low Risk",
      min: 100,
      max: 5000,
      return: 0.03,  // 3% return
      risk: 0.05,    // 5% chance of loss
      loss: 0.25,    // 25% of investment if lost
      duration: 21600000 // 6 hours in ms
    },
    medium: {
      name: "Medium Risk",
      min: 500,
      max: 10000,
      return: 0.08,   // 8% return
      risk: 0.15,     // 15% chance of loss
      loss: 0.5,      // 50% of investment if lost
      duration: 43200000 // 12 hours in ms
    },
    high: {
      name: "High Risk",
      min: 1000,
      max: 20000,
      return: 0.15,   // 15% return
      risk: 0.3,      // 30% chance of loss
      loss: 0.75,     // 75% of investment if lost
      duration: 86400000 // 24 hours in ms
    }
  };

  // Check if user has an active investment
  if (userBankData.investment && userBankData.investment.endTime > Date.now()) {
    const remainingTime = userBankData.investment.endTime - Date.now();
    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

    return message.reply(
      `⏳ You already have an active ${userBankData.investment.type} investment!\n\n` +
      `▣ Amount: $${formatMoney(userBankData.investment.amount)}\n` +
      `▣ Potential Return: $${formatMoney(userBankData.investment.amount * INVESTMENT_OPTIONS[userBankData.investment.type].return)}\n` +
      `▣ Time Remaining: ${hours}h ${minutes}m\n\n` +
      `Check back later to collect your returns!`
    );
  }

  // Check if user can collect completed investment
  if (userBankData.investment && userBankData.investment.endTime <= Date.now()) {
    const investment = userBankData.investment;
    const option = INVESTMENT_OPTIONS[investment.type];
    let resultMessage = "";
    let profit = 0;

    // Calculate investment outcome
    if (Math.random() < option.risk) {
      // Investment failed
      const lossAmount = investment.amount * option.loss;
      userBankData.bank -= lossAmount;
      resultMessage = `❌ Your ${option.name} investment failed!\n` +
                     `▣ Lost: $${formatMoney(lossAmount)} (${option.loss * 100}% of investment)`;
    } else {
      // Investment succeeded
      profit = investment.amount * option.return;
      userBankData.bank += profit;
      resultMessage = `✅ Your ${option.name} investment succeeded!\n` +
                     `▣ Profit: $${formatMoney(profit)} (${option.return * 100}% return)`;
    }

    // Add transaction record
    addTransaction(
      "investment", 
      profit > 0 ? profit : -investment.amount * option.loss,
      null,
      0,
      investment.type
    );

    // Clear completed investment
    delete userBankData.investment;
    saveBankData();

    return message.reply(
      `${resultMessage}\n\n` +
      `• Investment Amount: $${formatMoney(investment.amount)}\n` +
      `• Risk Level: ${option.risk * 100}% chance of loss\n` +
      `• New Bank Balance: $${formatMoney(userBankData.bank)}\n\n` +
      `You can now make new investments!`
    );
  }

  // Handle new investment
  const investmentType = args[1]?.toLowerCase();
  const investmentAmount = parseFloat(args[2]);

  if (!investmentType || !INVESTMENT_OPTIONS[investmentType]) {
    return message.reply(
      `▣ Investment Options:\n\n` +
      `1/ ${p}bank invest low [amount] (3% return, 5% risk)\n` +
      `   - Min: $${INVESTMENT_OPTIONS.low.min}, Max: $${INVESTMENT_OPTIONS.low.max}\n` +
      `   - Duration: 6 hours\n\n` +
      `2/ ${p}bank invest medium [amount] (8% return, 15% risk)\n` +
      `   - Min: $${INVESTMENT_OPTIONS.medium.min}, Max: $${INVESTMENT_OPTIONS.medium.max}\n` +
      `   - Duration: 12 hours\n\n` +
      `3/ ${p}bank invest high [amount] (15% return, 30% risk)\n` +
      `   - Min: $${INVESTMENT_OPTIONS.high.min}, Max: $${INVESTMENT_OPTIONS.high.max}\n` +
      `   - Duration: 24 hours\n\n` +
      `Example: "${p}bank invest medium 1000" to invest $1000 in medium risk`
    );
  }

  if (isNaN(investmentAmount)) {
    return message.reply(`❌ Please specify a valid investment amount.`);
  }

  const option = INVESTMENT_OPTIONS[investmentType];

  if (investmentAmount < option.min) {
    return message.reply(`❌ Minimum investment for ${option.name} is $${option.min}.`);
  }

  if (investmentAmount > option.max) {
    return message.reply(`❌ Maximum investment for ${option.name} is $${option.max}.`);
  }

  if (investmentAmount > bankBalance) {
    return message.reply(`❌ You only have $${formatMoney(bankBalance)} in your bank.`);
  }

  // Create new investment
  userBankData.investment = {
    type: investmentType,
    amount: investmentAmount,
    startTime: Date.now(),
    endTime: Date.now() + option.duration
  };

  // Deduct investment amount from bank
  userBankData.bank -= investmentAmount;
  addTransaction("investment_start", -investmentAmount, null, 0, investmentType);
  saveBankData();

  const endTime = new Date(userBankData.investment.endTime).toLocaleString();

  return message.reply(
    `📈 Successfully invested $${formatMoney(investmentAmount)} in ${option.name}!\n\n` +
    `▣ Potential Return: $${formatMoney(investmentAmount * option.return)} (${option.return * 100}%)\n` +
    `▣ Risk: ${option.risk * 100}% chance to lose $${formatMoney(investmentAmount * option.loss)}\n` +
    `▣ Maturity Date: ${endTime}\n\n` +
    `Use "${p}bank invest" again after the duration to collect your returns!`
  );
  break;  

        case "history":
          const transactions = userBankData.history || [];

          if (transactions.length === 0) {
            return message.reply("📜 You don't have any transaction history yet.");
          }

          const recentTransactions = transactions
            .slice(-10)
            .map((t, i) => {
              const date = new Date(t.date).toLocaleString();
              let description = `${i + 1}. ${date} - ${t.id} - ${t.type} $${formatMoney(t.amount)}`;
              if (t.tax) description += ` (Tax: $${formatMoney(t.tax)})`;
              if (t.recipient) description += ` to ${t.recipient}`;
              else if (t.sender) description += ` from ${t.sender}`;
              return description;
            })
            .join("\n");

          return message.reply(
            `📜 Your Recent Transactions:\n\n` +
            recentTransactions +
            `\n\nShowing ${Math.min(10, transactions.length)} of ${transactions.length} total transactions.`
          );
          break;

        case "status":
          const bankUsersList = Object.keys(bankData).filter(id => id !== "null");
          const totalBankAccounts = bankUsersList.length;
          const systemTotalDeposits = Object.values(bankData).reduce((sum, user) => sum + (user.bank || 0), 0);

          // Financial metrics
          const accountsWithActiveLoans = Object.values(bankData).filter(user => user.loan > 0).length;
          const systemLoanPortfolio = Object.values(bankData).reduce((sum, user) => sum + (user.loan || 0), 0);
          const delinquentAccounts = Object.values(bankData).filter(user => 
            user.loan > 0 && !user.loanPayed && user.loan > maxLoanAmount*0.5
          ).length;

          // Transaction analytics
          let systemTransactionCount = 0;
          let systemDepositTotal = 0;
          let systemWithdrawalTotal = 0;
          let systemInterestPaid = 0;
          let systemTaxRevenue = 0;

          Object.values(bankData).forEach(user => {
            if (user.history) {
              systemTransactionCount += user.history.length;
              user.history.forEach(tx => {
                if (tx.type === "deposit") systemDepositTotal += tx.amount;
                if (tx.type === "withdraw") systemWithdrawalTotal += tx.amount;
                if (tx.type === "interest") systemInterestPaid += tx.amount;
                if (tx.type === "tax") systemTaxRevenue += tx.amount;
              });
            }
          });

          // Key ratios
          const ldrRatio = systemTotalDeposits > 0 ? (systemLoanPortfolio / systemTotalDeposits * 100).toFixed(1) : 0;
          const avgAccountValue = totalBankAccounts > 0 ? systemTotalDeposits / totalBankAccounts : 0;

          // Notable accounts
          const foundingAccount = Object.entries(bankData)
            .filter(([id]) => id !== "null")
            .sort((a, b) => (a[1].accountCreated || Date.now()) - (b[1].accountCreated || Date.now()))[0];

          const powerUser = Object.entries(bankData)
            .filter(([id]) => id !== "null")
            .sort((a, b) => (b[1].history?.length || 0) - (a[1].history?.length || 0))[0];

          const topBalanceHolder = Object.entries(bankData)
            .filter(([id]) => id !== "null")
            .sort((a, b) => (b[1].bank || 0) - (a[1].bank || 0))[0];

          return message.reply(
            `▣ BANK SYSTEM HEALTH REPORT\n` +
            `📊 As of ${new Date().toLocaleString()}\n\n` +

            `💵 FINANCIAL SUMMARY:\n` +
            `• Active Accounts: ${totalBankAccounts}\n` +
            `• Total Deposits: $${formatMoney(systemTotalDeposits)}\n` +
            `• Outstanding Loans: $${formatMoney(systemLoanPortfolio)} (${ldrRatio}% LDR)\n` +
            `• Delinquent Loans: ${delinquentAccounts}\n` +
            `• Total Tax Revenue: $${formatMoney(systemTaxRevenue)}\n\n` +

            `📈 AVERAGE METRICS:\n` +
            `• Account Balance: $${formatMoney(avgAccountValue)}\n` +
            `• Monthly Transactions: ${Math.floor(systemTransactionCount/Math.max(1, totalBankAccounts))}\n` +
            `• Avg. Deposits: $${formatMoney(systemDepositTotal/Math.max(1, totalBankAccounts))}\n` +
            `• Avg. Withdrawals: $${formatMoney(systemWithdrawalTotal/Math.max(1, totalBankAccounts))}\n\n` +

            ` SYSTEM LEADERS:\n` +
            `• Oldest Account: ${foundingAccount ? Math.floor((Date.now() - foundingAccount[1].accountCreated) / (1000 * 60 * 60 * 24)) + " days" : "N/A"}\n` +
            `• Most Active: ${powerUser ? powerUser[1].history?.length + " transactions" : "N/A"}\n` +
            `• Highest Balance: $${topBalanceHolder ? formatMoney(topBalanceHolder[1].bank || 0) : "N/A"}\n\n` +

            `ℹ️ Use 'bank details' for personal account analytics`
          );
          break; 

        default:
          return message.reply(
            `Available Commands:\n` +
            `• bank balance - Check your balance\n` +
            `• bank deposit [amount] - Deposit money (1% tax)\n` +
            `• bank withdraw [amount] - Withdraw money\n` +
            `• bank interest - Claim interest (0.2% every 6h, 15% tax)\n` +
            `• bank transfer [amount] [userID] - Send money (2% tax)\n` +
            `• bank loan [amount] - Take a loan (max $4000, 5% fee)\n` +
            `• bank payloan [amount] - Repay your loan\n` +
            `• bank invest [risk] [amount] - Invest your bank money with risk\n` +
            `• bank richest view top 10 users\n` +
            `• bank details - View detailed account information\n` +
            `• bank history - View transactions\n` +
            `• bank status - View bank system metrics\n\n` +
            `Example: "${p}bank deposit 500" to deposit $500`
          );
      }
    } catch (error) {
      console.error("Bank command error:", error);
      return params.message.reply("❌ An error occurred while processing your request. Please try again later.");
    }
  }
};
