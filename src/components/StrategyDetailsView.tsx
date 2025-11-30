import { useMemo, useEffect, useState } from "react";
import {
    ArrowLeft,
    ChevronDown,
    Globe,
    FileText,
    Anchor,
    Flame,
    Trophy,
    Activity,
    Coins, TrendingUp, TrendingDown, EllipsisVertical
    
} from "lucide-react";
import { MarketDepthVisualizer } from "./MarketDepthVisualizer";
import { NFTActivityBlock } from './NFTActivityBlock';
import { TreasuryBlock } from './TreasuryBlock';
import { HoldersOverview } from './HoldersOverview';
import { MarketSimulator } from './MarketSimulator';
// Utilities (fmtEth, fmtPrice, fmtUSD, etc.)
import { fmtEth, fmtUSD, fmtPrice, fmtNum } from "../utils/format";
import { useNavigate } from "react-router-dom";

const PROXY = import.meta.env.VITE_TW_PROXY_URL || "";

export default function StrategyDetailView({
    strategy: initialStrategy,
    allStrategies = [],
    ethPrice,
    onSwitch
}: {
    strategy: any;
    allStrategies?: any[];
    ethPrice: number;
    onSwitch?: (id: string) => void;
    
    }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    /* ----------------------------------------------------------
       1) Normalisation et parsing du JSON
    ---------------------------------------------------------- */
    const strategy = useMemo(() => {
        if (!initialStrategy) return null;
        const s = { ...initialStrategy };

        if (s.transactionHistory) {
            s.transactionHistory = s.transactionHistory.map((t: any) => ({
                ...t,
                buyDate: t.buyDate ? new Date(t.buyDate) : null,
                sellDate: t.sellDate ? new Date(t.sellDate) : null
            }));
        }

        return s;
    }, [initialStrategy]);

    
    /* ----------------------------------------------------------
       2) Calcul des métriques dynamiques
    ---------------------------------------------------------- */
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

    /* ----------------------------------------------------------
       3) Fetch de l'image du meilleur NFT
    ---------------------------------------------------------- */
    const [bestNftImage, setBestNftImage] = useState<string | null | undefined>(
        undefined
    );
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

    if (!strategy)
        return <div className="p-10 text-center">Loading strategy...</div>;


    /* ----------------------------------------------------------
       RENDER
    ---------------------------------------------------------- */
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20 h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900 p-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 sticky top-0 bg-gray-50/95 dark:bg-gray-900 backdrop-blur z-50 py-2 border-b border-gray-200 dark:border-gray-800">
                {/* Back button */}
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium"
                >
                    <ArrowLeft size={20} /> Back to List
                </button>
                {onSwitch && allStrategies.length > 0 && (
                    <div className="flex flex-row  justify-between items-center gap-2 relative">
                        <span className="text-sm text-gray-500">Strategy:</span>

                        <div className="relative w-64">
                            {/* Input simulant le select */}
                            <button
                                onClick={() => setOpen(!open)}
                                className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <div className="flex items-center gap-2">
                                    {strategy?.collectionImage && (
                                        <img
                                            src={strategy.collectionImage}
                                            alt=""
                                            className="w-5 h-5 rounded-full object-cover"
                                        />
                                    )}
                                    <span>{strategy?.tokenSymbol}</span>
                                </div>
                                <ChevronDown size={16} className="text-gray-400" />
                            </button>

                            {/* Dropdown */}
                            {open && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">

                                    {/* Search */}
                                    <div className="p-2">
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Options */}
                                    {allStrategies
                                        .filter(s => s.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map((s) => (
                                            <div
                                                key={s.id}
                                                onClick={() => {
                                                    onSwitch(s.id);
                                                    setOpen(false);
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                <img
                                                    src={s.collectionImage}
                                                    alt=""
                                                    className="w-5 h-5 rounded-full object-cover"
                                                />
                                                <span className="truncate">{s.tokenSymbol}</span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>



        {/* TOP ROW: Identity & Key Metrics */ }
        < div className = "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" >
            {/* 1. Identity */ }
            < div className = "bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between" >
                    <div className="flex items-start gap-4">
                        <img
                            src={strategy.collectionImage}
                            className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100 dark:border-gray-700 shadow-md"
                        />

                        <div className="flex-grow">

                            {/* 1. Ligne du Titre, Symbole ET Bouton '...' (utilisant justify-between) */}
                            <div className="flex justify-between items-start mb-1">

                                {/* Groupe de gauche : Titre et Symbole */}
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{strategy.tokenName}</h1>
                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-xs font-bold border border-blue-200 dark:border-blue-800">{strategy.tokenSymbol}</span>
                                </div>

                                {/* Groupe de droite : Bouton '...' et Dropdown (Positionnement relatif) */}
                                <div className="relative z-10">
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                                        aria-expanded={isDropdownOpen}
                                    >
                                        <EllipsisVertical size={20} />
                                    </button>

                                    {/* Contenu de la liste déroulante */}
                                    {isDropdownOpen && (
                                        <div
                                            // CLÉ : 'right-0' pour aligner la liste à droite du bouton
                                            className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 p-1 origin-top-right animate-in fade-in zoom-in-95 duration-200"
                                            onMouseLeave={() => setIsDropdownOpen(false)}
                                        >
                                            {/* Lien 1 */}
                                            <a
                                                href={`https://nftstrategy.fun/strategies/${strategy.tokenAddress}`}
                                                target="_blank"
                                                className="flex items-center gap-2 p-2 text-sm text-gray-700 dark:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
                                            >
                                                <Globe size={16} /> Strategy Page
                                            </a>

                                            {/* Lien 2 */}
                                            <a
                                                href={`https://etherscan.io/address/${strategy.tokenAddress}`}
                                                target="_blank"
                                                className="flex items-center gap-2 p-2 text-sm text-gray-700 dark:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
                                            >
                                                <FileText size={16} /> Etherscan
                                            </a>

                                            {/* Lien 3 (Optionnel) */}
                                            {strategy.collectionOsSlug && (
                                                <a
                                                    href={`https://opensea.io/collection/${strategy.collectionOsSlug}`}
                                                    target="_blank"
                                                    className="flex items-center gap-2 p-2 text-sm text-gray-700 dark:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
                                                >
                                                    <Anchor size={16} /> OpenSea
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Vous pouvez ajouter ici d'autres éléments qui devaient se trouver en dessous du titre */}

                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400 font-bold uppercase">Price</div>
                            <div className="text-xl font-bold">{fmtPrice(parseFloat(strategy.poolData.price_usd))}</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400 font-bold uppercase">Mcap</div>
                            <div className="text-xl font-bold">{fmtUSD(parseFloat(strategy.poolData.market_cap_usd), 2)}</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400 font-bold uppercase">Price change 24h</div>
                            
                            {(
                                strategy.poolData.price_change_24h !== undefined ? (
                                    <div className={`flex items-center text-sm gap-1 font-bold px-2 mt-1 py-1 rounded-md border w-fit mr-auto  ${strategy.poolData.price_change_24h >= 0 ? "text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400" : "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"}`}>
                                        {strategy.poolData.price_change_24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {Math.abs(strategy.poolData.price_change_24h).toFixed(2)}%
                                    </div>
                                ) : <span className="text-gray-400">-</span>
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400 font-bold uppercase">Volume 24h</div>
                            <div className="text-xl font-bold">{fmtUSD(parseFloat(strategy.poolData.volume_24h), 2)}</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400 font-bold uppercase">Burn</div>

                            <div className="flex items-center justify-between mt-1">

                                
                                <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-md text-sm font-bold border border-orange-200 dark:border-orange-800 shadow-sm">
                                    <Flame size={12} />
                                    {strategy.burnedPercentage?.toFixed(1)}%
                                </div>

                                
                                <div className="text-base font-semibold text-gray-800 dark:text-gray-200">
                                    {fmtNum(strategy.burnedAmount)}
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400 font-bold uppercase">Holders</div>

                            <div className="flex items-center justify-between mt-1">

                                {/* Nombre de holders */}
                                <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 
                        text-blue-700 dark:text-blue-300 
                        px-2 py-1 rounded-md text-sm font-bold border 
                        border-blue-200 dark:border-blue-800 shadow-sm">
                                    {fmtNum(strategy.stratHolders)}
                                </div>

                                {/* Label */}
                                <div className="text-xs text-gray-500 dark:text-gray-300 uppercase font-semibold">
                                    Token Holders
                                </div>
                            </div>
                        </div>
                        
                    </div>
                </div >
                <TreasuryBlock
                    strategy={strategy}
                    ethPrice={ethPrice}
                />
                
                {/* 3. PnL */ }
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    {/* Title */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Activity className="text-blue-500" size={20} />
                            Fees & PNL
                        </h3>
                    </div>
                    {/* Fees Section */}
                    <div className="p-6 grid grid-cols-1 gap-6">
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

                    {/* P&L Section */}
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

                    {/* Buy / Sell Volume Section */}
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
                    </div>
                </div>
</div>

            {/* NEW SECTION 1: MARKET STATS & FEES */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

                {/* Left Side: Chart (Takes up 2 columns on large screens) */}
                <div className="xl:col-span-2">
                    <MarketDepthVisualizer
                        market_depth_data={strategy.market_depth_data}
                        marketDepthKPIs={strategy.marketDepthKPIs}
                        tokenPriceUsd={parseFloat(strategy.poolData?.price_usd || '0')}
                    />
                </div>
                <div className="xl:col-span-1 min-h-[600px]">
                    <MarketSimulator
                        listings={strategy.market_depth_data}
                        poolData={strategy.poolDataExt}
                        tokenSymbol={strategy.tokenSymbol}
                    />
                </div>
                </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex flex-col h-full">
                    <NFTActivityBlock strategy={strategy} />
                </div>
                <div className="flex flex-col h-full">
                    <HoldersOverview strategy={strategy} />
                </div>
            </div>
            
        </div >
    );
}
