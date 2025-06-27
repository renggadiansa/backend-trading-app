import express from 'express';
import fs from 'fs';
import cors from 'cors';
import { getCurrentPrice } from './services/binance.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const CONFIG_PATH = './config.json';
const ORDERS_PATH = './orders.json';

const defaultConfig = {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  plusDIThreshold: 25,
  minusDIThreshold: 20,
  adxMinimum: 20,
  takeProfitPercent: 2,
  stopLossPercent: 1,
  leverage: '10x'
};

if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig));
if (!fs.existsSync(ORDERS_PATH)) fs.writeFileSync(ORDERS_PATH, JSON.stringify([]));

app.get('/config', (req, res) => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH));
  res.json(config);
});

app.post('/config', (req, res) => {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
  res.json({ message: 'Konfigurasi disimpan' });
});

app.post('/webhook', async (req, res) => {
  const signal = req.body;
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH));

  const isBuySignal = signal.plusDI > config.plusDIThreshold &&
    signal.minusDI < config.minusDIThreshold &&
    signal.adx > config.adxMinimum;

  const isSellSignal = signal.plusDI < config.plusDIThreshold &&
    signal.minusDI > config.minusDIThreshold &&
    signal.adx > config.adxMinimum;

  if (!isBuySignal && !isSellSignal) {
    return res.json({ message: 'Sinyal tidak valid, tidak ada aksi.' });
  }

  const action = isBuySignal ? 'BUY' : 'SELL';
  const price = await getCurrentPrice(config.symbol);
  const tpPrice = (action === 'BUY')
    ? price * (1 + config.takeProfitPercent / 100)
    : price * (1 - config.takeProfitPercent / 100);
  const slPrice = (action === 'BUY')
    ? price * (1 - config.stopLossPercent / 100)
    : price * (1 + config.stopLossPercent / 100);

  const order = {
    symbol: config.symbol,
    action,
    price_entry: price.toFixed(2),
    tp_price: tpPrice.toFixed(2),
    sl_price: slPrice.toFixed(2),
    leverage: config.leverage,
    timeframe: config.timeframe,
    timestamp: new Date().toISOString()
  };

  const orders = JSON.parse(fs.readFileSync(ORDERS_PATH));
  orders.push(order);
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));

  res.json({ message: 'Order disimulasikan', order });
});

app.get('/orders', (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ORDERS_PATH));
  res.json(orders);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
