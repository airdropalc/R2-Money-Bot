require('dotenv').config();
const { ethers } = require('ethers');
const { Config } = require('./config/config');
const amounts = require('./amount.json');
const log = require('./config/logger');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');

const operationResults = {};

let proxyList = [];
let currentProxyIndex = 0;

let operationLoops = {};
try {
  if (fs.existsSync('./loop.json')) {
    operationLoops = JSON.parse(fs.readFileSync('./loop.json', 'utf-8'));
    log.info('Loaded operation loops configuration from loop.json');
    const requiredFields = ['buy', 'sell', 'swap', 'stake', 'liquidity'];
    const defaults = {
      buy: 2,
      sell: 3,
      swap: 1,
      stake: 2,
      liquidity: 1
    };
    
    requiredFields.forEach(field => {
      if (!(field in operationLoops)) {
        log.warn(`Field '${field}' missing in loop.json, using default value: ${defaults[field]}`);
        operationLoops[field] = defaults[field];
      }
    });
  } else {
    operationLoops = {
      buy: 2,
      sell: 3,
      swap: 1,
      stake: 2,
      liquidity: 1
    };
    log.warn('loop.json not found. Using default loop values');
  }
} catch (error) {
  log.error(`Failed to load loop configuration: ${error.message}`);
  operationLoops = {
    buy: 2,
    sell: 3,
    swap: 1,
    stake: 2,
    liquidity: 1
  };
  log.warn('Using default loop values due to error');
}

function randomDelay(minSeconds = 5, maxSeconds = 15) {
  const delayMs = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
  log.info(`Waiting ${delayMs/1000} seconds before next operation...`);
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

function randomSmallDelay(minMs = 500, maxMs = 3000) {
  const delayMs = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

async function executeWithRetryAndDelay(operationFn, operationName, params, maxAttempts = 3) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    try {
      log.step(`Attempt ${attempts} of ${maxAttempts} for ${operationName}`);
      await randomSmallDelay(); 
      const result = await operationFn(...params);
      return result;
    } catch (error) {
      log.error(`Attempt ${attempts} failed: ${error.message}`);
      if (attempts < maxAttempts) {
        const delayTime = Math.min(attempts * 10, 30); 
        log.info(`Waiting ${delayTime} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayTime * 1000));
      }
    }
  }
  
  throw new Error(`All ${maxAttempts} attempts failed for ${operationName}`);
}

function loadProxies() {
  try {
    if (fs.existsSync('./proxy.txt')) {
      const proxyFile = fs.readFileSync('./proxy.txt', 'utf-8');
      proxyList = proxyFile.split('\n').filter(line => line.trim() !== '');
      log.info(`Loaded ${proxyList.length} proxies from proxy.txt`);
    } else {
      log.warn('proxy.txt not found. Proceeding without proxies');
    }
  } catch (error) {
    log.error(`Failed to load proxies: ${error.message}`);
  }
}

function getNextProxy() {
  if (proxyList.length === 0) return null;
  
  const proxy = proxyList[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxyList.length;
  return proxy;
}

async function createProviderWithProxy(rpcUrl, chainId) {
  try {
    const proxy = getNextProxy();
    
    if (!proxy) {
      log.info('No proxy available, creating direct connection');
      return new ethers.JsonRpcProvider(rpcUrl, chainId);
    }
    
    log.info(`Using proxy: ${proxy}`);
    const agent = new HttpsProxyAgent(`http://${proxy}`);
    
    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
      staticNetwork: true,
      batchStallTime: 1000,
      batchMaxCount: 1,
      agent: agent
    });

    await provider.getBlockNumber();
    log.success('Proxy connection successful');
    return provider;
  } catch (error) {
    log.error(`Failed to connect with proxy: ${error.message}`);
    log.warn('Falling back to direct connection');
    return new ethers.JsonRpcProvider(rpcUrl, chainId);
  }
}

async function initializeWallet(privateKey) {
  try {
    loadProxies(); 
    
    log.step(`Connecting to ${Config.Network.name} network...`);
    const provider = await createProviderWithProxy(
      Config.Network.rpcUrl,
      Config.Network.chainId
    );
    
    const wallet = new ethers.Wallet(privateKey, provider);
    log.wallet(`Wallet initialized: ${wallet.address}`);
    return wallet;
  } catch (error) {
    log.error(`Failed to initialize wallet: ${error.message}`);
    throw error;
  }
}

async function checkBalance(wallet, tokenAddress) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, Config.Abi.Erc20, wallet);
    const balance = await tokenContract.balanceOf(wallet.address);
    const decimals = await tokenContract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    log.error(`Failed to check balance: ${error.message}`);
    return '0';
  }
}

