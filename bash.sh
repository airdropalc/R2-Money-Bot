#!/bin/bash
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' 

BOT_DIR="R2-Money-Bot"
NODE_SCRIPT_NAME="index.js"
SCREEN_SESSION_NAME="R2Bot"

initial_setup() {
    echo -e "${CYAN}➤ Starting Initial Setup...${NC}"

    if [ -d "$BOT_DIR" ]; then
        echo -e "${YELLOW}Directory '$BOT_DIR' already exists. Skipping 'git clone'.${NC}"
    else
        echo -e "${CYAN}Cloning repository...${NC}"
        git clone https://github.com/airdropalc/R2-Money-Bot.git
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗ Failed to clone repository. Please check the URL and your connection.${NC}"
            read -n 1 -s -r -p "Press any key to return to the menu..."
            return 1
        fi
    fi

    echo -e "${CYAN}Installing NodeJS dependencies...${NC}"
    (cd "$BOT_DIR" && npm install)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Dependencies installed successfully.${NC}"
    else
        echo -e "${RED}✗ Failed to install dependencies. Please check your npm and internet connection.${NC}"
    fi

    echo ""
    echo -e "${GREEN}✅ Initial setup completed! Please proceed with configuration.${NC}"
    echo ""
    read -n 1 -s -r -p "Press any key to return to the menu..."
}

