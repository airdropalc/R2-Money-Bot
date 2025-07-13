#!/bin/bash
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' 

BOT_DIR="R2-Money-Bot"
NODE_SCRIPT_NAME="index.js"

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
        read -p "Enter Private Key: " pk
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

    local val_buy=10 val_sell=10 val_swap=10 val_stake=1 val_liquidity=1

    read -p "Change 'buy' count? (default: $val_buy) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then 
        read -p "Enter new value for buy: " new_input
        if [ -n "$new_input" ]; then val_buy=$new_input; fi
    fi

    read -p "Change 'sell' count? (default: $val_sell) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then 
        read -p "Enter new value for sell: " new_input
        if [ -n "$new_input" ]; then val_sell=$new_input; fi
    fi

    read -p "Change 'swap' count? (default: $val_swap) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then 
        read -p "Enter new value for swap: " new_input
        if [ -n "$new_input" ]; then val_swap=$new_input; fi
    fi

    read -p "Change 'stake' count? (default: $val_stake) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then 
        read -p "Enter new value for stake: " new_input
        if [ -n "$new_input" ]; then val_stake=$new_input; fi
    fi
-
    read -p "Change 'liquidity' count? (default: $val_liquidity) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then 
        read -p "Enter new value for liquidity: " new_input
        if [ -n "$new_input" ]; then val_liquidity=$new_input; fi
    fi

    cat > "$file_path" << EOL
{
  "buy": ${val_buy},
  "sell": ${val_sell},
  "swap": ${val_swap},
  "stake": ${val_stake},
  "liquidity": ${val_liquidity}
}
EOL
    echo -e "${GREEN}✓ Configuration saved to $file_path successfully.${NC}"
    echo ""
    read -n 1 -s -r -p "Press any key to return to the menu..."
}

configure_amount() {
    echo -e "${CYAN}➤ Configure Transaction Amounts (amount.json)${NC}"
    local file_path="$BOT_DIR/amount.json"

    local val_buyUsdcToR2usd="100" val_sellR2usdToUsdc="100" val_swapR2ToR2usd="100" 
    local val_swapR2usdToR2="100" val_stakewBtc="0.01" val_stakeR2USD="100" val_addLiquidity="100"

    read -p "Change 'buyUsdcToR2usd' amount? (default: $val_buyUsdcToR2usd) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " new_input && if [ -n "$new_input" ]; then val_buyUsdcToR2usd=$new_input; fi; fi

    read -p "Change 'sellR2usdToUsdc' amount? (default: $val_sellR2usdToUsdc) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " new_input && if [ -n "$new_input" ]; then val_sellR2usdToUsdc=$new_input; fi; fi

    read -p "Change 'swapR2ToR2usd' amount? (default: $val_swapR2ToR2usd) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " new_input && if [ -n "$new_input" ]; then val_swapR2ToR2usd=$new_input; fi; fi

    read -p "Change 'swapR2usdToR2' amount? (default: $val_swapR2usdToR2) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " new_input && if [ -n "$new_input" ]; then val_swapR2usdToR2=$new_input; fi; fi

    read -p "Change 'stakewBtc' amount? (default: $val_stakewBtc) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " new_input && if [ -n "$new_input" ]; then val_stakewBtc=$new_input; fi; fi

    read -p "Change 'stakeR2USD' amount? (default: $val_stakeR2USD) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " new_input && if [ -n "$new_input" ]; then val_stakeR2USD=$new_input; fi; fi

    read -p "Change 'addLiquidity' amount? (default: $val_addLiquidity) [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then read -p "Enter new value: " new_input && if [ -n "$new_input" ]; then val_addLiquidity=$new_input; fi; fi

    cat > "$file_path" << EOL
{
  "buyUsdcToR2usd": "${val_buyUsdcToR2usd}",
  "sellR2usdToUsdc": "${val_sellR2usdToUsdc}",
  "swapR2ToR2usd": "${val_swapR2ToR2usd}",
  "swapR2usdToR2": "${val_swapR2usdToR2}",
  "stakewBtc": "${val_stakewBtc}",
  "stakeR2USD": "${val_stakeR2USD}",
  "addLiquidity": "${val_addLiquidity}"
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
        echo -e "${CYAN}➤ Starting the bot...${NC}"
        echo -e "${YELLOW}The bot will run directly in this terminal.${NC}"
        echo -e "${YELLOW}Press ${RED}CTRL+C${YELLOW} to stop the bot.${NC}"
        sleep 2

        (cd "$BOT_DIR" && node "$NODE_SCRIPT_NAME")
        
        echo -e "\n${GREEN}✓ Bot has been stopped. Returning to the menu.${NC}"
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
    echo -e "0. ${RED}Exit${NC}"
    echo -e "${CYAN}------------------------------------${NC}"
    read -p "Enter your choice [0-6]: " choice

    case $choice in
        1) initial_setup ;;
        2) configure_env ;;
        3) configure_loop ;;
        4) configure_amount ;;
        5) configure_proxy ;;
        6) run_bot ;;
        0) echo "Exiting. Goodbye!"; exit 0 ;;
        *) echo -e "${RED}Invalid option. Please try again.${NC}"; sleep 2 ;;
    esac
done
