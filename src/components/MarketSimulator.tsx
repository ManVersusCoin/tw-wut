import React, { useMemo, useState, useEffect } from 'react';
import { Calculator, Flame, ShoppingCart, Info, Zap, TrendingUp } from 'lucide-react';
import { fmtEth, fmtUSD, fmtToken } from "../utils/format";

// --- Interfaces (inchangées) ---
interface Listing {
    tokenId: string | number;
    price: number;
    source: 'strategy' | 'opensea';
}

interface PoolDataExt {
    base_token_price_usd: string;
    quote_token_price_usd: string;
    reserve_in_usd: string;
    fdv_usd: string;
}

interface MarketSimulatorProps {
    listings: Listing[];
    poolData: PoolDataExt;
    tokenSymbol?: string;
}

// Helper pour nettoyer les chiffres (déplacé hors du composant pour ne pas le recréer)
const safeFloat = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanStr = val.toString().replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
};

// --- NOUVEAU STYLE CSS POUR MASQUER LES FLÈCHES ---
// Pour que cela fonctionne avec Tailwind/PostCSS, vous devriez idéalement avoir ces styles
// dans votre CSS global ou via une directive @layer utilities de Tailwind, mais
// en l'absence de ce fichier, on peut les simuler via className si vous avez une config Tailwind
// qui gère les préfixes ou en utilisant une solution d'auto-prefixage ou un fichier CSS dédié.
// Si vous utilisez la version CLI/base de Tailwind, ces classes n'existent pas par défaut.
// Pour la simplicité ici, je vais les ajouter dans la classe de l'input en me basant sur l'idée
// que vous ayez un moyen d'injecter du CSS custom. 
// Je vais utiliser un style inline simple et des classes génériques pour l'exemple.


