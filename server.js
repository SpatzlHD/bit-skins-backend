const { BitskinsApiV2 } = require("bitskins-v2-api");
const express = require("express");
const cors = require("cors");
var creditCardType = require("credit-card-type");
require("dotenv").config();

const api = new BitskinsApiV2({ apiKey: process.env.BITSKINS_API_KEY });

const app = express();

app.use(cors());

app.get("/skins", async (req, res) => {
  const skins = (
    await api.market.all_available_skins.get_all_CSGO_skins()
  ).slice(0, 10);

  res.json(skins);
});

app.get("/wallet", async (req, res) => {
  const balance = await api.account.profile
    .get_account_balance()
    .catch((e) => console.log(e));
  const walletStats = await api.wallet.stats
    .get_wallet_stats()
    .catch((e) => console.log(e));
  const transactions = await api.wallet.transactions.get_wallet_transactions({
    where: {
      amount_from: -200000000,
      amount_to: 200000000,
    },
  });
  const kycRequired = await api.account.profile
    .get_current_session()
    .catch((e) => console.log(e));
  const kycLimits = await api.wallet.stats
    .get_kyc_limits()
    .catch((e) => console.log(e));
  const currency = await api.config.currency_rates
    .get_currency_rates()
    .catch((e) => console.log(e));

  const euroBalance = {
    user_id: balance.user_id,
    balance: await parseBalance(balance.balance, currency.fiat.EUR.value),
    wbalance: await parseBalance(balance.wbalance, currency.fiat.EUR.value),
    lbalance: await parseBalance(balance.lbalance, currency.fiat.EUR.value),
  };
  const cards = await api.wallet.deposit.card
    .list_cards()
    .catch((e) => console.log(e));
  await cards.map(async (v) => {
    const provider = await getCardProvider(v.masked_pan);
    const icon = icons[provider.type];
    v.icon = icon;
  });
  console.log(cards);
  const wallet = {
    balance,
    euroBalance,
    walletStats,
    transactions,
    kycRequired: kycRequired.kyc_required === 1 ? true : false,
    kycLimits,
    cards,
  };
  console.log(wallet.cards);
  res.json(wallet);
});

const host = app.listen(3000, () => {
  console.log("online");
});

async function parseBalance(usd, conversion) {
  if (usd.toString().length <= 3) {
    usd = parseFloat(`${0}.${usd}`);
  } else {
    usd = parseFloat(
      `${usd.toString().slice(0, -3)}.${usd.toString().slice(-3)}`
    );
  }

  const final = (usd / conversion).toFixed(2);
  return final;
}

async function getCardProvider(number) {
  const normNumber = number.toString().slice(0, 4);

  const provider = creditCardType(normNumber);
  return provider[0];
}

const icons = {
  visa: "https://i.ibb.co/6X0pMqV/visa.png",
  mastercard: "https://i.ibb.co/5sysCQt/mastercard.png",
};
