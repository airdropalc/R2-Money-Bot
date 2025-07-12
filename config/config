const { ethers } = require('ethers');

module.exports = {
  Config: {
    Network: {
      name: 'Sepolia',
      chainId: 11155111,
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      explorer: 'https://sepolia.etherscan.io'
    },

    ContractsAddress: {
      R2: '0xb816bB88f836EA75Ca4071B46FF285f690C43bb7',
      USDC: '0x8bebfcbe5468f146533c182df3dfbf5ff9be00e2',
      R2USD: '0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365',
      sR2USD: '0x006CbF409CA275bA022111dB32BDAE054a97d488',
      wBTC: '0x4f5b54d4af2568cefafa73bb062e5d734b55aa05',
      R2wBTC: '0xDcb5C62EaC28d1eFc7132ad99F2Bd81973041D14'
    },

    Router: {
      stakingAddress: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
      swapAddress: '0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2',
      stakewBtc: '0x23b2615d783E16F14B62EfA125306c7c69B4941A',
      pairAddress: '0xCdfDD7dD24bABDD05A2ff4dfcf06384c5Ad661a9',
      poolAddress: '0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2',
      stakingMethodId: '0x1a5f0f00',
      buyMethodId: '0x095e7a95',
      sellMethodId: '0x3df02124'
    },

    Abi: {
      Erc20: [
        'function approve(address spender, uint256 amount) public returns (bool)',
        'function balanceOf(address account) public view returns (uint256)',
        'function decimals() public view returns (uint8)',
        'function allowance(address owner, address spender) external view returns (uint256)'
      ],
      Swap: [
        'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)'
      ],
      Staking: [
        'function stake(address _candidate, uint256 _amount) external',
        'function getStakedAmount(address _user) public view returns (uint256)'
      ],
      Pool: [
        "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)"
      ],
      Pair: [
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
        'function token0() external view returns (address)',
        'function token1() external view returns (address)'
      ]
    },

    gasSettings: {
      maxFeePerGas: ethers.parseUnits('50', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
      gasLimit: 300000
    }
  }
};
