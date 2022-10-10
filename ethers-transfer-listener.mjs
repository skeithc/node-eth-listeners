import { utils, Contract, BigNumber } from 'ethers';
import Decimal from 'decimal.js';
import _ from 'lodash';
import * as providerHelper from './helpers/provider.js';
import logger from './helpers/logger.js';

await providerHelper.connect();
const provider = providerHelper.getProvider();

const tokenAbi = ['function symbol() view returns (string)', 'function name() view returns (string)', 'function decimals() view returns (uint8)'];
const erc721TransferEvent = ['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'];
const erc20TransferEvent = ['event Transfer(address indexed from, address indexed to, uint256 value)'];

const transferTopic = [new utils.Interface(erc721TransferEvent).getEventTopic('Transfer')];

const getTokenInfo = _.memoize(async function (contract) {
  const [name, symbol, decimals] = await Promise.all([
    contract.name().catch(() => null),
    contract.symbol().catch(() => null),
    contract.decimals().catch(() => BigNumber.from('18')),
  ]);

  return { name, symbol, decimals };
});

async function handleTransferEvent(log) {
  // ERC721 events have 3 indexed arguments vs erc20 events with only 2 indexed arguments
  // With the function signature, that makes 4 and 3 topics respectively
  if (![3, 4].includes(log.topics.length)) return;

  const isErc721 = log.topics.length === 4;
  const transferEvent = isErc721 ? erc721TransferEvent : erc20TransferEvent;

  const contract = new Contract(log.address, [...tokenAbi, ...transferEvent], provider);

  try {
    const event = contract.interface.parseLog(log);
    const { name, symbol, decimals } = await getTokenInfo(contract);

    const value = !isErc721
      ? new Decimal(event.args.value.toString()).dividedBy(new Decimal(10).pow(decimals.toString())).toString()
      : event.args.tokenId.toString();

    logger.info(`[${isErc721 ? 'ERC721' : 'ERC20'}] [${log.address}] ${name} (${symbol}) transfer: ${event.args.from} -> ${event.args.to} (${isErc721 ? 'tokenId' : 'value'}: ${value})`);
  } catch (e) {
    logger.error('Unhandled error', e);
  }
}

logger.info('Listening to ERC721 and ERC20 transfer events...');
provider
  .on({ address: null, topics: [transferTopic] }, handleTransferEvent);