async function approveToken(wallet, tokenAddress, spenderAddress, amount) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, Config.Abi.Erc20, wallet);
    const decimals = await tokenContract.decimals();
    const amountInWei = ethers.parseUnits(amount.toString(), decimals);
    
    const currentAllowance = await tokenContract.allowance(wallet.address, spenderAddress);
    if (currentAllowance >= amountInWei) {
      log.info('Sufficient allowance already exists');
      return true;
    }
    
    log.step(`Approving ${amount} tokens for spending...`);
    const tx = await tokenContract.approve(spenderAddress, amountInWei, { 
      gasLimit: Config.gasSettings.gasLimit 
    });
    
    log.tx(`Transaction sent: ${tx.hash}`);
    log.explorer(`${Config.Network.explorer}/tx/${tx.hash}`);
    
    log.loading('Waiting for approval confirmation...');
    await tx.wait();
    log.success('Approval completed');
    return true;
  } catch (error) {
    log.error(`Failed to approve token: ${error.message}`);
    return false;
  }
}

async function ensureSufficientBalance(wallet, tokenAddress, requiredAmount, operationName) {
  const balance = await checkBalance(wallet, tokenAddress);
  if (parseFloat(balance) < parseFloat(requiredAmount)) {
    log.error(`Insufficient balance for ${operationName}. Required: ${requiredAmount}, available: ${balance}`);
    return false;
  }
  return true;
}

async function buyUsdcToR2usd(wallet, amount, loops = 1) {
  const operationName = 'buy USDC to R2USD';
  for (let i = 0; i < loops; i++) {
    try {
      await executeWithRetryAndDelay(
        async () => {
          log.step(`Starting ${operationName} with ${amount} USDC (Loop ${i+1}/${loops})`);

          const usdcContract = new ethers.Contract(Config.ContractsAddress.USDC, Config.Abi.Erc20, wallet);
          const decimals = await usdcContract.decimals();
          const amountInWei = ethers.parseUnits(amount, decimals);
          
          const hasBalance = await ensureSufficientBalance(
            wallet, 
            Config.ContractsAddress.USDC, 
            amount, 
            operationName
          );
          if (!hasBalance) return false;

          log.step('Approving USDC for swap');
          const approved = await approveToken(
            wallet,
            Config.ContractsAddress.USDC,
            Config.ContractsAddress.R2USD,
            amount
          );
          
          if (!approved) return false;

          const data = ethers.concat([
            Config.Router.buyMethodId,
            ethers.AbiCoder.defaultAbiCoder().encode(
              ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
              [
                wallet.address,
                amountInWei,
                0,
                0,
                0,
                0,
                0
              ]
            )
          ]);

          log.step('Executing buy transaction');
          const tx = await wallet.sendTransaction({
            to: Config.ContractsAddress.R2USD,
            data: data,
            maxFeePerGas: Config.gasSettings.maxFeePerGas,
            maxPriorityFeePerGas: Config.gasSettings.maxPriorityFeePerGas,
            gasLimit: Config.gasSettings.gasLimit
          });

          log.tx(`Transaction hash: ${tx.hash}`);
          log.explorer(`${Config.Network.explorer}/tx/${tx.hash}`);
          
          log.loading('Waiting for transaction confirmation...');
          const receipt = await tx.wait();
          log.success(`Transaction confirmed in block ${receipt.blockNumber}`);

          const newUsdcBalance = await checkBalance(wallet, Config.ContractsAddress.USDC);
          const newR2UsdBalance = await checkBalance(wallet, Config.ContractsAddress.R2USD);
          
          log.info(`New USDC balance: ${newUsdcBalance}`);
          log.info(`New R2USD balance: ${newR2UsdBalance}`);
          
          operationResults[wallet.address] = operationResults[wallet.address] || {};
          operationResults[wallet.address].buy = { success: true };
          return true;
        },
        operationName,
        []
      );
      if (i < loops - 1) await randomDelay();
    } catch (error) {
      log.error(`Loop ${i+1} failed: ${error.message}`);
      operationResults[wallet.address] = operationResults[wallet.address] || {};
      operationResults[wallet.address].buy = { success: false, error: error.message };
      if (i < loops - 1) await randomDelay();
    }
  }
}

