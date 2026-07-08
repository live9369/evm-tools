import {
  Contract,
  JsonRpcProvider,
  NonceManager,
  Wallet,
  formatUnits,
  parseUnits,
  type Signer,
} from "ethers";
import { buildTxRequest } from "@/app/tools/onchain/buildTxRequest";
import {
  applyFastFeesToTx,
  resolveFastTxFees,
} from "@/app/tools/onchain/fastTxFees";
import {
  PANCAKE_BSC,
  applySlippage,
  defaultRouter,
  erc20Abi,
  isValidAddress,
  normalizeAddress,
  quoterV3Abi,
  routerV2Abi,
  smartRouterV3Abi,
  swapDeadline,
  type DexVersion,
} from "./pancake";

export type AmountMode = "fixed" | "percent";

export type SwapForm = {
  rpcUrl: string;
  version: DexVersion;
  routerAddress: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountMode: AmountMode;
  amountIn: string;
  amountPercent: string;
  slippagePercent: string;
  deadlineMinutes: string;
  nativeIn: boolean;
  nativeOut: boolean;
  privateKeysText: string;
};

export type WalletSwapStatus = {
  address: string;
  status: "pending" | "approving" | "swapping" | "success" | "error" | "skipped";
  message: string;
  approveTxHash?: string;
  swapTxHash?: string;
};

export type BatchSwapResult = {
  wallets: WalletSwapStatus[];
};

export type BatchSwapProgress = (wallets: WalletSwapStatus[]) => void;

export type WalletWarmupStatus = {
  address: string;
  status: "pending" | "checking" | "approving" | "ready" | "error" | "skipped";
  message: string;
  allowanceRaw?: string;
  approvedAmountRaw?: string;
  approveTxHash?: string;
};

export type WarmupResult = {
  configKey: string;
  wallets: WalletWarmupStatus[];
};

export type WarmupProgress = (wallets: WalletWarmupStatus[]) => void;

type AmountConfig =
  | { mode: "fixed"; amountIn: bigint }
  | { mode: "percent"; percentBps: number };

type SwapPrepared = {
  provider: JsonRpcProvider;
  routerAddress: string;
  version: DexVersion;
  form: SwapForm;
  deadline: bigint;
  path: string[];
  tokenInAddr: string;
  tokenOutAddr: string;
  amountConfig: AmountConfig;
  decimals: number;
  slippageBps: number;
  sharedAmountOutMin?: bigint;
  warmup?: WarmupResult;
  signerPool: Map<string, NonceManager>;
};

/** 原生币输入时预留 gas，避免百分比卖光 BNB */
const NATIVE_GAS_RESERVE = parseUnits("0.005", 18);

function tryParsePrivateKeyArray(text: string): string[] | null {
  const attempts = [text, text.replace(/,\s*]/g, "]")];
  for (const candidate of attempts) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (!Array.isArray(parsed)) return null;
      const keys = parsed
        .map((item) => String(item).trim())
        .filter((key) => key.length > 0);
      return keys.length > 0 ? keys : null;
    } catch {
      continue;
    }
  }
  return null;
}

export function parsePrivateKeys(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    return tryParsePrivateKeyArray(trimmed) ?? [];
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** 按地址去重，避免并行任务对同一 nonce 竞争 */
export function uniquePrivateKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const pk of keys) {
    const addr = new Wallet(pk).address.toLowerCase();
    if (seen.has(addr)) continue;
    seen.add(addr);
    unique.push(pk);
  }
  return unique;
}

function buildSignerPool(
  privateKeys: string[],
  provider: JsonRpcProvider
): Map<string, NonceManager> {
  const pool = new Map<string, NonceManager>();
  for (const pk of privateKeys) {
    const wallet = new Wallet(pk, provider);
    pool.set(wallet.address.toLowerCase(), new NonceManager(wallet));
  }
  return pool;
}

function getSigner(
  privateKey: string,
  pool: Map<string, NonceManager>
): NonceManager {
  const addr = new Wallet(privateKey).address.toLowerCase();
  const signer = pool.get(addr);
  if (!signer) {
    throw new Error(`未找到地址 ${addr} 的 signer`);
  }
  return signer;
}

export type SwapFormConfig = Omit<SwapForm, "privateKeysText"> & {
  privateKeys: string[];
};

