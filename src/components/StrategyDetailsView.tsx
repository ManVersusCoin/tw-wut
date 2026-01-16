import { useMemo, useState } from "react";
import {
    ArrowLeft,
    ChevronDown,
    Globe,
    FileText,
    Anchor,
    Flame,
    Activity,
    TrendingUp, TrendingDown, EllipsisVertical
    
} from "lucide-react";
import { MarketDepthVisualizer } from "./MarketDepthVisualizer";
import { NFTActivityBlock } from './NFTActivityBlock';
import { TreasuryBlock } from './TreasuryBlock';
import { StrategyFeesAndPnL } from './StrategyFeesAndPnL';
import { HoldersOverview } from './HoldersOverview';
import { StrategyAnalysisTable } from './StrategyAnalysisTable';
import { MarketSimulator } from './MarketSimulator';
import { FloorImpactTable } from './FloorImpactTable';
import TradeFeed from './TradeFeed';
// Utilities (fmtEth, fmtPrice, fmtUSD, etc.)
import { fmtUSD, fmtPrice, fmtNum } from "../utils/format";
import { useNavigate } from "react-router-dom";


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

    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    

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
        < div className = "grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6" >
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

                            <div className="flex flex-col">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {strategy.tokenName}
                                </h1>

                                <span
                                    className="mt-1 inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-xs font-bold border border-blue-200 dark:border-blue-800 w-fit"
                                >
                                    {strategy.tokenSymbol}
                                </span>
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
                                                href={`https://nftstrategy.fun/strategies/${strategy.tokenAddress.toLowerCase()}`}
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
                        <div className="text-xl font-bold">{fmtPrice(parseFloat(strategy.price_usd))}</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="text-xs text-gray-400 font-bold uppercase">Mcap</div>
                        <div className="text-xl font-bold">{fmtUSD(parseFloat(strategy.market_cap_usd), 2)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="text-xs text-gray-400 font-bold uppercase">Price change 24h</div>
                            
                        {(
                                strategy.priceChange24h !== undefined ? (
                                    <div className={`flex items-center text-sm gap-1 font-bold px-2 mt-1 py-1 rounded-md border w-fit mr-auto  ${strategy.priceChange24h >= 0 ? "text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400" : "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"}`}>
                                        {strategy.priceChange24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {Math.abs(strategy.priceChange24h).toFixed(2)}%
                                </div>
                            ) : <span className="text-gray-400">-</span>
                        )}
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="text-xs text-gray-400 font-bold uppercase">Volume 24h</div>
                            <div className="text-xl font-bold">{fmtUSD(parseFloat(strategy.volume24h), 2)}</div>
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
                
            <StrategyFeesAndPnL 
                    strategy={strategy}
                    tokenSymbol={strategy.tokenSymbol}
                    collectionImage={strategy?.collectionImage}
            />

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                {/* Title */}
                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Activity className="text-blue-500" size={20} />
                        NFT Trade Feed (7 last days)
                    </h3>
                </div>   
                <TradeFeed
                    sourceType={strategy.tokenAddress}
                    timeframe='7d'
                    typeFilter='ALL'
                />
                </div>
                <div className="md:col-span-2">
                    <MarketDepthVisualizer
                        market_depth_data={strategy.marketDepthData}
                        marketDepthKPIs={strategy.marketDepthKPIs}
                        tokenPriceUsd={parseFloat(strategy.poolData?.price_usd || '0')}
                    />
                </div>
                <div className="">
                    <NFTActivityBlock strategy={strategy} />
                </div>
                <div className="">
                    <HoldersOverview strategy={strategy} />
                </div>
            </div>


            <div className="grid grid-cols-1 xl:grid-cols-4 xxl:grid-cols-10 gap-6 mb-6">

                {/* Market Simulator */}
                <div
                    className="
            order-1
            xl:order-2
            xl:col-span-1
            xxl:col-span-2
            min-h-[500px]
        "
                >
                    <MarketSimulator
                        listings={strategy.marketDepthData}
                        poolData={strategy.poolDataExt}
                        tokenSymbol={strategy.tokenSymbol}
                        collectionImage={strategy?.collectionImage}
                    />
                </div>

                {/* Strategy Analysis Table */}
                <div
                    className="
            order-2
            xl:order-1
            xl:col-span-3
            xxl:col-span-4
            min-h-[500px]
        "
                >
                    <StrategyAnalysisTable
                        strategyAddress={strategy.tokenAddress}
                        tokenSymbol={strategy.tokenSymbol}
                        collectionImage={strategy?.collectionImage}
                    />
                </div>

                {/* Floor Impact Table */}
                <div
                    className="
            order-3
            xl:order-3
            xl:col-span-3
            xxl:col-span-4
            min-h-[500px]
        "
                >
                    <FloorImpactTable
                        listings={strategy.marketDepthData}
                        poolData={strategy.poolDataExt}
                        tokenSymbol={strategy.tokenSymbol}
                        collectionImage={strategy?.collectionImage}
                    />
                </div>

            </div>


        
    </div >
    );
}