async function sellR2usdToUsdc(wallet, amount, loops = 1) {
  const operationName = 'sell R2USD to USDC';
  for (let i = 0; i < loops; i++) {
    try {
      await executeWithRetryAndDelay(
        async () => {
          log.step(`Starting ${operationName} with ${amount} R2USD (Loop ${i+1}/${loops})`);

          const hasBalance = await ensureSufficientBalance(
            wallet, 
            Config.ContractsAddress.R2USD, 
            amount, 
            operationName
          );
          if (!hasBalance) return false;

          log.step('Approving R2USD for swap');
          const approved = await approveToken(
            wallet,
            Config.ContractsAddress.R2USD,
            Config.Router.swapAddress,
            amount
          );
          
          if (!approved) return false;

          const r2usdContract = new ethers.Contract(Config.ContractsAddress.R2USD, Config.Abi.Erc20, wallet);
          const decimals = await r2usdContract.decimals();
          const amountInWei = ethers.parseUnits(amount, decimals);
          const minOutput = amountInWei * 97n / 100n;

          const data = ethers.concat([
            Config.Router.sellMethodId,
            ethers.AbiCoder.defaultAbiCoder().encode(
              ['uint256', 'uint256', 'uint256', 'uint256'],
              [
                0n,            
                1n,             
                amountInWei,     
                minOutput        
              ]
            )
          ]);

          log.step('Executing sell transaction');
          const tx = await wallet.sendTransaction({
            to: Config.Router.swapAddress,
            data: data,
            maxFeePerGas: Config.gasSettings.maxFeePerGas,
            maxPriorityFeePerGas: Config.gasSettings.maxPriorityFeePerGas,
            gasLimit: Config.gasSettings.gasLimit
          });

          log.tx(`Transaction hash: ${tx.hash}`);
          log.explorer(`${Config.Network.explorer}/tx/${tx.hash}`);
          
          log.loading('Waiting for transaction confirmation...');
          const receipt = await tx.wait();
          log.success(`Transaction confirmed in block ${receipt.blockNumber}`);

          const newR2UsdBalance = await checkBalance(wallet, Config.ContractsAddress.R2USD);
          const newUsdcBalance = await checkBalance(wallet, Config.ContractsAddress.USDC);
          
          log.info(`New R2USD balance: ${newR2UsdBalance}`);
          log.info(`New USDC balance: ${newUsdcBalance}`);
          
          operationResults[wallet.address] = operationResults[wallet.address] || {};
          operationResults[wallet.address].sell = { success: true };
          return true;
        },
        operationName,
        []
      );
      if (i < loops - 1) await randomDelay();
    } catch (error) {
      log.error(`Loop ${i+1} failed: ${error.message}`);
      operationResults[wallet.address] = operationResults[wallet.address] || {};
      operationResults[wallet.address].sell = { success: false, error: error.message };
      if (i < loops - 1) await randomDelay();
    }
  }
}