export function swapFormToConfig(form: SwapForm): SwapFormConfig {
  const { privateKeysText: _privateKeysText, ...rest } = form;
  return {
    ...rest,
    privateKeys: parsePrivateKeys(form.privateKeysText),
  };
}

export function swapFormToJson(form: SwapForm): string {
  return JSON.stringify(swapFormToConfig(form), null, 2);
}

function parsePercentBps(percent: string): number {
  const value = Number(percent.trim());
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    throw new Error("百分比需在 0–100 之间");
  }
  return Math.round(value * 100);
}

function parseAmountConfig(form: SwapForm, decimals: number): AmountConfig {
  if (form.amountMode === "fixed") {
    return {
      mode: "fixed",
      amountIn: parseUnits(form.amountIn.trim(), decimals),
    };
  }
  return { mode: "percent", percentBps: parsePercentBps(form.amountPercent) };
}

async function getInputBalance(
  provider: JsonRpcProvider,
  walletAddress: string,
  tokenInAddr: string,
  nativeIn: boolean
): Promise<bigint> {
  if (nativeIn) return provider.getBalance(walletAddress);
  const token = new Contract(tokenInAddr, erc20Abi, provider);
  return token.balanceOf(walletAddress);
}

function amountInFromBalance(
  balance: bigint,
  config: AmountConfig,
  nativeIn: boolean
): bigint {
  if (config.mode === "fixed") return config.amountIn;

  const spendable =
    nativeIn && balance > NATIVE_GAS_RESERVE
      ? balance - NATIVE_GAS_RESERVE
      : balance;
  if (spendable <= BigInt(0)) return BigInt(0);

  return (spendable * BigInt(config.percentBps)) / BigInt(10000);
}

async function quoteAmountOutMin(
  prepared: SwapPrepared,
  amountIn: bigint
): Promise<bigint> {
  const { provider, routerAddress, version, form, path, tokenInAddr, tokenOutAddr, slippageBps } =
    prepared;

  let quoted: bigint;
  if (version === "v2") {
    quoted = await quoteV2(provider, routerAddress, amountIn, path);
  } else {
    quoted = await quoteV3(
      provider,
      tokenInAddr,
      tokenOutAddr,
      form.fee,
      amountIn
    );
  }
  return applySlippage(quoted, slippageBps);
}

function parseSlippageBps(percent: string): number {
  const value = Number(percent.trim() || "0.5");
  if (!Number.isFinite(value) || value < 0 || value > 50) {
    throw new Error("滑点需在 0–50% 之间");
  }
  return Math.round(value * 100);
}

function resolvePath(
  tokenIn: string,
  tokenOut: string,
  nativeIn: boolean,
  nativeOut: boolean
): string[] {
  const wbnb = PANCAKE_BSC.wbnb;
  const inAddr = nativeIn ? wbnb : normalizeAddress(tokenIn);
  const outAddr = nativeOut ? wbnb : normalizeAddress(tokenOut);
  if (inAddr.toLowerCase() === outAddr.toLowerCase()) {
    throw new Error("输入与输出代币不能相同");
  }
  return [inAddr, outAddr];
}

async function getTokenDecimals(
  provider: JsonRpcProvider,
  address: string
): Promise<number> {
  const token = new Contract(address, erc20Abi, provider);
  return Number(await token.decimals());
}

async function quoteV2(
  provider: JsonRpcProvider,
  routerAddress: string,
  amountIn: bigint,
  path: string[]
): Promise<bigint> {
  const router = new Contract(routerAddress, routerV2Abi, provider);
  const amounts: bigint[] = await router.getAmountsOut(amountIn, path);
  return amounts[amounts.length - 1];
}

async function quoteV3(
  provider: JsonRpcProvider,
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountIn: bigint
): Promise<bigint> {
  const quoter = new Contract(PANCAKE_BSC.quoterV3, quoterV3Abi, provider);
  const [amountOut] = await quoter.quoteExactInputSingle.staticCall({
    tokenIn,
    tokenOut,
    amountIn,
    fee,
    sqrtPriceLimitX96: 0,
  });
  return amountOut;
}

