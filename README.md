# 🤖 R2-Money Automation Bot

A comprehensive automation bot engineered to interact with the R2-Money ecosystem. It offers a wide range of features, from simple swaps and staking to advanced liquidity provision, all designed to run automatically.

<div align="center">
    [![Telegram](https://img.shields.io/badge/Community-Airdrop_ALC-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/airdropalc/2127)
</div>

---

## ✨ Key Features

This bot is packed with features to give you full control over your automated strategy.

* **⚙️ Fully Automated:** Designed for "set-it-and-forget-it" operation.
* **👥 Multi-Wallet Support:** Manage and run tasks for multiple wallets from a single configuration.
* **🌐 Flexible Proxy Management:** Optionally route traffic through proxies to enhance privacy and avoid rate limits.
* **🔧 Customizable Operations:** Fine-tune bot behavior by adjusting amounts and loop counts through simple JSON files.

### 🤖 Supported Operations

The bot can perform a wide variety of on-chain actions:

* **🛒 Buy / Sell:**
    * **Buy:** Automatically purchase **R2USD** using **USDC**.
    * **Sell:** Automatically sell **R2USD** back into **USDC**.
* **🔄 Swaps:**
    * Swap **R2** to **R2USD**.
    * Swap **R2USD** back to **R2**.
* **🔒 Staking:**
    * Stake **wBTC**.
    * Stake **R2USD** (includes a smart fallback method if the primary staking action fails).
* **💧 Liquidity Provision:**
    * Add liquidity to the **R2-USDC** liquidity pool.

---

## 🚀 Installation & Setup

Choose the installation method that works best for you.

### Option 1: Easy Install (One-Click)

This is the fastest way to get started. This command downloads a setup script and runs it for you.
```bash
wget [https://raw.githubusercontent.com/airdropalc/R2-Money-Bot/refs/heads/main/bash.sh](https://raw.githubusercontent.com/airdropalc/R2-Money-Bot/refs/heads/main/bash.sh) -O R2Bot.sh && chmod +x R2Bot.sh && ./R2Bot.sh
```

---

### Option 2: Manual Installation (Full Control)

This method is for users who want to review and edit the configuration files manually before the first run.

**1. Clone the Repository**
```bash
git clone [https://github.com/airdropalc/R2-Money-Bot.git](https://github.com/airdropalc/R2-Money-Bot.git)
cd R2-Money-Bot
```

**2. Install Dependencies**
```bash
npm install
```

**3. Configure the Bot**

You need to edit several files to set up the bot according to your needs.

* **a. Configure Wallets (`.env`)**
    This is the most important step. Add your private keys to the `.env` file as a single, comma-separated list.
    ```bash
    nano .env
    ```
    **Required `.env` format:**
    ```
    PRIVATE_KEY=YOUR_FIRST_PRIVATE_KEY,YOUR_SECOND_PRIVATE_KEY,YOUR_THIRD_PRIVATE_KEY
    ```

* **b. Configure Amounts (`amount.json`) (Optional)**
    Edit this file to change the token amounts used in operations.
    ```bash
    nano amount.json
    ```
    **Example `amount.json`:**
    ```json
    {
      "buy_amount_usdc": "10.5",
      "sell_amount_r2usd": "10.0",
      "swap_amount_r2": "50.0"
    }
    ```

* **c. Configure Loops (`loop.json`) (Optional)**
    Change the number of times the main operation loop will run.
    ```bash
    nano loop.json
    ```
    **Example `loop.json`:**
    ```json
    {
      "loops_to_run": 10
    }
    ```

* **d. Configure Proxies (`proxy.txt`) (Optional)**
    If you want to use proxies, add them here, one per line.
    ```bash
    nano proxy.txt
    ```

**4. Run the Bot**
```bash
node index.js
```

---

## ⚠️ Important Security Disclaimer

**This software is provided for educational purposes only. Use it wisely and at your own risk.**

* **Handle Your Private Keys With Extreme Care:** The `.env` file contains your private keys, which grant **complete and irreversible control** over your funds.
* **NEVER share your private keys** or commit your `.env` file to a public GitHub repository.
* The authors and contributors of this project are **not responsible for any form of financial loss**, account compromise, or other damages. The security of your assets is **your responsibility**.

---
> Inspired by and developed for the [Airdrop ALC](https://t.me/airdropalc) community.

## License

![Version](https://img.shields.io/badge/version-1.1.0-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

---
