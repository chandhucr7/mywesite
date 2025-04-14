document.addEventListener("DOMContentLoaded", function () {
    console.log("BTC & XAU Intraday Dashboard Loaded with APIs");

    // Highlight signal boxes for new signals
    const btcSignalBox = document.querySelector("#btc-section .signal-box");
    const xauSignalBox = document.querySelector("#xau-section .signal-box");
    setInterval(() => {
        btcSignalBox.classList.toggle("active");
        xauSignalBox.classList.toggle("active");
    }, 60000);

    // MetalpriceAPI Key for XAU
    const metalPriceApiKeyXAU = "6d92ed9e12c08041d201782551f5b91a";

    // Arrays to store past signals
    let btcSignals = [];
    let xauSignals = [];

    // Function to calculate RSI
    function calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return null;
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            let diff = prices[i] - prices[i - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;
        let rs = avgGain / (avgLoss || 1);
        return 100 - (100 / (1 + rs));
    }

    // Function to detect candlestick patterns
    function detectPattern(candle) {
        const { open, high, low, close } = candle;
        const body = Math.abs(close - open);
        const upperWick = high - Math.max(open, close);
        const lowerWick = Math.min(open, close) - low;
        const totalRange = high - low;

        if (body < totalRange * 0.1 && upperWick > body && lowerWick > body) {
            return { pattern: "Doji", confidence: "80%" };
        } else if (lowerWick > body * 2 && upperWick < body && close > open) {
            return { pattern: "Hammer", confidence: "85%" };
        } else if (body > totalRange * 0.6 && close < open) {
            return { pattern: "Bearish Engulfing", confidence: "75%" };
        } else if (upperWick > body * 2 && lowerWick < body && close < open) {
            return { pattern: "Shooting Star", confidence: "70%" };
        }
        return null;
    }

    // Function to calculate support and resistance
    function calculateSupportResistance(candles) {
        const lows = candles.map(candle => parseFloat(candle.low));
        const highs = candles.map(candle => parseFloat(candle.high));
        const support = Math.min(...lows).toFixed(2);
        const resistance = Math.max(...highs).toFixed(2);
        return { support, resistance };
    }

    // Function to update past signals table
    function updatePastSignalsTable(tableId, signals) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (signals.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8">No past signals yet...</td></tr>`;
            return;
        }
        tbody.innerHTML = signals.slice(-5).reverse().map(signal => `
            <tr>
                <td>${signal.timestamp}</td>
                <td>${signal.signal}</td>
                <td>${signal.price}</td>
                <td>${signal.target}</td>
                <td>${signal.stopLoss}</td>
                <td>${signal.support}</td>
                <td>${signal.resistance}</td>
                <td>${signal.action}</td>
            </tr>
        `).join('');
    }

    // Fetch BTC data from Binance (public API)
    function fetchBTCSignals() {
        fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=15")
            .then(response => response.json())
            .then(data => {
                const prices = data.map(candle => parseFloat(candle[4]));
                const latestCandle = {
                    open: parseFloat(data[data.length - 1][1]),
                    high: parseFloat(data[data.length - 1][2]),
                    low: parseFloat(data[data.length - 1][3]),
                    close: parseFloat(data[data.length - 1][4])
                };
                const timestamp = new Date(data[data.length - 1][0]).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

                // Calculate RSI for signals
                const rsi = calculateRSI(prices);
                let signal = "Hold", action = "Wait", target = "-", stopLoss = "-";
                const { support, resistance } = calculateSupportResistance(data);
                if (rsi && rsi < 30) {
                    signal = "Buy";
                    action = "Enter";
                    target = (latestCandle.close * 1.01).toFixed(2);
                    stopLoss = (latestCandle.close * 0.995).toFixed(2);
                } else if (rsi && rsi > 70) {
                    signal = "Sell";
                    action = "Exit";
                    target = (latestCandle.close * 0.99).toFixed(2);
                    stopLoss = (latestCandle.close * 1.005).toFixed(2);
                }

                // Store signal
                const newSignal = {
                    timestamp,
                    signal,
                    price: latestCandle.close.toFixed(2),
                    target,
                    stopLoss,
                    support,
                    resistance,
                    action
                };
                btcSignals.push(newSignal);

                // Update signals table
                const btcSignalTable = document.querySelector("#btc-signal-table tbody");
                btcSignalTable.innerHTML = `
                    <tr>
                        <td>${timestamp}</td>
                        <td>${signal}</td>
                        <td>${latestCandle.close.toFixed(2)}</td>
                        <td>${target}</td>
                        <td>${stopLoss}</td>
                        <td>${support}</td>
                        <td>${resistance}</td>
                        <td>${action}</td>
                    </tr>
                `;

                // Update past signals table
                updatePastSignalsTable("btc-past-signals-table", btcSignals);

                // Detect patterns
                const pattern = detectPattern(latestCandle);
                const btcPatternTable = document.querySelector("#btc-pattern-table tbody");
                btcPatternTable.innerHTML = pattern ? `
                    <tr>
                        <td>${timestamp}</td>
                        <td>${pattern.pattern}</td>
                        <td>${pattern.confidence}</td>
                    </tr>
                ` : `<tr><td colspan="3">No pattern detected</td></tr>`;
            })
            .catch(error => {
                console.error("Error fetching BTC data:", error);
                document.querySelector("#btc-signal-table tbody").innerHTML = `<tr><td colspan="8">Error loading signals</td></tr>`;
                document.querySelector("#btc-past-signals-table tbody").innerHTML = `<tr><td colspan="8">Error loading past signals</td></tr>`;
                document.querySelector("#btc-pattern-table tbody").innerHTML = `<tr><td colspan="3">Error loading patterns</td></tr>`;
            });
    }

    // Fetch XAU data from MetalpriceAPI
    function fetchXAUSignals() {
        fetch(`https://api.metalpriceapi.com/v1/latest?api_key=${metalPriceApiKeyXAU}&base=USD&currencies=XAU`)
            .then(response => response.json())
            .then(data => {
                if (!data.success || !data.rates) {
                    throw new Error(data.error || "Invalid XAU data from MetalpriceAPI");
                }
                // Simulate 15 candles using latest price
                const rate = 1 / parseFloat(data.rates.XAU); // Convert to USD per ounce
                const candles = Array(15).fill().map((_, i) => ({
                    open: rate * (1 + (Math.random() - 0.5) * 0.01),
                    high: rate * (1 + Math.random() * 0.005),
                    low: rate * (1 - Math.random() * 0.005),
                    close: rate * (1 + (Math.random() - 0.5) * 0.01)
                }));
                const prices = candles.map(candle => candle.close);
                const latestCandle = candles[candles.length - 1];
                const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

                // Calculate RSI for signals
                const rsi = calculateRSI(prices);
                let signal = "Hold", action = "Wait", target = "-", stopLoss = "-", support = "-", resistance = "-";
                const { support: sup, resistance: res } = calculateSupportResistance(candles);
                support = sup;
                resistance = res;
                if (rsi && rsi < 30) {
                    signal = "Buy";
                    action = "Enter";
                    target = (latestCandle.close * 1.01).toFixed(2);
                    stopLoss = (latestCandle.close * 0.995).toFixed(2);
                } else if (rsi && rsi > 70) {
                    signal = "Sell";
                    action = "Exit";
                    target = (latestCandle.close * 0.99).toFixed(2);
                    stopLoss = (latestCandle.close * 1.005).toFixed(2);
                }

                // Store signal
                const newSignal = {
                    timestamp,
                    signal,
                    price: latestCandle.close.toFixed(2),
                    target,
                    stopLoss,
                    support,
                    resistance,
                    action
                };
                xauSignals.push(newSignal);

                // Update signals table
                const xauSignalTable = document.querySelector("#xau-signal-table tbody");
                xauSignalTable.innerHTML = `
                    <tr>
                        <td>${timestamp}</td>
                        <td>${signal}</td>
                        <td>${latestCandle.close.toFixed(2)}</td>
                        <td>${target}</td>
                        <td>${stopLoss}</td>
                        <td>${support}</td>
                        <td>${resistance}</td>
                        <td>${action}</td>
                    </tr>
                `;

                // Update past signals table
                updatePastSignalsTable("xau-past-signals-table", xauSignals);

                // Detect patterns
                const pattern = detectPattern(latestCandle);
                const xauPatternTable = document.querySelector("#xau-pattern-table tbody");
                xauPatternTable.innerHTML = pattern ? `
                    <tr>
                        <td>${timestamp}</td>
                        <td>${pattern.pattern}</td>
                        <td>${pattern.confidence}</td>
                    </tr>
                ` : `<tr><td colspan="3">No pattern detected</td></tr>`;
            })
            .catch(error => {
                console.error("Error fetching XAU data:", error);
                const errorMessage = error.message.includes("limit") 
                    ? "MetalpriceAPI limit reached (100 calls/month). Please wait or get a new key."
                    : `Failed to load XAU data: ${error.message}`;
                const xauSignalTable = document.querySelector("#xau-signal-table tbody");
                xauSignalTable.innerHTML = `<tr><td colspan="8">${errorMessage}</td></tr>`;
                // Show last known signal if available
                if (xauSignals.length > 0) {
                    const lastSignal = xauSignals[xauSignals.length - 1];
                    xauSignalTable.innerHTML = `
                        <tr>
                            <td>${lastSignal.timestamp} (Last Known)</td>
                            <td>${lastSignal.signal}</td>
                            <td>${lastSignal.price}</td>
                            <td>${lastSignal.target}</td>
                            <td>${lastSignal.stopLoss}</td>
                            <td>${lastSignal.support}</td>
                            <td>${lastSignal.resistance}</td>
                            <td>${lastSignal.action}</td>
                        </tr>
                    `;
                }
                document.querySelector("#xau-past-signals-table tbody").innerHTML = `<tr><td colspan="8">Error loading past signals</td></tr>`;
                document.querySelector("#xau-pattern-table tbody").innerHTML = `<tr><td colspan="3">Error loading patterns</td></tr>`;
            });
    }

    // Fetch data initially and every 5 minutes
    fetchBTCSignals();
    fetchXAUSignals();
    setInterval(fetchBTCSignals, 5 * 60 * 1000);
    setInterval(fetchXAUSignals, 5 * 60 * 1000);

    // Fetch XAU news using NewsAPI
    const newsApiKey = "e65e835d2d754ee0b88387af19c0743e";
    const xauNewsFeed = document.getElementById("xau-news-feed");
    
    fetch(`https://newsapi.org/v2/everything?q=gold%20price%20OR%20gold%20trading%20OR%20gold%20India&language=en&sortBy=publishedAt&apiKey=${newsApiKey}`)
        .then(response => response.json())
        .then(data => {
            xauNewsFeed.innerHTML = "";
            const articles = data.articles.slice(0, 5);
            if (articles.length === 0) {
                xauNewsFeed.innerText = "No XAU news found. Check Telegram for updates.";
                return;
            }
            articles.forEach(article => {
                const newsItem = document.createElement("div");
                newsItem.className = "news-article";
                newsItem.innerHTML = `
                    <a href="${article.url}" target="_blank">${article.title}</a>
                    <p>${article.description || "No description available."}</p>
                    <p><small>${new Date(article.publishedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small></p>
                `;
                xauNewsFeed.appendChild(newsItem);
            });
        })
        .catch(error => {
            console.error("Error fetching XAU news:", error);
            xauNewsFeed.innerText = "Failed to load XAU news. Check your API key or try again later.";
        });
});