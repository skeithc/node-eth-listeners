require('dotenv').config();

module.exports = {
  ETHEREUM: {
    URL: process.env.ETHEREUM_URL,
    CHAIN_ID: process.env.ETHEREUM_CHAIN_ID,
  },
  OPENSEA: {
    API_KEY: process.env.OPENSEA_API_KEY,
    NETWORK: process.env.OPENSEA_NETWORK,
  },
};
