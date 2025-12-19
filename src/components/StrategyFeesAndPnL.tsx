import React from 'react';
import { useMemo, useEffect, useState } from "react";
import { Wallet, TrendingUp, Coins, Layers, Activity } from 'lucide-react';
import { fmtEth, fmtUSD } from "../utils/format";
import { Trophy } from 'lucide-react';
// --- Types ---
export interface StrategyFeesAndPnLData {
    collection?: string;
    // Valuation
    feesStrat?: number;
    feesPnkstr?: number;

    // NFT Inventory
    feesRoyalties?: number;
    realizedPnLEth?: number;

    // Liquid Balance
    buyVolume?: number;
    saleVolume?: number;
    buyCount?: number;
    saleCount?: number;
    transactionHistory?: any[];
    // KPIs
    balanceKPIs?: {
        requiredToFloorEth: number;
        completionPercent: number;
    };
}

interface StrategyFeesAndPnLProps {
    strategy: StrategyFeesAndPnLData;
}
const PROXY = import.meta.env.VITE_TW_PROXY_URL || "";

export const StrategyFeesAndPnL: React.FC<StrategyFeesAndPnLProps> = ({
    strategy
}) => {


    const metrics = useMemo(() => {
        const res = {
            buyCount24h: 0,
            buyVol24h: 0,
            sellCount24h: 0,
            sellVol24h: 0,
            buyCount7d: 0,
            buyVol7d: 0,
            sellCount7d: 0,
            sellVol7d: 0,
            bestPnL: null as any
        };

        if (!strategy.transactionHistory) return res;

        const now = new Date();
        const oneDay = 86400000;
        const sevenDays = 7 * oneDay;
        const tokenProfits: Record<
            string,
            { tokenId: string; totalProfitEth: number; tradeCount: number }
        > = {};

        strategy.transactionHistory.forEach((t: any) => {
            // BUYS
            if (t.buyDate) {
                const diff = now.getTime() - t.buyDate.getTime();
                if (diff >= 0 && diff <= oneDay) {
                    res.buyCount24h++;
                    res.buyVol24h += t.buyPriceEth || 0;
                }
                if (diff >= 0 && diff <= sevenDays) {
                    res.buyCount7d++;
                    res.buyVol7d += t.buyPriceEth || 0;
                }
            }

            // SELLS
            if (t.status === "SOLD" && t.sellDate) {
                const diff = now.getTime() - t.sellDate.getTime();
                if (diff >= 0 && diff <= oneDay) {
                    res.sellCount24h++;
                    res.sellVol24h += t.sellPriceEth || 0;
                }
                if (diff >= 0 && diff <= sevenDays) {
                    res.sellCount7d++;
                    res.sellVol7d += t.sellPriceEth || 0;
                }

                // Aggregate profits per token
                if (!tokenProfits[t.tokenId]) {
                    tokenProfits[t.tokenId] = {
                        tokenId: t.tokenId,
                        totalProfitEth: 0,
                        tradeCount: 0
                    };
                }
                tokenProfits[t.tokenId].totalProfitEth += t.profitEth || 0;
                tokenProfits[t.tokenId].tradeCount++;
            }
        });

        // Find best performer
        res.bestPnL = Object.values(tokenProfits).reduce(
            (max, curr) => (curr.totalProfitEth > max.totalProfitEth ? curr : max),
            { tokenId: "", totalProfitEth: -Infinity, tradeCount: 0 }
        );

        if (res.bestPnL.totalProfitEth === -Infinity) res.bestPnL = null;

        return res;
    }, [strategy.transactionHistory]);

    const [bestNftImage, setBestNftImage] = useState<string | null | undefined>(
        undefined
    );
    
    useEffect(() => {
        if (!metrics.bestPnL?.tokenId || !strategy.collection) {
            setBestNftImage(undefined);
            return;
        }

        const url = `${PROXY}/api/os-nft/${strategy.collection}/${metrics.bestPnL.tokenId}`;

        fetch(url)
            .then((res) => res.json())
            .then((data) => setBestNftImage(data.image || data.image_url || null))
            .catch(() => setBestNftImage(null));
    }, [metrics.bestPnL?.tokenId, strategy.collection]);


    return (
        
        < div className = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm" >
            {/* Title */ }
            < div className = "bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between" >
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Activity className="text-blue-500" size={20} />
                    Fees & PNL
                </h3>
                </div >
                {/* Fees Section */ }
                < div className = "p-6 grid grid-cols-1 gap-6" >
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Coins size={14} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase">Lifetime Fees Generated</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-100 dark:border-blue-900/30">
                                <div className="text-[10px] text-blue-600 dark:text-blue-400 mb-1">Strategy (8%)</div>
                                <div className="font-bold text-sm dark:text-gray-200">{fmtEth(strategy.feesStrat)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                                <div className="text-[10px] text-gray-500 mb-1">Platform (1%)</div>
                                <div className="font-bold text-sm text-gray-600 dark:text-gray-400">{fmtEth(strategy.feesPnkstr)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                                <div className="text-[10px] text-gray-500 mb-1">Royalties (1%)</div>
                                <div className="font-bold text-sm text-gray-600 dark:text-gray-400">{fmtEth(strategy.feesRoyalties)}</div>
                            </div>
                        </div>
                    </div>

            {/* P&L Section */ }
            <div className="flex justify-between items-start gap-4">
                <div>
                    <div className={`text-3xl font-bold ${strategy.realizedPnLEth >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmtEth(strategy.realizedPnLEth)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Total Realized P&L</div>
                </div>

                {metrics.bestPnL && metrics.bestPnL.tradeCount > 0 && (
                    <div className="flex flex-col items-end">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Trophy size={10} /> Best P&L NFT
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                            {bestNftImage && <img src={bestNftImage} className="w-20 h-20 rounded border border-gray-200" />}
                            <div className="text-right">
                                <div className="text-sm font-bold text-green-600">+{metrics.bestPnL.totalProfitEth.toFixed(2)}Ξ</div>
                                <div className="text-[10px] text-gray-400">ID #{metrics.bestPnL.tokenId}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Buy / Sell Volume Section */ }
            <div className="flex flex-col gap-2">
                <div className="text-xs text-gray-400 font-bold uppercase">Buy / Sale Volume</div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        <div className="text-xs text-green-700">Buys</div>
                        <div className="font-bold">
                            {fmtEth(strategy.buyVolume)} <span className="text-xs font-normal">({strategy.buyCount})</span>
                        </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        <div className="text-xs text-red-700">Sells</div>
                        <div className="font-bold">
                            {fmtEth(strategy.saleVolume)} <span className="text-xs font-normal">({strategy.saleCount})</span>
                        </div>
                    </div>
                </div>
            </div>
                </div >
            </div >
    );
};