import Web3 from 'web3';
import Decimal from 'decimal.js';
import _ from 'lodash';
import config from './config.js';
import logger from './helpers/logger.js';

const provider = new Web3.providers.WebsocketProvider(config.ETHEREUM.URL);
const web3 = new Web3(provider);

const transferTopic = web3.eth.abi.encodeEventSignature('Transfer(address,address,uint256)');

const abi = [
  { name: 'symbol', type: 'function', constant: true, inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'name', type: 'function', constant: true, inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'decimals', type: 'function', constant: true, inputs: [], outputs: [{ name: '', type: 'uint8' }] },
];

const getTokenInfo = _.memoize(async function (contract) {
  const [name, symbol, decimals] = await Promise.all([
    contract.methods.name().call().catch(() => 'UNKNOWN'),
    contract.methods.symbol().call().catch(() => 'UNKNOWN'),
    contract.methods.decimals().call().catch(() => web3.utils.toBN(18)),
  ]);

  return { name, symbol, decimals };
});

async function handleTransferLog(error, log) {
  if (error) return logger.error(error);

  // ERC721 events have 3 indexed arguments vs erc20 events with only 2 indexed arguments
  // With the function signature, that makes 4 and 3 topics respectively
  if (![3, 4].includes(log.topics.length)) return;

  const isErc721 = log.topics.length === 4;

  try {
    const from = web3.eth.abi.decodeParameter('address', log.topics[1]);
    const to = web3.eth.abi.decodeParameter('address', log.topics[2]);

    const contract = new web3.eth.Contract(abi, log.address);
    const { name, symbol, decimals } = await getTokenInfo(contract);

    const rawValue = web3.eth.abi.decodeParameter('uint256', isErc721 ? log.topics[3] : log.data).toString();
    const value = !isErc721
      ? new Decimal(rawValue).dividedBy(new Decimal(10).pow(decimals.toString())).toString()
      : rawValue;

    logger.info(`[${isErc721 ? 'ERC721' : 'ERC20'}] [${log.address}] ${name} (${symbol}) transfer: ${from} -> ${to} (${isErc721 ? 'tokenId' : 'value'}: ${value})`);
  } catch (e) {
    logger.error('Unhandled error', e);
  }
}

logger.info('Subscribing...');
web3.eth
  .subscribe('logs', { topics: [transferTopic] }, handleTransferLog)
  .on('connected', (subscriptionId) => logger.info('Subscribed with id:', subscriptionId));
