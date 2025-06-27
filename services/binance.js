import axios from 'axios';

export async function getCurrentPrice(symbol) {
  const res = await axios.get(`https://testnet.binancefuture.com/fapi/v1/ticker/price?symbol=${symbol}`);
  return parseFloat(res.data.price);
}
