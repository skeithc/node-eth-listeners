# PoCs for Ethereum Event Listeners (Node.js)
## Setup
Create a .env file containing the ff. and fill up as needed:
```
ETHEREUM_URL=wss://mainnet.infura.io/ws/v3/<put your infura project key here>
ETHEREUM_CHAIN_ID=mainnet
OPENSEA_API_KEY=<put your api key here>
OPENSEA_NETWORK=mainnet
```

## Usage
Check out and modify the code as desired and run one of the scripts directly using `node name-of-script.mjs`

## Notes
`helpers/provider.js` should be the same as a normal ethers provider but with workarounds to make the websocket connection persist and autoreconnect since the default implementation disconnects and dies time by time.