configure_env() {
    echo -e "${CYAN}➤ Configure Private Keys (.env)${NC}"
    echo -e "${YELLOW}Enter your private keys one by one. Press ENTER on an empty line to finish.${NC}"

    local keys=()
    while true; do
        read -sp "Enter Private Key (will not be displayed): " pk
        echo ""
        if [ -z "$pk" ]; then
            break
        fi
        keys+=("$pk")
    done

    if [ ${#keys[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠ No private keys entered. File not created.${NC}"
    else
        local joined_keys=$(printf ",%s" "${keys[@]}")
        joined_keys=${joined_keys:1}
        echo "PRIVATE_KEY=${joined_keys}" > "$BOT_DIR/.env"
        echo -e "${GREEN}✓ Saved ${#keys[@]} private keys to $BOT_DIR/.env successfully.${NC}"
    fi
    echo ""
    read -n 1 -s -r -p "Press any key to return to the menu..."
}

configure_loop() {
    echo -e "${CYAN}➤ Configure Loop Counts (loop.json)${NC}"
    local file_path="$BOT_DIR/loop.json"

    local buy=10 sell=10 swap=10 stake=1 liquidity=1

    read -p "Change 'buy' count? (default: $buy) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value for buy: " buy; fi

    read -p "Change 'sell' count? (default: $sell) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value for sell: " sell; fi
    
    read -p "Change 'swap' count? (default: $swap) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value for swap: " swap; fi

    read -p "Change 'stake' count? (default: $stake) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value for stake: " stake; fi

    read -p "Change 'liquidity' count? (default: $liquidity) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value for liquidity: " liquidity; fi

    cat > "$file_path" << EOL
{
  "buy": $buy,
  "sell": $sell,
  "swap": $swap,
  "stake": $stake,
  "liquidity": $liquidity
}
EOL
    echo -e "${GREEN}✓ Configuration saved to $file_path successfully.${NC}"
    echo ""
    read -n 1 -s -r -p "Press any key to return to the menu..."
}

configure_amount() {
    echo -e "${CYAN}➤ Configure Transaction Amounts (amount.json)${NC}"
    local file_path="$BOT_DIR/amount.json"

    local buyUsdcToR2usd="10" sellR2usdToUsdc="10" swapR2ToR2usd="10" swapR2usdToR2="10" stakewBtc="0.01" stakeR2USD="1" addLiquidity="10"

    read -p "Change 'buyUsdcToR2usd' amount? (default: $buyUsdcToR2usd) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " buyUsdcToR2usd; fi

    read -p "Change 'sellR2usdToUsdc' amount? (default: $sellR2usdToUsdc) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " sellR2usdToUsdc; fi

    read -p "Change 'swapR2ToR2usd' amount? (default: $swapR2ToR2usd) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " swapR2ToR2usd; fi

    read -p "Change 'swapR2usdToR2' amount? (default: $swapR2usdToR2) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " swapR2usdToR2; fi

    read -p "Change 'stakewBtc' amount? (default: $stakewBtc) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " stakewBtc; fi

    read -p "Change 'stakeR2USD' amount? (default: $stakeR2USD) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " stakeR2USD; fi

    read -p "Change 'addLiquidity' amount? (default: $addLiquidity) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " addLiquidity; fi

    cat > "$file_path" << EOL
{
  "buyUsdcToR2usd": "$buyUsdcToR2usd",
  "sellR2usdToUsdc": "$sellR2usdToUsdc",
  "swapR2ToR2usd": "$swapR2ToR2usd",
  "swapR2usdToR2": "$swapR2usdToR2",
  "stakewBtc": "$stakewBtc",
  "stakeR2USD": "$stakeR2USD",
  "addLiquidity": "$addLiquidity"
}
EOL
    echo -e "${GREEN}✓ Configuration saved to $file_path successfully.${NC}"
    echo ""
    read -n 1 -s -r -p "Press any key to return to the menu..."
}

configure_proxy() {
    echo -e "${CYAN}➤ Configure Proxies (proxy.txt)${NC}"
    echo -e "${YELLOW}Enter your proxies one by one. Press ENTER on an empty line to finish.${NC}"
    echo -e "${YELLOW}Format: http://user:pass@ip:port${NC}"

    > "$BOT_DIR/proxy.txt" 
    local count=0
    while true; do
        read -p "Enter proxy: " proxy_line
        if [ -z "$proxy_line" ]; then
            break
        fi
        echo "$proxy_line" >> "$BOT_DIR/proxy.txt"
        count=$((count + 1))
    done

    if [ "$count" -gt 0 ]; then
        echo -e "${GREEN}✓ Saved $count proxies to $BOT_DIR/proxy.txt successfully.${NC}"
    else
        echo -e "${YELLOW}⚠ No proxies entered. File is empty.${NC}"
    fi
    echo ""
    read -n 1 -s -r -p "Press any key to return to the menu..."
}

run_bot() {
    if [ ! -s "$BOT_DIR/.env" ]; then
        echo -e "${RED}✗ Configuration file .env is missing or empty!${NC}"
    elif [ ! -f "$BOT_DIR/loop.json" ]; then
        echo -e "${RED}✗ Configuration file loop.json is missing!${NC}"
    elif [ ! -f "$BOT_DIR/amount.json" ]; then
        echo -e "${RED}✗ Configuration file amount.json is missing!${NC}"
    else
        echo -e "${CYAN}➤ Starting the bot in a background 'screen' session named '${SCREEN_SESSION_NAME}'...${NC}"
        (cd "$BOT_DIR" && screen -dmS "$SCREEN_SESSION_NAME" node "$NODE_SCRIPT_NAME")
        echo -e "${GREEN}✓ Bot has been started.${NC}"
        echo -e "${YELLOW}IMPORTANT: To view the bot's output, use Option 7 (Check Bot Status).${NC}"
        echo -e "${YELLOW}To detach from the session, press: ${CYAN}CTRL+A${YELLOW} then ${CYAN}D${NC}"
    fi
    echo ""
    read -n 1 -s -r -p "Press any key to return to the menu..."
}

check_status() {
    echo -e "${CYAN}➤ Attaching to screen session '${SCREEN_SESSION_NAME}'...${NC}"
    echo -e "${YELLOW}To detach and return, press: ${CYAN}CTRL+A${YELLOW} then ${CYAN}D${NC}"
    sleep 2
    screen -r "$SCREEN_SESSION_NAME"
    echo -e "\n${GREEN}Returned from screen session.${NC}"
    echo ""
    read -n 1 -s -r -p "Press any key to return to the menu..."
}

# Function to stop the bot
stop_bot() {
    echo -e "${CYAN}➤ Attempting to stop the bot...${NC}"
    if screen -list | grep -q "$SCREEN_SESSION_NAME"; then
        screen -X -S "$SCREEN_SESSION_NAME" quit
        echo -e "${GREEN}✓ Bot session '${SCREEN_SESSION_NAME}' has been stopped.${NC}"
    else
        echo -e "${YELLOW}⚠ Bot session '${SCREEN_SESSION_NAME}' is not currently running.${NC}"
    fi
    echo ""
    read -n 1 -s -r -p "Press any key to return to the menu..."
}

while true; do
    clear
    echo -e "${CYAN}=====================================${NC}"
    echo -e "${CYAN}            R2 MONEY BOT             ${NC}"
    echo -e "${CYAN}=====================================${NC}"
    echo -e "1. ${GREEN}Initial Setup${NC} (Git Clone & NPM Install)"
    echo -e "2. ${GREEN}Configure Private Keys${NC} (.env)"
    echo -e "3. ${GREEN}Configure Loop Counts${NC} (loop.json)"
    echo -e "4. ${GREEN}Configure Amounts${NC} (amount.json)"
    echo -e "5. ${GREEN}Configure Proxies${NC} (proxy.txt)"
    echo -e "6. ${GREEN}Run Bot${NC}"
    echo -e "7. ${YELLOW}Check Bot Status${NC}"
    echo -e "8. ${RED}Stop Bot${NC}"
    echo -e "0. ${RED}Exit${NC}"
    echo -e "${CYAN}------------------------------------${NC}"
    read -p "Enter your choice [0-8]: " choice

    case $choice in
        1) initial_setup ;;
        2) configure_env ;;
        3) configure_loop ;;
        4) configure_amount ;;
        5) configure_proxy ;;
        6) run_bot ;;
        7) check_status ;;
        8) stop_bot ;;
        0) echo "Exiting. Goodbye!"; exit 0 ;;
        *) echo -e "${RED}Invalid option. Please try again.${NC}"; sleep 2 ;;
    esac
done
