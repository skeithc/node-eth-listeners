/* eslint-disable no-underscore-dangle */
const { ethers } = require('ethers');

const { ETHEREUM: { URL, CHAIN_ID } } = require('../config');
const logger = require('./logger');

const WEBSOCKET_PING_INTERVAL = 10000;
const WEBSOCKET_PONG_TIMEOUT = 5000;
const WEBSOCKET_RECONNECT_DELAY = 100;

let providerInstance;
let providerProxy;
let events = [];
let requests = [];

// NOTE: Based on code from https://github.com/ethers-io/ethers.js/issues/1053
function connectPersistentProvider(providerUrl, chainId) {
  if (providerInstance) {
    events = [...events, ...providerInstance._events];
    requests = { ...requests, ...providerInstance._requests };
  }

  const provider = new ethers.providers.WebSocketProvider(
    providerUrl,
    chainId,
  );

  let pingInterval;
  let pongTimeout;

  provider._websocket.on('open', () => {
    logger.debug('Provider websocket connection opened');

    pingInterval = setInterval(() => {
      provider._websocket.ping();

      pongTimeout = setTimeout(
        () => {
          logger.debug('Provider websocket keepalive has timed out, closing connection...');
          provider._websocket.terminate();
        },
        WEBSOCKET_PONG_TIMEOUT,
      );
    }, WEBSOCKET_PING_INTERVAL);

    let event;
    // eslint-disable-next-line no-cond-assign
    while ((event = events.pop())) {
      provider._events.push(event);
      provider._startEvent(event);
    }

    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const key in requests) {
      provider._requests[key] = requests[key];
      provider._websocket.send(requests[key].payload);
      delete requests[key];
    }
  });

  provider._websocket.on('pong', () => {
    if (pongTimeout) clearTimeout(pongTimeout);
  });

  provider._websocket.on('close', (code) => {
    logger.debug('Provider connection closed', { code });

    provider._wsReady = false;

    if (pingInterval) clearInterval(pingInterval);
    if (pongTimeout) clearTimeout(pongTimeout);

    if (code !== 1000) {
      setTimeout(() => connectPersistentProvider(providerUrl, chainId), WEBSOCKET_RECONNECT_DELAY);
    }
  });

  providerInstance = provider;

  return provider;
}

async function connect() {
  logger.debug('Connecting to Ethereum provider...');

  connectPersistentProvider(URL, CHAIN_ID);

  providerProxy = new Proxy({ }, {
    get(target, prop, receiver) {
      const value = providerInstance && Reflect.get(providerInstance, prop, receiver);

      return value instanceof Function ? value.bind(providerInstance) : value;
    },
  });

  const network = await providerProxy.getNetwork();
  logger.debug(`Successfully connected to the Ethereum provider (network: ${network.name}, chainId: ${network.chainId})`);
}

function getProvider() {
  return providerProxy;
}

module.exports = {
  connect,
  getProvider,
};