async function swapR2ToR2usd(wallet, amount, loops = 1) {
  const operationName = 'swap R2 to R2USD';
  for (let i = 0; i < loops; i++) {
    try {
      await executeWithRetryAndDelay(
        async () => {
          log.step(`Starting ${operationName} with ${amount} R2 (Loop ${i+1}/${loops})`);

          const hasBalance = await ensureSufficientBalance(
            wallet, 
            Config.ContractsAddress.R2, 
            amount, 
            operationName
          );
          if (!hasBalance) return false;

          const r2Token = new ethers.Contract(Config.ContractsAddress.R2, Config.Abi.Erc20, wallet);
          const router = new ethers.Contract(Config.Router.stakingAddress, Config.Abi.Swap, wallet);

          const r2Decimals = await r2Token.decimals();
          const amountInWei = ethers.parseUnits(amount, r2Decimals); 
          const amountOutMin = ethers.parseUnits('0', 6);
          const path = [Config.ContractsAddress.R2, Config.ContractsAddress.R2USD];
          const deadline = Math.floor(Date.now() / 1000) + 1200; 

          log.step('Approving R2 for swap');
          const approved = await approveToken(
            wallet,
            Config.ContractsAddress.R2,
            Config.Router.stakingAddress,
            amount
          );
          
          if (!approved) return false;

          log.step('Executing swap R2 -> R2USD');
          const tx = await router.swapExactTokensForTokens(
            amountInWei,
            amountOutMin,
            path,
            wallet.address,
            deadline,
            { 
              maxFeePerGas: Config.gasSettings.maxFeePerGas,
              maxPriorityFeePerGas: Config.gasSettings.maxPriorityFeePerGas,
              gasLimit: Config.gasSettings.gasLimit
            }
          );

          log.tx(`Transaction hash: ${tx.hash}`);
          log.explorer(`${Config.Network.explorer}/tx/${tx.hash}`);
          
          log.loading('Waiting for transaction confirmation...');
          const receipt = await tx.wait();
          log.success(`Transaction confirmed in block ${receipt.blockNumber}`);
          
          const newR2Balance = await checkBalance(wallet, Config.ContractsAddress.R2);
          const newR2UsdBalance = await checkBalance(wallet, Config.ContractsAddress.R2USD);
          
          log.info(`New R2 balance: ${newR2Balance}`);
          log.info(`New R2USD balance: ${newR2UsdBalance}`);
          
          operationResults[wallet.address] = operationResults[wallet.address] || {};
          operationResults[wallet.address].swapToR2usd = { success: true };
          return true;
        },
        operationName,
        []
      );
      if (i < loops - 1) await randomDelay();
    } catch (error) {
      log.error(`Loop ${i+1} failed: ${error.message}`);
      operationResults[wallet.address] = operationResults[wallet.address] || {};
      operationResults[wallet.address].swapToR2usd = { success: false, error: error.message };
      if (i < loops - 1) await randomDelay();
    }
  }
}

async function swapR2usdToR2(wallet, amount, loops = 1) {
  const operationName = 'swap R2USD to R2';
  for (let i = 0; i < loops; i++) {
    try {
      await executeWithRetryAndDelay(
        async () => {
          log.step(`Starting ${operationName} with ${amount} R2USD (Loop ${i+1}/${loops})`);
          
          const hasBalance = await ensureSufficientBalance(
            wallet, 
            Config.ContractsAddress.R2USD, 
            amount, 
            operationName
          );
          if (!hasBalance) return false;

          const r2usdToken = new ethers.Contract(Config.ContractsAddress.R2USD, Config.Abi.Erc20, wallet);
          const router = new ethers.Contract(Config.Router.stakingAddress, Config.Abi.Swap, wallet);

          const r2usdDecimals = await r2usdToken.decimals();
          const amountInWei = ethers.parseUnits(amount, r2usdDecimals); 
          const amountOutMin = ethers.parseUnits('0', 18);
          const path = [Config.ContractsAddress.R2USD, Config.ContractsAddress.R2];
          const deadline = Math.floor(Date.now() / 1000) + 1200; 

          log.step('Approving R2USD for swap');
          const approved = await approveToken(
            wallet,
            Config.ContractsAddress.R2USD,
            Config.Router.stakingAddress,
            amount
          );
          
          if (!approved) return false;

          log.step('Executing swap R2USD -> R2');
          const tx = await router.swapExactTokensForTokens(
            amountInWei,
            amountOutMin,
            path,
            wallet.address,
            deadline,
            { 
              maxFeePerGas: Config.gasSettings.maxFeePerGas,
              maxPriorityFeePerGas: Config.gasSettings.maxPriorityFeePerGas,
              gasLimit: Config.gasSettings.gasLimit
            }
          );

          log.tx(`Transaction hash: ${tx.hash}`);
          log.explorer(`${Config.Network.explorer}/tx/${tx.hash}`);
          
          log.loading('Waiting for transaction confirmation...');
          const receipt = await tx.wait();
          log.success(`Transaction confirmed in block ${receipt.blockNumber}`);
          
          const newR2UsdBalance = await checkBalance(wallet, Config.ContractsAddress.R2USD);
          const newR2Balance = await checkBalance(wallet, Config.ContractsAddress.R2);
          
          log.info(`New R2USD balance: ${newR2UsdBalance}`);
          log.info(`New R2 balance: ${newR2Balance}`);
          
          operationResults[wallet.address] = operationResults[wallet.address] || {};
          operationResults[wallet.address].swapToR2 = { success: true };
          return true;
        },
        operationName,
        []
      );
      if (i < loops - 1) await randomDelay();
    } catch (error) {
      log.error(`Loop ${i+1} failed: ${error.message}`);
      operationResults[wallet.address] = operationResults[wallet.address] || {};
      operationResults[wallet.address].swapToR2 = { success: false, error: error.message };
      if (i < loops - 1) await randomDelay();
    }
  }
}