async function ensureApproval(
  signer: Signer,
  tokenAddress: string,
  spender: string,
  amountIn: bigint,
  onProgress: (msg: string) => void
): Promise<string | undefined> {
  const address = await signer.getAddress();
  const provider = signer.provider as JsonRpcProvider;
  const token = new Contract(tokenAddress, erc20Abi, signer);
  const allowance: bigint = await token.allowance(address, spender);
  if (allowance >= amountIn) return undefined;

  onProgress("授权中…");
  const base = buildTxRequest({
    to: tokenAddress,
    valueEth: "0",
    data: token.interface.encodeFunctionData("approve", [spender, amountIn]),
    gasLimit: "",
  });
  const fees = await resolveFastTxFees(provider, {
    to: tokenAddress,
    valueEth: "0",
    data: base.data,
    gasLimit: "",
    from: address,
  });
  const tx = await signer.sendTransaction(applyFastFeesToTx(base, fees));
  await tx.wait();
  return tx.hash;
}

async function sendSwapTx(
  signer: Signer,
  to: string,
  data: string,
  valueEth: string
): Promise<string> {
  const address = await signer.getAddress();
  const provider = signer.provider as JsonRpcProvider;
  const base = buildTxRequest({ to, valueEth, data, gasLimit: "" });
  const fees = await resolveFastTxFees(provider, {
    to,
    valueEth,
    data,
    gasLimit: "",
    from: address,
  });
  const tx = await signer.sendTransaction(applyFastFeesToTx(base, fees));
  return tx.hash;
}

