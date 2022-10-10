import { Network, OpenSeaStreamClient } from '@opensea/stream-js';
import ws from 'ws';
import config from './config.js';

const client = new OpenSeaStreamClient({
  token: config.OPENSEA.API_KEY,
  network: config.OPENSEA.NETWORK,
  connectOptions: { transport: ws },
  onError(error) {
    if (error.message === 'Connection disconnected') {
      client.connect();
    }
  },
});

function handler(type, data) {
  console.log(type, data);
}

function listenToCollectionEvents(collection) {
  client.onItemListed(collection, (data) => handler('onItemListed', data));
  client.onItemSold(collection, (data) => handler('onItemSold', data));
  client.onItemTransferred(collection, (data) => handler('onItemTransferred', data));
  client.onItemMetadataUpdated(collection, (data) => handler('onItemMetadataUpdated', data));
  client.onItemCancelled(collection, (data) => handler('onItemCancelled', data));
  client.onItemReceivedOffer(collection, (data) => handler('onItemReceivedOffer', data));
  client.onItemReceivedBid(collection, (data) => handler('onItemReceivedBid', data));
}

listenToCollectionEvents('kitaroworldofficial');