async function stakewBtc(wallet, amount, loops = 1) {
  const operationName = 'stake wBTC';
  for (let i = 0; i < loops; i++) {
    try {
      await executeWithRetryAndDelay(
        async () => {
          log.step(`Starting ${operationName} with ${amount} wBTC (Loop ${i+1}/${loops})`);

          const hasBalance = await ensureSufficientBalance(
            wallet, 
            Config.ContractsAddress.wBTC, 
            amount, 
            operationName
          );
          if (!hasBalance) return false;

          const wbtcToken = new ethers.Contract(Config.ContractsAddress.wBTC, Config.Abi.Erc20, wallet);
          const stakingContract = new ethers.Contract(Config.Router.stakewBtc, Config.Abi.Staking, wallet);
          
          const decimals = await wbtcToken.decimals();
          const amountInWei = ethers.parseUnits(amount, decimals);

          log.step('Approving wBTC for staking');
          const approved = await approveToken(
            wallet,
            Config.ContractsAddress.wBTC,
            Config.Router.stakewBtc,
            amount
          );
          
          if (!approved) return false;

          log.step('Executing wBTC staking');
          const tx = await stakingContract.stake(
            Config.ContractsAddress.wBTC,
            amountInWei,
            {
              maxFeePerGas: Config.gasSettings.maxFeePerGas,
              maxPriorityFeePerGas: Config.gasSettings.maxPriorityFeePerGas,
              gasLimit: Config.gasSettings.gasLimit
            }
          );

          log.tx(`Transaction hash: ${tx.hash}`);
          log.explorer(`${Config.Network.explorer}/tx/${tx.hash}`);
          
          log.loading('Waiting for transaction confirmation...');
          const receipt = await tx.wait();
          log.success(`Transaction confirmed in block ${receipt.blockNumber}`);

          const newWbtcBalance = await checkBalance(wallet, Config.ContractsAddress.wBTC);
          const stakedAmount = await stakingContract.getStakedAmount(wallet.address);
          
          log.info(`New wBTC balance: ${newWbtcBalance}`);
          log.info(`Staked wBTC amount: ${ethers.formatUnits(stakedAmount, decimals)}`);
          
          operationResults[wallet.address] = operationResults[wallet.address] || {};
          operationResults[wallet.address].stakewBtc = { success: true };
          return true;
        },
        operationName,
        []
      );
      if (i < loops - 1) await randomDelay();
    } catch (error) {
      log.error(`Loop ${i+1} failed: ${error.message}`);
      operationResults[wallet.address] = operationResults[wallet.address] || {};
      operationResults[wallet.address].stakewBtc = { success: false, error: error.message };
      if (i < loops - 1) await randomDelay();
    }
  }
}

