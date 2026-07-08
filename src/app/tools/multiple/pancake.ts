/** PancakeSwap 合约地址（BSC 主网） */
import { getAddress, isAddress } from "ethers";

export const PANCAKE_BSC = {
  wbnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  routerV2: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  smartRouterV3: "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4",
  quoterV3: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
} as const;

export const V3_FEE_TIERS = [100, 500, 2500, 10000] as const;

export type DexVersion = "v2" | "v3";

export const routerV2Abi = [
  "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
  "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)",
  "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
];

export const smartRouterV3Abi = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
];

export const quoterV3Abi = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

export const erc20Abi = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address account) view returns (uint256)",
];

export function defaultRouter(version: DexVersion): string {
  return version === "v2" ? PANCAKE_BSC.routerV2 : PANCAKE_BSC.smartRouterV3;
}

/** ethers v6 isAddress 要求 EIP-55 checksum，全小写地址也会被拒 */
export function isValidAddress(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length === 42 && isAddress(trimmed.toLowerCase());
}

/** 转为合法 checksum，避免 Contract / RPC 调用抛 bad address checksum */
export function normalizeAddress(value: string): string {
  return getAddress(value.trim().toLowerCase());
}

export function applySlippage(amountOut: bigint, slippageBps: number): bigint {
  const bps = BigInt(Math.max(0, Math.min(10_000, slippageBps)));
  return (amountOut * (BigInt(10_000) - bps)) / BigInt(10_000);
}

export function swapDeadline(minutes: number): bigint {
  const mins = Math.max(1, Math.min(60, minutes));
  return BigInt(Math.floor(Date.now() / 1000) + mins * 60);
}
