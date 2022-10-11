import { Contract } from 'ethers';
import { program } from 'commander';
import * as providerHelper from './helpers/provider.js';
import logger from './helpers/logger.js';

program
  .argument('<address>', 'Address to get past transfers for')
  .option('--token <token>', 'Token ID to get past transfers for', null)
  .option('--from <from>', 'From address to get past transfers for', null)
  .option('--to <to>', 'To address to get past transfers for', null);

const parsedArguments = program.parse();
const [address] = parsedArguments.args;
const { token, from, to } = parsedArguments.opts();

await providerHelper.connect();
const provider = providerHelper.getProvider();

const abi = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

logger.info(`Retrieving past events for address ${address}...`);
const contract = new Contract(address, abi, provider);

const transferFilter = contract.filters.Transfer(from, to, token);
const transferEvents = await contract.queryFilter(transferFilter);

const [name, symbol] = await Promise.all([
  contract.name().catch(() => null),
  contract.symbol().catch(() => null),
]);

for (const event of transferEvents) {
  console.log(`${name} (${symbol}) transfer: ${event.args.from} -> ${event.args.to} (tokenId: ${event.args.tokenId}) (transactionId: ${event.transactionHash})`);
}

process.exit(0);