async function stakeR2USD(wallet, amount, loops = 1) {
  const operationName = 'stake R2USD';
  for (let i = 0; i < loops; i++) {
    try {
      await executeWithRetryAndDelay(
        async () => {
          log.step(`Starting ${operationName} with ${amount} R2USD (Loop ${i+1}/${loops})`);
          const hasBalance = await ensureSufficientBalance(
            wallet, 
            Config.ContractsAddress.R2USD, 
            amount, 
            operationName
          );
          if (!hasBalance) return false;

          const r2usdContract = new ethers.Contract(Config.ContractsAddress.R2USD, Config.Abi.Erc20, wallet);
          const decimals = await r2usdContract.decimals();
          const amountInWei = ethers.parseUnits(amount.toString(), decimals);
          
          const currentAllowance = await r2usdContract.allowance(
            wallet.address, 
            Config.ContractsAddress.sR2USD
          );
          
          if (currentAllowance < amountInWei) {
            const approved = await approveToken(
              wallet,
              Config.ContractsAddress.R2USD,
              Config.ContractsAddress.sR2USD,
              amount
            );
            if (!approved) return false;
          }

          log.step('Attempting staking with method ID...');
          const data = Config.Router.stakingMethodId + 
                     BigInt(amountInWei).toString(16).padStart(64, '0') + 
                     '0'.repeat(576);
          
          const tx = {
            to: Config.ContractsAddress.sR2USD,
            data: data,
            maxFeePerGas: Config.gasSettings.maxFeePerGas,
            maxPriorityFeePerGas: Config.gasSettings.maxPriorityFeePerGas,
            gasLimit: Config.gasSettings.gasLimit
          };
          
          try {
            log.step(`Initiating staking: ${amount} R2USD to sR2USD`);
            const signedTx = await wallet.sendTransaction(tx);
            log.tx(`Transaction sent: ${signedTx.hash}`);
            log.explorer(`${Config.Network.explorer}/tx/${signedTx.hash}`);
            
            log.loading('Waiting for staking confirmation...');
            const receipt = await signedTx.wait();
            
            if (receipt.status === 0) {
              throw new Error('Transaction reverted');
            }
            
            log.success('Staking successful with method ID');
          } catch (error) {
            log.warn(`Failed with method ID: ${error.message}`);
            log.step('Attempting staking with ABI method...');
            const stakeContract = new ethers.Contract(
              Config.ContractsAddress.sR2USD, 
              Config.Abi.Staking, 
              wallet
            );
            
            const tx = await stakeContract.stake(
              Config.ContractsAddress.R2USD,
              amountInWei,
              {
                maxFeePerGas: Config.gasSettings.maxFeePerGas,
                maxPriorityFeePerGas: Config.gasSettings.maxPriorityFeePerGas,
                gasLimit: Config.gasSettings.gasLimit
              }
            );
            
            log.tx(`Fallback transaction sent: ${tx.hash}`);
            log.explorer(`${Config.Network.explorer}/tx/${tx.hash}`);
            
            log.loading('Waiting for transaction confirmation...');
            const receipt = await tx.wait();
            if (receipt.status === 0) {
              throw new Error('Fallback transaction reverted');
            }
            
            log.success('Staking successful with ABI method');
          }
          
          const newR2USDBalance = await checkBalance(wallet, Config.ContractsAddress.R2USD);
          const newSR2USDBalance = await checkBalance(wallet, Config.ContractsAddress.sR2USD);
          
          log.info(`New R2USD balance: ${newR2USDBalance}`);
          log.info(`New sR2USD balance: ${newSR2USDBalance}`);
          
          operationResults[wallet.address] = operationResults[wallet.address] || {};
          operationResults[wallet.address].stakeR2USD = { success: true };
          return true;
        },
        operationName,
        []
      );
      if (i < loops - 1) await randomDelay();
    } catch (error) {
      log.error(`Loop ${i+1} failed: ${error.message}`);
      operationResults[wallet.address] = operationResults[wallet.address] || {};
      operationResults[wallet.address].stakeR2USD = { success: false, error: error.message };
      if (i < loops - 1) await randomDelay();
    }
  }
}