export function validateSwapForm(form: SwapForm): string {
  if (!form.rpcUrl.trim().startsWith("http")) {
    return "请输入有效的 RPC URL";
  }
  if (!isValidAddress(form.routerAddress)) {
    return "请输入有效的 Router 地址";
  }
  if (!form.nativeIn && !isValidAddress(form.tokenIn)) {
    return "请输入有效的 Token In 地址，或勾选原生币";
  }
  if (!form.nativeOut && !isValidAddress(form.tokenOut)) {
    return "请输入有效的 Token Out 地址，或勾选原生币";
  }
  if (form.version === "v3" && !form.fee) {
    return "请选择 V3 费率档位";
  }
  if (form.amountMode === "fixed") {
    const amount = Number(form.amountIn.trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      return "请输入有效的兑换数量";
    }
  } else {
    try {
      parsePercentBps(form.amountPercent);
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }
  const keys = parsePrivateKeys(form.privateKeysText);
  if (keys.length === 0) {
    if (form.privateKeysText.trim().startsWith("[")) {
      return "私钥 JSON 数组格式无效";
    }
    return "请至少输入一个私钥（每行一个，或 JSON 数组）";
  }
  try {
    parseSlippageBps(form.slippagePercent);
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  return "";
}

export type WalletBalanceEntry = {
  address: string;
  balanceRaw: string;
  balanceFormatted: string;
  error?: string;
};

export type BatchBalanceResult = {
  tokenLabel: string;
  wallets: WalletBalanceEntry[];
  totalFormatted: string;
};

export function validateBalanceQuery(form: SwapForm): string {
  if (!form.rpcUrl.trim().startsWith("http")) {
    return "请输入有效的 RPC URL";
  }
  if (!form.nativeIn && !isValidAddress(form.tokenIn)) {
    return "请输入有效的 Token In 地址，或勾选原生币";
  }
  const keys = parsePrivateKeys(form.privateKeysText);
  if (keys.length === 0) {
    if (form.privateKeysText.trim().startsWith("[")) {
      return "私钥 JSON 数组格式无效";
    }
    return "请至少输入一个私钥（每行一个，或 JSON 数组）";
  }
  return "";
}

export async function queryInputBalances(
  form: SwapForm
): Promise<BatchBalanceResult> {
  const validationError = validateBalanceQuery(form);
  if (validationError) throw new Error(validationError);

  const provider = new JsonRpcProvider(form.rpcUrl.trim());
  const privateKeys = parsePrivateKeys(form.privateKeysText);

  let tokenInAddr: string;
  let decimals: number;
  let symbol: string;

  if (form.nativeIn) {
    tokenInAddr = PANCAKE_BSC.wbnb;
    decimals = 18;
    symbol = "BNB";
  } else {
    tokenInAddr = normalizeAddress(form.tokenIn);
    const token = new Contract(tokenInAddr, erc20Abi, provider);
    const [decimalsValue, symbolValue] = await Promise.all([
      token.decimals(),
      token.symbol(),
    ]);
    decimals = Number(decimalsValue);
    symbol = String(symbolValue);
  }

  const wallets = await Promise.all(
    privateKeys.map(async (pk) => {
      const address = new Wallet(pk).address;
      try {
        const balance = await getInputBalance(
          provider,
          address,
          tokenInAddr,
          form.nativeIn
        );
        return {
          address,
          balanceRaw: balance.toString(),
          balanceFormatted: `${formatUnits(balance, decimals)} ${symbol}`,
        };
      } catch (err) {
        return {
          address,
          balanceRaw: "0",
          balanceFormatted: "-",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  const total = wallets.reduce(
    (sum, w) => sum + (w.error ? BigInt(0) : BigInt(w.balanceRaw)),
    BigInt(0)
  );

  return {
    tokenLabel: symbol,
    wallets,
    totalFormatted: `${formatUnits(total, decimals)} ${symbol}`,
  };
}

function cloneWallets(wallets: WalletSwapStatus[]): WalletSwapStatus[] {
  return wallets.map((w) => ({ ...w }));
}

function cloneWarmupWallets(wallets: WalletWarmupStatus[]): WalletWarmupStatus[] {
  return wallets.map((w) => ({ ...w }));
}

/** 影响授权预热的配置指纹，变更后预热失效 */
export function buildWarmupConfigKey(form: SwapForm): string {
  const walletAddresses = parsePrivateKeys(form.privateKeysText)
    .map((pk) => new Wallet(pk).address.toLowerCase())
    .sort();

  const router = form.routerAddress.trim() || defaultRouter(form.version);

  return JSON.stringify({
    rpcUrl: form.rpcUrl.trim(),
    version: form.version,
    routerAddress: isValidAddress(router)
      ? normalizeAddress(router)
      : router.trim(),
    tokenIn: form.nativeIn
      ? PANCAKE_BSC.wbnb
      : form.tokenIn.trim()
        ? normalizeAddress(form.tokenIn)
        : "",
    nativeIn: form.nativeIn,
    amountMode: form.amountMode,
    amountIn: form.amountIn.trim(),
    amountPercent: form.amountPercent.trim(),
    walletAddresses,
  });
}

export function isWarmupValid(
  warmup: WarmupResult | null | undefined,
  form: SwapForm
): boolean {
  return warmup != null && warmup.configKey === buildWarmupConfigKey(form);
}

export function validateWarmupForm(form: SwapForm): string {
  if (form.nativeIn) {
    return "原生币输入无需授权预热";
  }
  if (!form.rpcUrl.trim().startsWith("http")) {
    return "请输入有效的 RPC URL";
  }
  if (!isValidAddress(form.routerAddress)) {
    return "请输入有效的 Router 地址";
  }
  if (!isValidAddress(form.tokenIn)) {
    return "请输入有效的 Token In 地址";
  }
  if (form.amountMode === "fixed") {
    const amount = Number(form.amountIn.trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      return "请输入有效的兑换数量";
    }
  } else {
    try {
      parsePercentBps(form.amountPercent);
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }
  const keys = parsePrivateKeys(form.privateKeysText);
  if (keys.length === 0) {
    if (form.privateKeysText.trim().startsWith("[")) {
      return "私钥 JSON 数组格式无效";
    }
    return "请至少输入一个私钥（每行一个，或 JSON 数组）";
  }
  return "";
}

function canUseWarmupApproval(
  warmupEntry: WalletWarmupStatus | undefined,
  amountIn: bigint
): boolean {
  if (!warmupEntry || warmupEntry.status !== "ready") return false;
  if (!warmupEntry.approvedAmountRaw) return false;
  return amountIn <= BigInt(warmupEntry.approvedAmountRaw);
}

async function warmupWallet(
  prepared: Pick<
    SwapPrepared,
    | "provider"
    | "routerAddress"
    | "form"
    | "tokenInAddr"
    | "amountConfig"
    | "decimals"
    | "signerPool"
  >,
  privateKey: string,
  entry: WalletWarmupStatus,
  onProgress?: WarmupProgress,
  allWallets?: WalletWarmupStatus[]
): Promise<void> {
  const { provider, routerAddress, form, tokenInAddr, amountConfig, decimals, signerPool } =
    prepared;

  const notify = () => {
    if (onProgress && allWallets) onProgress(cloneWarmupWallets(allWallets));
  };

  const signer = getSigner(privateKey, signerPool);
  const address = await signer.getAddress();
  entry.address = address;
  notify();

  try {
    entry.status = "checking";
    entry.message = "检查余额与授权…";
    notify();

    const balance = await getInputBalance(
      provider,
      address,
      tokenInAddr,
      form.nativeIn
    );
    const amountIn = amountInFromBalance(balance, amountConfig, form.nativeIn);

    if (balance === BigInt(0)) {
      entry.status = "skipped";
      entry.message = "余额为 0，已跳过";
      notify();
      return;
    }

    if (amountIn <= BigInt(0) || balance < amountIn) {
      entry.status = "error";
      entry.message = "余额不足，无法预热授权";
      notify();
      return;
    }

    const amountInLabel = formatUnits(amountIn, decimals);
    const token = new Contract(tokenInAddr, erc20Abi, provider);
    const allowance: bigint = await token.allowance(address, routerAddress);
    entry.allowanceRaw = allowance.toString();

    if (allowance >= amountIn) {
      entry.status = "ready";
      entry.approvedAmountRaw = allowance.toString();
      entry.message = `授权充足，无需 approve（${amountInLabel}）`;
      notify();
      return;
    }

    entry.status = "approving";
    entry.message = `授权中… (${amountInLabel})`;
    notify();

    const approveHash = await ensureApproval(
      signer,
      tokenInAddr,
      routerAddress,
      amountIn,
      (msg) => {
        entry.message = msg;
        notify();
      }
    );
    if (approveHash) entry.approveTxHash = approveHash;

    entry.status = "ready";
    entry.approvedAmountRaw = amountIn.toString();
    entry.message = `预热完成，已授权 ${amountInLabel}`;
    notify();
  } catch (err) {
    entry.status = "error";
    entry.message = err instanceof Error ? err.message : String(err);
    notify();
  }
}

export async function executeWarmup(
  form: SwapForm,
  onProgress?: WarmupProgress
): Promise<WarmupResult> {
  const validationError = validateWarmupForm(form);
  if (validationError) throw new Error(validationError);

  const configKey = buildWarmupConfigKey(form);
  const provider = new JsonRpcProvider(form.rpcUrl.trim());
  const routerAddress = normalizeAddress(
    form.routerAddress.trim() || defaultRouter(form.version)
  );
  const path = resolvePath(
    form.tokenIn.trim(),
    form.tokenOut.trim(),
    form.nativeIn,
    form.nativeOut
  );
  const tokenInAddr = path[0];
  const tokenOutAddr = path[1];
  const decimals = await getTokenDecimals(provider, tokenInAddr);
  const amountConfig = parseAmountConfig(form, decimals);
  const privateKeys = uniquePrivateKeys(parsePrivateKeys(form.privateKeysText));
  const signerPool = buildSignerPool(privateKeys, provider);

  const wallets: WalletWarmupStatus[] = privateKeys.map((pk) => ({
    address: new Wallet(pk).address,
    status: "pending",
    message: "等待预热",
  }));

  onProgress?.(cloneWarmupWallets(wallets));

  const prepared = {
    provider,
    routerAddress,
    version: form.version,
    form,
    deadline: swapDeadline(Number(form.deadlineMinutes.trim() || "20")),
    path,
    tokenInAddr,
    tokenOutAddr,
    amountConfig,
    decimals,
    signerPool,
  };

  await Promise.all(
    privateKeys.map((pk, i) =>
      warmupWallet(prepared, pk, wallets[i], onProgress, wallets)
    )
  );

  return { configKey, wallets };
}

async function executeWalletSwap(
  prepared: SwapPrepared,
  privateKey: string,
  entry: WalletSwapStatus,
  onProgress?: BatchSwapProgress,
  allWallets?: WalletSwapStatus[]
): Promise<void> {
  const {
    provider,
    routerAddress,
    version,
    form,
    deadline,
    path,
    tokenInAddr,
    tokenOutAddr,
    amountConfig,
    decimals,
    signerPool,
  } = prepared;

  const notify = () => {
    if (onProgress && allWallets) onProgress(cloneWallets(allWallets));
  };

  const signer = getSigner(privateKey, signerPool);
  const address = await signer.getAddress();
  entry.address = address;
  notify();

  try {
    const balance = await getInputBalance(
      provider,
      address,
      tokenInAddr,
      form.nativeIn
    );
    const amountIn = amountInFromBalance(balance, amountConfig, form.nativeIn);

    if (balance === BigInt(0)) {
      entry.status = "skipped";
      entry.message = "余额为 0，已跳过";
      notify();
      return;
    }

    if (amountIn <= BigInt(0)) {
      entry.status = "error";
      entry.message =
        amountConfig.mode === "percent"
          ? "余额不足或百分比计算结果为 0"
          : "余额不足";
      notify();
      return;
    }

    if (balance < amountIn) {
      entry.status = "error";
      entry.message =
        amountConfig.mode === "percent"
          ? `余额不足：需 ${formatUnits(amountIn, decimals)}，当前 ${formatUnits(balance, decimals)}`
          : `余额不足：需要 ${form.amountIn}，当前 ${formatUnits(balance, decimals)}`;
      notify();
      return;
    }

    const amountOutMin =
      prepared.sharedAmountOutMin ??
      (await quoteAmountOutMin(prepared, amountIn));

    const amountInLabel = formatUnits(amountIn, decimals);

    const warmupEntry = prepared.warmup?.wallets.find(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );

    if (!form.nativeIn) {
      if (canUseWarmupApproval(warmupEntry, amountIn)) {
        entry.message = `使用预热授权 (${amountInLabel})`;
        notify();
      } else {
        entry.status = "approving";
        entry.message = `检查授权… (${amountInLabel})`;
        notify();
        const approveHash = await ensureApproval(
          signer,
          tokenInAddr,
          routerAddress,
          amountIn,
          (msg) => {
            entry.message = msg;
            notify();
          }
        );
        if (approveHash) entry.approveTxHash = approveHash;
      }
    }

    entry.status = "swapping";
    entry.message = `兑换中… (${amountInLabel})`;
    notify();

    let swapTxHash: string;
    const valueEth = form.nativeIn ? formatUnits(amountIn, 18) : "0";

    if (version === "v2") {
      const router = new Contract(routerAddress, routerV2Abi, signer);

      if (form.nativeIn) {
        const data = router.interface.encodeFunctionData(
          "swapExactETHForTokens",
          [amountOutMin, path, address, deadline]
        );
        swapTxHash = await sendSwapTx(signer, routerAddress, data, valueEth);
      } else if (form.nativeOut) {
        const data = router.interface.encodeFunctionData(
          "swapExactTokensForETH",
          [amountIn, amountOutMin, path, address, deadline]
        );
        swapTxHash = await sendSwapTx(signer, routerAddress, data, "0");
      } else {
        const data = router.interface.encodeFunctionData(
          "swapExactTokensForTokens",
          [amountIn, amountOutMin, path, address, deadline]
        );
        swapTxHash = await sendSwapTx(signer, routerAddress, data, "0");
      }
    } else {
      const router = new Contract(routerAddress, smartRouterV3Abi, signer);
      const params = {
        tokenIn: tokenInAddr,
        tokenOut: tokenOutAddr,
        fee: form.fee,
        recipient: address,
        amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0,
      };
      const data = router.interface.encodeFunctionData("exactInputSingle", [
        params,
      ]);
      swapTxHash = await sendSwapTx(signer, routerAddress, data, valueEth);
    }

    entry.status = "success";
    entry.swapTxHash = swapTxHash;
    entry.message = `成功，卖出 ${amountInLabel}，min out: ${amountOutMin.toString()}`;
    notify();
  } catch (err) {
    entry.status = "error";
    entry.message = err instanceof Error ? err.message : String(err);
    notify();
  }
}

export async function executeBatchSwap(
  form: SwapForm,
  onProgress?: BatchSwapProgress,
  warmup?: WarmupResult | null
): Promise<BatchSwapResult> {
  const validationError = validateSwapForm(form);
  if (validationError) throw new Error(validationError);

  const provider = new JsonRpcProvider(form.rpcUrl.trim());
  const routerAddress = normalizeAddress(
    form.routerAddress.trim() || defaultRouter(form.version)
  );
  const slippageBps = parseSlippageBps(form.slippagePercent);
  const deadline = swapDeadline(Number(form.deadlineMinutes.trim() || "20"));
  const path = resolvePath(
    form.tokenIn.trim(),
    form.tokenOut.trim(),
    form.nativeIn,
    form.nativeOut
  );
  const tokenInAddr = path[0];
  const tokenOutAddr = path[1];

  const decimals = form.nativeIn
    ? 18
    : await getTokenDecimals(provider, tokenInAddr);
  const amountConfig = parseAmountConfig(form, decimals);

  const privateKeys = uniquePrivateKeys(parsePrivateKeys(form.privateKeysText));
  const signerPool = buildSignerPool(privateKeys, provider);
  const wallets: WalletSwapStatus[] = privateKeys.map((pk) => ({
    address: new Wallet(pk).address,
    status: "pending",
    message: "等待执行",
  }));

  onProgress?.(cloneWallets(wallets));

  let sharedAmountOutMin: bigint | undefined;
  if (amountConfig.mode === "fixed") {
    sharedAmountOutMin = await quoteAmountOutMin(
      {
        provider,
        routerAddress,
        version: form.version,
        form,
        deadline,
        path,
        tokenInAddr,
        tokenOutAddr,
        amountConfig,
        decimals,
        slippageBps,
        signerPool,
      },
      amountConfig.amountIn
    );
  }

  const activeWarmup: WarmupResult | undefined =
    warmup != null && isWarmupValid(warmup, form) ? warmup : undefined;

  const prepared: SwapPrepared = {
    provider,
    routerAddress,
    version: form.version,
    form,
    deadline,
    path,
    tokenInAddr,
    tokenOutAddr,
    amountConfig,
    decimals,
    slippageBps,
    sharedAmountOutMin,
    warmup: activeWarmup,
    signerPool,
  };

  await Promise.all(
    privateKeys.map((pk, i) =>
      executeWalletSwap(prepared, pk, wallets[i], onProgress, wallets)
    )
  );

  return { wallets };
}

/** 仅报价预览，不发送交易 */
export async function previewQuote(form: SwapForm): Promise<{
  amountOut: string;
  amountOutMin: string;
  amountInUsed: string;
  path: string[];
  note?: string;
}> {
  const validationError = validateSwapForm(form);
  if (validationError) throw new Error(validationError);

  const provider = new JsonRpcProvider(form.rpcUrl.trim());
  const routerAddress = normalizeAddress(
    form.routerAddress.trim() || defaultRouter(form.version)
  );
  const slippageBps = parseSlippageBps(form.slippagePercent);
  const path = resolvePath(
    form.tokenIn.trim(),
    form.tokenOut.trim(),
    form.nativeIn,
    form.nativeOut
  );
  const tokenInAddr = path[0];
  const tokenOutAddr = path[1];
  const decimals = form.nativeIn
    ? 18
    : await getTokenDecimals(provider, tokenInAddr);
  const amountConfig = parseAmountConfig(form, decimals);

  let amountIn: bigint;
  let note: string | undefined;

  if (amountConfig.mode === "fixed") {
    amountIn = amountConfig.amountIn;
  } else {
    const firstKey = parsePrivateKeys(form.privateKeysText)[0];
    const wallet = new Wallet(firstKey, provider);
    const balance = await getInputBalance(
      provider,
      wallet.address,
      tokenInAddr,
      form.nativeIn
    );
    amountIn = amountInFromBalance(balance, amountConfig, form.nativeIn);
    if (amountIn <= BigInt(0)) {
      throw new Error("首个钱包余额不足，无法预览百分比报价");
    }
    note = `基于首个钱包 ${wallet.address} 余额的 ${form.amountPercent}% 预览，各钱包实际卖出数量不同`;
  }

  const prepared: SwapPrepared = {
    provider,
    routerAddress,
    version: form.version,
    form,
    deadline: swapDeadline(Number(form.deadlineMinutes.trim() || "20")),
    path,
    tokenInAddr,
    tokenOutAddr,
    amountConfig,
    decimals,
    slippageBps,
    signerPool: new Map(),
  };

  let quoted: bigint;
  if (form.version === "v2") {
    quoted = await quoteV2(provider, routerAddress, amountIn, path);
  } else {
    quoted = await quoteV3(
      provider,
      tokenInAddr,
      tokenOutAddr,
      form.fee,
      amountIn
    );
  }

  const outDecimals = form.nativeOut
    ? 18
    : await getTokenDecimals(provider, tokenOutAddr);

  const amountOutMin = applySlippage(quoted, slippageBps);

  return {
    amountInUsed: formatUnits(amountIn, decimals),
    amountOut: formatUnits(quoted, outDecimals),
    amountOutMin: formatUnits(amountOutMin, outDecimals),
    path,
    note,
  };
}
