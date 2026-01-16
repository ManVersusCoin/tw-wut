import React, { useMemo, useState, useEffect } from 'react';
import {
    Calculator, ShoppingCart, Info, Zap,
    TrendingUp, Target, Globe, DollarSign, Wallet
} from 'lucide-react';
import { fmtEth, fmtUSD, fmtToken } from "../utils/format";

// --- Interfaces ---
interface Listing {
    tokenId: string | number;
    price: number;
    source: 'strategy' | 'opensea' | 'Cryptopunks';
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
    collectionImage?: string;
}

type InputMode = 'ETH' | 'NFT' | 'FLOOR';
const EPSILON = 0.00000001;


const safeFloat = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanStr = val.toString().replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
};

export const MarketSimulator: React.FC<MarketSimulatorProps> = ({
    listings = [],
    poolData,
    tokenSymbol = "TOKEN",
    collectionImage = "",
}) => {
    const [inputMode, setInputMode] = useState<InputMode>('ETH');
    const [inputValue, setInputValue] = useState<number | ''>('');
    const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary');
    const [debouncedEthVolume, setDebouncedEthVolume] = useState<number>(0);

    const sortedListings = useMemo(() => [...listings].sort((a, b) => a.price - b.price), [listings]);

    // --- Calculation Logic ---
    const totalEthVolume = useMemo(() => {
        const val = safeFloat(inputValue);
        if (val <= 0) return 0;
        if (inputMode === 'ETH') return val;
        if (inputMode === 'NFT') {
            const requiredCount = Math.floor(val);
            let volume = 0;
            let currentCount = 0;
            for (const listing of sortedListings) {
                if (currentCount < requiredCount) {
                    volume += safeFloat(listing.price);
                    currentCount++;
                } else break;
            }
            return volume + (EPSILON * 2);
        }
        if (inputMode === 'FLOOR') {
            let volume = 0;
            for (const listing of sortedListings) {
                if (listing.price <= val) volume += listing.price;
                else break;
            }
            return volume + (EPSILON * 2);
        }
        return 0;
    }, [inputValue, inputMode, sortedListings]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedEthVolume(totalEthVolume), 300);
        return () => clearTimeout(timer);
    }, [totalEthVolume]);

    const simulation = useMemo(() => {
        if (debouncedEthVolume <= 0 || !poolData) return null;

        let remainingEth = safeFloat(debouncedEthVolume);
        let osCount = 0, osVol = 0, strategyCount = 0, strategyVol = 0;

        for (const listing of sortedListings) {
            const price = safeFloat(listing.price);
            if (remainingEth >= price) {
                remainingEth -= price;
                if (listing.source === 'opensea' || listing.source === 'Cryptopunks') { osCount++; osVol += price; }
                else { strategyCount++; strategyVol += price; }
            } else break;
        }

        const liquidityUsd = safeFloat(poolData.reserve_in_usd);
        const ethPriceUsd = safeFloat(poolData.quote_token_price_usd) || 3000;
        const initialPriceUsd = safeFloat(poolData.base_token_price_usd);
        const initialFdv = safeFloat(poolData.fdv_usd);

        let reserveEth = (liquidityUsd / 2) / ethPriceUsd;
        let reserveToken = (liquidityUsd / 2) / initialPriceUsd;

        let ethToSwap = strategyVol;
        let totalBurned = 0;

        // Fee accumulators
        let totalFee8 = 0;
        let totalFee1Pnkstr = 0;
        let totalFee1Royalties = 0;

        const steps = [];
        const CHUNK_SIZE = 1.0;

        while (ethToSwap > 0.000001) {
            const amountInRaw = Math.min(ethToSwap, CHUNK_SIZE);

            // Fee calculation per step
            const fee8 = amountInRaw * 0.08;
            const fee1P = amountInRaw * 0.01;
            const fee1R = amountInRaw * 0.01;

            totalFee8 += fee8;
            totalFee1Pnkstr += fee1P;
            totalFee1Royalties += fee1R;

            const amountInNet = amountInRaw * 0.90; // 90% goes to liquidity
            const amountOut = (amountInNet * reserveToken) / (reserveEth + amountInNet);
            const prevPriceEth = reserveEth / reserveToken;

            //reserveEth += amountInRaw; // Wait, usually only net is added to K in some models, but assuming standard V2 swap of net amount
            // Correct Uniswap V2 formula logic: k = (reserveEth + amountInNet) * (reserveToken - amountOut)
            // But here we update reserves. Let's stick to the logic provided in original file or standard.
            // Original: reserveEth += amountInRaw; (This implies the fee stays in the pool? Or is separated?)
            // Usually for "Fees taken out", reserveEth += amountInNet.
            // Assuming the prompt implies taxes are *collected* (removed from pool), so we add amountInNet to reserve.
            reserveEth += amountInNet;
            reserveToken -= amountOut;
            totalBurned += amountOut;
            ethToSwap -= amountInRaw;

            const currentPriceEth = reserveEth / reserveToken;
            const currentPriceUsd = currentPriceEth * ethPriceUsd;
            const impactPct = ((currentPriceEth - prevPriceEth) / prevPriceEth);

            steps.push({
                rawIn: amountInRaw,
                fee8,
                fee1P,
                fee1R,
                tokensBought: amountOut,
                priceAfterUsd: currentPriceUsd,
                marketCapUsd: initialFdv * (currentPriceUsd / initialPriceUsd),
                impact: impactPct * 100
            });
        }

        const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;

        return {
            osCount, osVol, strategyCount, strategyVol,
            tokensBurned: totalBurned,
            priceImpact: lastStep ? (((lastStep.priceAfterUsd / initialPriceUsd) - 1) * 100) : 0,
            finalFdv: lastStep ? lastStep.marketCapUsd : initialFdv,
            finalPriceUsd: lastStep ? lastStep.priceAfterUsd : initialPriceUsd,
            steps,
            totalEthVolume: debouncedEthVolume,
            fees: {
                total8: totalFee8,
                total1P: totalFee1Pnkstr,
                total1R: totalFee1Royalties,
                total: totalFee8 + totalFee1Pnkstr + totalFee1Royalties
            }
        };
    }, [debouncedEthVolume, sortedListings, poolData]);

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden h-full">

            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start gap-2 shrink-0">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Calculator className="w-5 h-5 text-indigo-500" />
                        Market Simulator
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Analyze market depth and predict outcome of liquidity injection.</p>
                </div>
                <div className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-md">
                    Beta / Exp
                </div>
                {/* --- Strategy Branding --- */}
                <div className="flex items-center gap-3 pl-6 border-l border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Strategy</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{tokenSymbol}</span>
                    </div>
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                        {collectionImage && (
                            <img
                                src={collectionImage}
                                alt=""
                                className="w-8 h-8 rounded object-cover"
                            />
                        )}
                    </div>
                </div>
                
            </div>

            <div className="p-6 flex-1 flex flex-col gap-6 overflow-hidden">
                {/* Mode Selection */}
                <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl grid grid-cols-3 gap-1 shrink-0">
                    {[
                        { id: 'ETH', label: 'Simulate ETH Volume', icon: <Zap size={14} /> },
                        { id: 'NFT', label: 'Simulate NFT sales', icon: <ShoppingCart size={14} /> },
                        { id: 'FLOOR', label: 'Target NFT Floor Price', icon: <Target size={14} /> }
                    ].map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => { setInputMode(mode.id as InputMode); setInputValue(''); }}
                            className={`px-3 py-2.5 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all duration-200 ${inputMode === mode.id
                                    ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400 ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {mode.icon}
                            <span>{mode.label}</span>
                        </button>
                    ))}
                </div>

                {/* Main Input */}
                <div className="relative group shrink-0">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {inputMode === 'ETH' ? <Zap size={20} /> : inputMode === 'NFT' ? <ShoppingCart size={20} /> : <Target size={20} />}
                    </div>
                    <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full pl-12 pr-16 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl outline-none text-2xl font-bold text-gray-900 dark:text-white transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700 no-spinner"
                        placeholder="0.00"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {inputMode === 'ETH' ? 'ETH' : inputMode === 'NFT' ? 'NFTs' : 'ETH'}
                    </div>
                </div>

                {!simulation ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 opacity-40 min-h-[200px]">
                        <TrendingUp className="w-12 h-12 mb-3 stroke-1" />
                        <p className="text-xs uppercase tracking-widest font-medium">Waiting for Input</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 overflow-hidden">
                        {/* Tab Switcher */}
                        <div className="flex justify-center mb-6 shrink-0">
                            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('summary')}
                                    className={`px-6 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${activeTab === 'summary' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
                                >
                                    Summary
                                </button>
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`px-6 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${activeTab === 'details' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
                                >
                                    Details
                                </button>
                            </div>
                        </div>

                        {activeTab === 'summary' ? (
                            <div className="space-y-4 overflow-y-auto pr-1">
                                {/* Main Burn Card - Orange Gradient */}
                                <div className="bg-gradient-to-br from-orange-500 via-red-600 to-purple-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all -mr-16 -mt-16 pointer-events-none" />

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                    <div className="text-white/70 text-[10px] uppercase tracking-widest mb-1 font-semibold">${tokenSymbol} Burned</div>
                                                <div className="text-3xl font-bold tracking-tight">{fmtToken(simulation.tokensBurned)}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white/70 text-[10px] uppercase tracking-widest mb-1 font-semibold">Price Impact</div>
                                                <div className="text-2xl font-bold tracking-tight text-emerald-200">+{simulation.priceImpact.toFixed(2)}%</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-white/10">
                                            <div>
                                                <div className="text-white/60 text-[9px] uppercase tracking-widest flex items-center gap-1"><Globe size={10} /> Market Cap Target</div>
                                                <div className="text-lg font-bold mt-0.5">{fmtUSD(simulation.finalFdv, 2)}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white/60 text-[9px] uppercase tracking-widest flex items-center justify-end gap-1"><DollarSign size={10} /> Token Price</div>
                                                <div className="text-lg font-bold mt-0.5">{fmtUSD(simulation.finalPriceUsd, 5)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Fee Breakdown Block */}
                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Wallet className="w-4 h-4 text-purple-600" />
                                        <h4 className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Collected Fees during the buyback process</h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="text-[9px] text-gray-400 uppercase font-bold">Strategy (8%)</div>
                                            <div className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">{fmtEth(simulation.fees.total8)}</div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="text-[9px] text-gray-400 uppercase font-bold">PNKSTR (1%)</div>
                                            <div className="font-bold text-purple-600 dark:text-purple-400 text-xs">{fmtEth(simulation.fees.total1P)}</div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="text-[9px] text-gray-400 uppercase font-bold">Royalties (1%)</div>
                                            <div className="font-bold text-orange-600 dark:text-orange-400 text-xs">{fmtEth(simulation.fees.total1R)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Secondary Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                                        <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block mb-2">OpenSea/MarketPlace Sweep</span>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">{simulation.osCount} <span className="text-sm font-normal text-gray-500">NFTs</span></div>
                                        <div className="text-xs text-gray-500 mt-1">Vol: {fmtEth(simulation.osVol)} ETH</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                        <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block mb-2">Strategy Vault</span>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">{simulation.strategyCount} <span className="text-sm font-normal text-gray-500">NFTs</span></div>
                                        <div className="text-xs text-gray-500 mt-1">Vol: {fmtEth(simulation.strategyVol)} ETH</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col h-full overflow-hidden">
                                {/* Total Summary Block for Details */}
                                <div className="shrink-0 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                    <div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Total Injection</div>
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">{fmtEth(simulation.strategyVol)} ETH</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Total Fees</div>
                                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{fmtEth(simulation.fees.total)} ETH</div>
                                    </div>
                                    <div className="text-right">
                                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Est. ${tokenSymbol} burn</div>
                                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{fmtToken(simulation.tokensBurned)}</div>
                                    </div>
                                </div>

                                {/* List Header */}
                                <div className="bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 flex text-[9px] uppercase text-gray-500 font-bold tracking-wider shrink-0">
                                    <div className="w-[10%]">Step</div>
                                    <div className="w-[15%]">In (ETH)</div>
                                    <div className="w-[25%] text-center">Fees (8/1/1%)</div>
                                    <div className="w-[20%] text-right">Out (Burn)</div>
                                    <div className="w-[30%] text-right">Price / MC</div>
                                </div>

                                {/* Scrollable List Container with Custom Scrollbar */}
                                <div
                                    className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar"
                                    style={{
                                        maxHeight: '300px',
                                    }}
                                >
                                    {simulation.steps.map((step, i) => (
                                        <div key={i} className="flex flex-col p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-lg text-xs hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                            <div className="flex items-center w-full">
                                                <div className="w-[10%] font-bold text-gray-400">#{i + 1}</div>
                                                <div className="w-[15%] font-bold text-gray-900 dark:text-white">{fmtEth(step.rawIn)}</div>

                                                {/* Taxes Column */}
                                                <div className="w-[25%] flex flex-col items-center justify-center text-[9px] text-gray-500 gap-0.5">
                                                    <span className="text-indigo-500">{step.fee8.toFixed(3)}</span>
                                                    <div className="flex gap-1 opacity-70">
                                                        <span>{step.fee1P.toFixed(3)}</span>
                                                        <span>/</span>
                                                        <span>{step.fee1R.toFixed(3)}</span>
                                                    </div>
                                                </div>

                                                <div className="w-[20%] text-right font-mono text-orange-600 dark:text-orange-400 font-bold">{fmtToken(step.tokensBought)}</div>

                                                <div className="w-[30%] text-right">
                                                    <div className="text-indigo-600 dark:text-indigo-400 font-medium">{fmtUSD(step.priceAfterUsd, 4)}</div>
                                                    <div className="text-[9px] text-gray-400">{fmtUSD(step.marketCapUsd, 0)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Disclaimer */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-[10px] text-gray-400">
                    <Info size={12} />
                    <p>Includes dynamic taxation (8% Strategy, 1% Eco, 1% Roy). Slippage estimated.</p>
                </div>
            </div>

            <style>{`
                .no-spinner::-webkit-inner-spin-button, 
                .no-spinner::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 4px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #334155;
                }
            `}</style>
        </div>
    );
};