async function addLiquidity(wallet, amountTokenA, loops = 1) {
  const operationName = 'add liquidity to R2-USDC pool';
  for (let i = 0; i < loops; i++) {
    try {
      await executeWithRetryAndDelay(
        async () => {
          log.step(`Starting ${operationName} with ${amountTokenA} R2 (Loop ${i+1}/${loops})`);
          const tokenA = Config.ContractsAddress.R2;
          const tokenB = Config.ContractsAddress.USDC;
          
          const tokenAContract = new ethers.Contract(tokenA, Config.Abi.Erc20, wallet.provider);
          const tokenBContract = new ethers.Contract(tokenB, Config.Abi.Erc20, wallet.provider);
          const pairContract = new ethers.Contract(Config.Router.pairAddress, Config.Abi.Pair, wallet.provider);
          
          const [tokenADecimals, tokenBDecimals] = await Promise.all([
            tokenAContract.decimals(),
            tokenBContract.decimals()
          ]);
          
          const [reserve0, reserve1] = await pairContract.getReserves();
          const token0 = await pairContract.token0();
          
          const isTokenAToken0 = token0.toLowerCase() === tokenA.toLowerCase();
          const tokenAReserve = isTokenAToken0 ? reserve0 : reserve1;
          const tokenBReserve = isTokenAToken0 ? reserve1 : reserve0;
          
          const tokenAReserveFormatted = ethers.formatUnits(tokenAReserve, tokenADecimals);
          const tokenBReserveFormatted = ethers.formatUnits(tokenBReserve, tokenBDecimals);
          
          const ratio = Number(tokenBReserveFormatted) / Number(tokenAReserveFormatted);
          
          log.info("Current Pool Status:");
          log.info(`- R2 Reserve: ${tokenAReserveFormatted}`);
          log.info(`- USDC Reserve: ${tokenBReserveFormatted}`);
          log.info(`- Current Ratio: 1 R2 = ${ratio.toFixed(6)} USDC`);
          
          const amountADesired = ethers.parseUnits(amountTokenA, tokenADecimals);
          const amountBDesired = ethers.parseUnits((ratio * Number(amountTokenA)).toFixed(6), tokenBDecimals);
          const amountAMin = ethers.parseUnits((Number(amountTokenA) * 0.99).toFixed(6), tokenADecimals);
          const amountBMin = ethers.parseUnits((ratio * Number(amountTokenA) * 0.99).toFixed(6), tokenBDecimals);
          const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
          
          const balanceA = await tokenAContract.balanceOf(wallet.address);
          const balanceB = await tokenBContract.balanceOf(wallet.address);
          
          if (balanceA < amountADesired) {
            throw new Error(`Insufficient R2 balance. Required: ${amountTokenA}, available: ${ethers.formatUnits(balanceA, tokenADecimals)}`);
          }
          
          if (balanceB < amountBDesired) {
            throw new Error(`Insufficient USDC balance. Required: ${(ratio * Number(amountTokenA)).toFixed(6)}, available: ${ethers.formatUnits(balanceB, tokenBDecimals)}`);
          }
          
          log.step('Approving R2 for liquidity');
          const approvedA = await approveToken(
            wallet,
            tokenA,
            Config.Router.stakingAddress,
            amountTokenA
          );
          
          if (!approvedA) return false;
          
          log.step('Approving USDC for liquidity');
          const approvedB = await approveToken(
            wallet,
            tokenB,
            Config.Router.stakingAddress,
            (ratio * Number(amountTokenA)).toFixed(6)
          );
          
          if (!approvedB) return false;
          
          const router = new ethers.Contract(Config.Router.stakingAddress, Config.Abi.Pool, wallet);
          
          log.step('Adding liquidity to pool');
          const tx = await router.addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            wallet.address,
            deadline,
            {
              maxFeePerGas: Config.gasSettings.maxFeePerGas,
              maxPriorityFeePerGas: Config.gasSettings.maxPriorityFeePerGas,
              gasLimit: Config.gasSettings.gasLimit
            }
          );
          
          log.tx(`Transaction hash: ${tx.hash}`);
          log.explorer(`${Config.Network.explorer}/tx/${tx.hash}`);
          
          log.loading('Waiting for transaction confirmation...');
          const receipt = await tx.wait();
          log.success(`Transaction confirmed in block ${receipt.blockNumber}`);
          
          const event = receipt.logs.find(log => 
            log.address.toLowerCase() === Config.Router.stakingAddress.toLowerCase()
          );
          
          if (event) {
            const parsedLog = router.interface.parseLog(event);
            log.info(`Liquidity added:`);
            log.info(`- R2 added: ${ethers.formatUnits(parsedLog.args.amountA, tokenADecimals)}`);
            log.info(`- USDC added: ${ethers.formatUnits(parsedLog.args.amountB, tokenBDecimals)}`);
            log.info(`- LP Tokens received: ${ethers.formatUnits(parsedLog.args.liquidity, 18)}`);
          }
          
          operationResults[wallet.address] = operationResults[wallet.address] || {};
          operationResults[wallet.address].addLiquidity = { success: true };
          return true;
        },
        operationName,
        []
      );
      if (i < loops - 1) await randomDelay();
    } catch (error) {
      log.error(`Loop ${i+1} failed: ${error.message}`);
      operationResults[wallet.address] = operationResults[wallet.address] || {};
      operationResults[wallet.address].addLiquidity = { success: false, error: error.message };
      if (i < loops - 1) await randomDelay();
    }
  }
}

