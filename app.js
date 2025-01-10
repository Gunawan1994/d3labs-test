const { Web3 } = require('web3');

const jsonRpcURL = 'https://mainnet.infura.io/v3/917c4f75f17a4e28b78263cddd8f1b46';
const web3 = new Web3(jsonRpcURL);

const abi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  }
];
const contractAddress = '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d';
const contract = new web3.eth.Contract(abi, contractAddress);

const START_BLOCK = 12456117; // epoch
const END_BLOCK = 12486117; // epoch
const BLOCK_STEP = 10000; // 12246112 -> 12256112 -> 12266112
const RATE_LIMIT_DELAY = 1000; // rate limit mainnet/infure daily request

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getHolders() {
  const holders = new Set();
  let fromBlock = START_BLOCK;
  let toBlock = Math.min(fromBlock + BLOCK_STEP, END_BLOCK);

  while (fromBlock <= END_BLOCK) {
    console.log(`${fromBlock} to ${toBlock}`);

    try {
      let events;
      while (true) {
        try {
          events = await contract.getPastEvents('Transfer', {
            fromBlock: fromBlock,
            toBlock: toBlock,
          });
          break;
        } catch (err) {
          if (err.message.includes('query returned more than 10000 results')) {
            toBlock = Math.floor((fromBlock + toBlock) / 2);
          } else if (err.message.includes('Too Many Requests')) {
            await delay(RATE_LIMIT_DELAY);
          } else {
            throw err;
          }
        }
      }
      console.log(events)
      events.forEach(event => {
        holders.add(event.returnValues.from);
        holders.add(event.returnValues.to);
      });

      fromBlock = toBlock + 1;
      toBlock = Math.min(fromBlock + BLOCK_STEP, END_BLOCK);
    } catch (err) {
      console.error(err.message);
      break;
    }
  }

  console.log('holder:', Array.from(holders));

  let total = 0;
  // loop for ebery wallet token to get total balance
  for (const holder of holders) {
    const balanceWei = await web3.eth.getBalance(holder);
    const balanceEther = web3.utils.fromWei(balanceWei, 'ether');
    total += parseFloat(balanceEther);
  }
  console.log(`Total balance: ${total} ETH`);
}

getHolders();