export const MarketSimulator: React.FC<MarketSimulatorProps> = ({
    listings = [],
    poolData,
    tokenSymbol = "TOKEN"
}) => {
    type InputMode = 'ETH' | 'NFT';
    const [inputMode, setInputMode] = useState<InputMode>('ETH');
    const [inputValue, setInputValue] = useState<number | ''>('');

    const [debouncedEthVolume, setDebouncedEthVolume] = useState<number>(0);

    // 1. Tri des Listings (Order Book)
    const sortedListings = useMemo(() => {
        return [...listings].sort((a, b) => a.price - b.price);
    }, [listings]);

    // CALCUL DU VOLUME D'ETH À SIMULER
    const totalEthVolume = useMemo(() => {
        const val = safeFloat(inputValue);
        if (val <= 0) return 0;

        if (inputMode === 'ETH') {
            return val;
        } else {
            const requiredCount = Math.floor(val);
            let volume = 0;
            let currentCount = 0;

            for (const listing of sortedListings) {
                if (currentCount < requiredCount) {
                    const price = safeFloat(listing.price);
                    if (price > 0) {
                        volume += price;
                        currentCount++;
                    }
                } else {
                    break;
                }
            }
            return volume;
        }
    }, [inputValue, inputMode, sortedListings]);

    // Debounce pour le volume d'ETH calculé
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedEthVolume(totalEthVolume);
        }, 300);
        return () => clearTimeout(timer);
    }, [totalEthVolume]);


    // 2. Perform Simulation
    const simulation = useMemo(() => {
        if (debouncedEthVolume <= 0 || !poolData) return null;

        console.log("--- Simulation Start ---");
        console.log("Input Volume ETH:", debouncedEthVolume);

        let remainingEth = safeFloat(debouncedEthVolume);

        let osCount = 0;
        let osVol = 0;
        let strategyCount = 0;
        let strategyVol = 0;
        let totalSpent = 0;

        // Sweep logic
        for (const listing of sortedListings) {
            const price = safeFloat(listing.price);
            if (price <= 0) continue;

            if (remainingEth >= price) {
                remainingEth -= price;
                totalSpent += price;
                if (listing.source === 'opensea') {
                    osCount++;
                    osVol += price;
                } else {
                    strategyCount++;
                    strategyVol += price;
                }
            } else {
                break;
            }
        }

        // --- CALCULS DEFI (Inchagé) ---

        const rawLiquidity = poolData.reserve_in_usd;
        const rawEthPrice = poolData.quote_token_price_usd;
        const rawTokenPrice = poolData.base_token_price_usd;

        const liquidityUsd = safeFloat(rawLiquidity);
        const ethPriceUsd = safeFloat(rawEthPrice) || 3000;
        const tokenPriceUsd = safeFloat(rawTokenPrice);

        if (liquidityUsd === 0 || ethPriceUsd === 0 || tokenPriceUsd === 0) {
            return null;
        }

        let reserveEth = (liquidityUsd / 2) / ethPriceUsd;
        let reserveToken = (liquidityUsd / 2) / tokenPriceUsd;

        if (!isFinite(reserveEth) || !isFinite(reserveToken)) {
            return null;
        }

        const initialTokenPriceEth = reserveEth / reserveToken;

        let ethToSwap = strategyVol;
        let tokensBurned = 0;
        const CHUNK_SIZE = 1.0;
        const steps = [];

        // Boucle de swap
        let loopGuard = 0;
        while (ethToSwap > 0.000001 && loopGuard < 100) {
            loopGuard++;
            const amountIn = Math.min(ethToSwap, CHUNK_SIZE);

            const amountInWithFee = amountIn * 0.9;
            const numerator = amountInWithFee * reserveToken;
            const denominator = reserveEth + amountInWithFee;
            const amountOut = numerator / denominator;

            if (isNaN(amountOut)) break;

            reserveEth += amountIn;
            reserveToken -= amountOut;
            tokensBurned += amountOut;
            ethToSwap -= amountIn;

            steps.push({
                in: amountIn,
                out: amountOut,
                newPrice: reserveEth / reserveToken
            });
        }

        const finalTokenPriceEth = reserveEth / reserveToken;
        const priceImpact = ((finalTokenPriceEth - initialTokenPriceEth) / initialTokenPriceEth) * 100;

        return {
            osCount,
            osVol,
            strategyCount,
            strategyVol,
            totalSpent,
            tokensBurned,
            priceImpact,
            initialTokenPriceEth,
            finalTokenPriceEth,
            steps,
            totalEthVolume: debouncedEthVolume,
            inputMode
        };

    }, [debouncedEthVolume, sortedListings, poolData, inputMode]);

    // RENDER
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">

            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-purple-500" />
                        Market Simulator
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Inject ETH or specify NFT count to simulate buy & burn</p>
                </div>

                <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wide">
                    Beta / Experimental
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
                {/* Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Injection Amount
                    </label>
                    <div className="relative flex rounded-xl shadow-sm">

                        {/* Champ de saisie MODIFIÉ POUR SUPPRIMER LES FLÈCHES */}
                        <input
                            type="number"
                            min="0"
                            step={inputMode === 'ETH' ? "0.1" : "1"}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className={`
                                w-full pl-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-lg font-bold z-10
                                
                                /* CSS pour masquer les flèches */
                                [appearance:textfield] /* Firefox */
                                [&::-webkit-outer-spin-button]:appearance-none /* Chrome, Safari, Edge */
                                [&::-webkit-inner-spin-button]:appearance-none /* Chrome, Safari, Edge */
                            `}
                            placeholder={inputMode === 'ETH' ? "0.00" : "0"}
                        />

                        {/* Boutons de bascule */}
                        <div className="flex items-center border border-l-0 border-gray-300 dark:border-gray-700 rounded-r-xl bg-gray-100 dark:bg-gray-700 z-10">

                            <button
                                type="button"
                                onClick={() => setInputMode('ETH')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-1 ${inputMode === 'ETH'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                style={{
                                    //borderTopRightRadius: inputMode === 'NFT' ? 0 : '0.75rem',
                                    //borderBottomRightRadius: inputMode === 'NFT' ? 0 : '0.75rem',
                                }}
                            >
                                ETH
                            </button>

                            <button
                                type="button"
                                onClick={() => setInputMode('NFT')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-1 ${inputMode === 'NFT'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    } rounded-r-xl mr-1`}
                            >
                                
                                NFT
                            </button>
                        </div>
                    </div>
                    {/* Affichage du volume ETH calculé pour le mode NFT */}
                    {simulation && simulation.inputMode === 'NFT' && (
                        <p className="text-xs text-gray-500 mt-2">
                            This corresponds to a total volume of <strong>{fmtEth(simulation.totalEthVolume)} ETH</strong>.
                        </p>
                    )}
                </div>

                {/* Simulation Results (Reste inchangé) */}

                {!simulation ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 min-h-[200px]">
                        <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">Enter an amount to simulate<br />market sweep and token burn.</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* 1. Market Sweep Results */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                                <ShoppingCart className="w-3 h-3" /> Market Sweep
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                {/* OpenSea Result */}
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">OpenSea</div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">{simulation.osCount} <span className="text-sm font-normal text-gray-500">NFTs</span></div>
                                    <div className="text-xs text-gray-500">{fmtEth(simulation.osVol)} ETH</div>
                                </div>

                                {/* Strategy Result */}
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Strategy</div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">{simulation.strategyCount} <span className="text-sm font-normal text-gray-500">NFTs</span></div>
                                    <div className="text-xs text-gray-500">{fmtEth(simulation.strategyVol)} ETH</div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-800" />

                        {/* 2. Buy & Burn Results */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                                <Flame className="w-3 h-3" /> Buyback & Burn
                            </h4>

                            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Zap className="w-24 h-24" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-white/80 text-xs font-medium mb-1">Total {tokenSymbol} Burned</div>
                                            <div className="text-3xl font-black tracking-tight">{fmtToken(simulation.tokensBurned)}</div>
                                            <div className="text-white/60 text-xs mt-1">
                                                Generated from {fmtEth(simulation.strategyVol)} ETH revenue
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                                        <div>
                                            <div className="text-white/80 text-xs">Price Impact</div>
                                            <div className="font-bold text-lg">+{simulation.priceImpact.toFixed(3)}%</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white/80 text-xs">New Price</div>
                                            <div className="font-bold text-lg">
                                                {/* Calculate approx USD price based on impact */}
                                                {fmtUSD(parseFloat(poolData.base_token_price_usd) * (1 + simulation.priceImpact / 100), 4)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Mechanics / Details */}
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-xs text-gray-500 space-y-2">
                            <div className="flex items-center gap-2 font-semibold">
                                <Info className="w-3 h-3" /> Simulation Details
                            </div>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>
                                    Pool Liquidity: <strong>{fmtUSD(parseFloat(poolData.reserve_in_usd))}</strong>
                                </li>
                                <li>
                                    Buyback executed in <strong>{simulation.steps.length}</strong> transaction(s) (max 1 ETH chunks) to minimize slippage.
                                </li>
                                <li>
                                    Uniswap Constant Product Formula ($x \cdot y = k$) with 10% LP fee applied.
                                </li>
                            </ul>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};