function displaySummary() {
  log.info('\n=== Operation Summary ===');
  
  for (const [address, results] of Object.entries(operationResults)) {
    log.info(`\nWallet: ${address}`);
    log.info(`buy            | ${results.buy?.success ? '✅ Success' : '❌ Failed' + (results.buy?.error ? ` (${results.buy.error})` : '')}`);
    log.info(`sell           | ${results.sell?.success ? '✅ Success' : '❌ Failed' + (results.sell?.error ? ` (${results.sell.error})` : '')}`);
    log.info(`swapToR2usd    | ${results.swapToR2usd?.success ? '✅ Success' : '❌ Failed' + (results.swapToR2usd?.error ? ` (${results.swapToR2usd.error})` : '')}`);
    log.info(`swapToR2       | ${results.swapToR2?.success ? '✅ Success' : '❌ Failed' + (results.swapToR2?.error ? ` (${results.swapToR2.error})` : '')}`);
    log.info(`stakewBtc      | ${results.stakewBtc?.success ? '✅ Success' : '❌ Failed' + (results.stakewBtc?.error ? ` (${results.stakewBtc.error})` : '')}`);
    log.info(`stakeR2USD     | ${results.stakeR2USD?.success ? '✅ Success' : '❌ Failed' + (results.stakeR2USD?.error ? ` (${results.stakeR2USD.error})` : '')}`);
    log.info(`addLiquidity   | ${results.addLiquidity?.success ? '✅ Success' : '❌ Failed' + (results.addLiquidity?.error ? ` (${results.addLiquidity.error})` : '')}`);
  }
}

async function runDailyOperations() {
  try {
    const privateKeys = process.env.PRIVATE_KEY?.split(',').map(key => key.trim()).filter(key => key) || [];
    
    if (privateKeys.length === 0) {
      log.error('Please set PRIVATE_KEY in your .env file with one or more private keys (comma separated)');
      process.exit(1);
    }
    
    log.info(`Found ${privateKeys.length} private keys to process`);
    
    for (const [index, privateKey] of privateKeys.entries()) {
      try {
        log.info(`\n=== Processing wallet ${index + 1} of ${privateKeys.length} ===`);
        
        const wallet = await initializeWallet(privateKey);
        
        if (amounts.buyUsdcToR2usd && parseFloat(amounts.buyUsdcToR2usd) > 0) {
          await buyUsdcToR2usd(wallet, amounts.buyUsdcToR2usd, operationLoops.buy);
        }
        
        if (amounts.sellR2usdToUsdc && parseFloat(amounts.sellR2usdToUsdc) > 0) {
          await sellR2usdToUsdc(wallet, amounts.sellR2usdToUsdc, operationLoops.sell);
        }
        
        if (amounts.swapR2ToR2usd && parseFloat(amounts.swapR2ToR2usd) > 0) {
          await swapR2ToR2usd(wallet, amounts.swapR2ToR2usd, operationLoops.swap);
        }
        
        if (amounts.swapR2usdToR2 && parseFloat(amounts.swapR2usdToR2) > 0) {
          await swapR2usdToR2(wallet, amounts.swapR2usdToR2, operationLoops.swap);
        }
        
        if (amounts.stakewBtc && parseFloat(amounts.stakewBtc) > 0) {
          await stakewBtc(wallet, amounts.stakewBtc, operationLoops.stake);
        }
        
        if (amounts.stakeR2USD && parseFloat(amounts.stakeR2USD) > 0) {
          await stakeR2USD(wallet, amounts.stakeR2USD, operationLoops.stake);
        }
        
        if (amounts.addLiquidity && parseFloat(amounts.addLiquidity) > 0) {
          await addLiquidity(wallet, amounts.addLiquidity, operationLoops.liquidity);
        }
        
        displaySummary();
        
        if (index < privateKeys.length - 1) {
          await randomDelay(30, 60);
        }
        
      } catch (error) {
        log.error(`Error processing wallet ${index + 1}: ${error.message}`);
      }
    }
    
  } catch (error) {
    log.error(`Fatal error in daily operations: ${error.message}`);
    displaySummary();
  }
}

async function main() {
  try {
    log.info('Starting daily operations scheduler...');
    
    await runDailyOperations();
    
    const HOURS_24 = 24 * 60 * 60 * 1000;
    
    const scheduleNextRun = () => {
      const now = new Date();
      const nextRun = new Date(now.getTime() + HOURS_24);
      log.info(`Next run scheduled for: ${nextRun.toLocaleString()}`);
      
      setTimeout(async () => {
        await runDailyOperations();
        scheduleNextRun(); 
      }, HOURS_24);
    };
    
    scheduleNextRun();
    
    process.on('SIGINT', () => {
      log.info('Shutting down scheduler...');
      process.exit(0);
    });
    
    log.info('Scheduler is running. Press Ctrl+C to exit.');
    
  } catch (error) {
    log.error(`Fatal error in scheduler: ${error.message}`);
    process.exit(1);
  }
}

main();
