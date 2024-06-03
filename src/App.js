import React, { useState } from 'react';
import MyRecords from './Stuff';
import yourImage from './metacare.svg'; // replace with your image file path
import { Web3OnboardProvider, init } from '@web3-onboard/react'
import injectedModule from '@web3-onboard/injected-wallets'
import coinbaseModule from '@web3-onboard/coinbase'

const injected = injectedModule();
const coinbase = coinbaseModule();

const wallets = [
  injected,
  coinbase,
]

const chains = [
  {
    id: '0x1',
    token: 'ETH',
    label: 'Ethereum Mainnet',
  },
  {
    id: 11155111,
    token: 'ETH',
    label: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org/'
  },
  {
    id: '0x13881',
    token: 'MATIC',
    label: 'Polygon - Mumbai',
    rpcUrl: 'https://matic-mumbai.chainstacklabs.com'
  },
  {
    id: '0x38',
    token: 'BNB',
    label: 'Binance',
    rpcUrl: 'https://bsc-dataseed.binance.org/'
  },
  {
    id: '0xA',
    token: 'OETH',
    label: 'OP Mainnet',
    rpcUrl: 'https://mainnet.optimism.io'
  },
  {
    id: '0xA4B1',
    token: 'ARB-ETH',
    label: 'Arbitrum',
    rpcUrl: 'https://rpc.ankr.com/arbitrum'
  },
  {
    id: '0xa4ec',
    token: 'ETH',
    label: 'Celo',
    rpcUrl: 'https://1rpc.io/celo'
  },
  {
    id: 666666666,
    token: 'DEGEN',
    label: 'Degen',
    rpcUrl: 'https://rpc.degen.tips'
  }
]

const appMetadata = {
  name: 'Metacare.ai',
  icon: yourImage,
  description: 'AI Medical Assistant',
  recommendedInjectedWallets: [
    { name: 'MetaMask', url: 'https://metamask.io' },
    { name: 'Coinbase', url: 'https://wallet.coinbase.com/' }
  ]
}

const web3Onboard = init({
  wallets,
  chains,
  appMetadata
})

const App = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [messages, setMessages] = useState([]);  
  if (process.env.REACT_APP_ENV === 'Dev') {console.log('Rendering App')}
  return (
    <Web3OnboardProvider web3Onboard={web3Onboard}>
    <Router>
      <Routes>
        <Route path="/my-records" element={isVerified ? <MyRecords/> : <SplashPage setIsVerified={setIsVerified}  /> } />
      </Routes>
    </Router>
    </Web3OnboardProvider>
  );
};
export default App;
