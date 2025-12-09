import  { useMemo, useState, useEffect } from 'react';
import {
    Activity,
    Wallet,
    BarChart3,
    Layers,
    ArrowUpRight,
    Coins, Table,
    Percent,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
// Importation de tes utilitaires
import { fmtUSD, fmtNum, fmtPercent, fmtEth } from '../utils/format';
import TradeFeed from '../components/TradeFeed';
// --- Constantes d'API ---
const PROXY = import.meta.env.VITE_TW_WUT_URL;
const STRATEGIES_DATA_URL = `${PROXY}/strategies_summary.json`;

const RankingWidget = ({
    title,
    icon: Icon,
    data,
    getValue,
    formatValue,
    sortDirection = 'desc',
    valueLabel = 'Value',
    color = 'blue',
    itemsPerPage = 6   // 🔥 Remplace "limit"
}: any) => {

    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);

    // ⚡️ Tri de la data
    const sortedData = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => {
            const valA = getValue(a) || 0;
            const valB = getValue(b) || 0;
            return sortDirection === 'desc' ? valB - valA : valA - valB;
        });
    }, [data, getValue, sortDirection]);

    // 📄 Pagination
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    // 🎨 Couleurs icônes
    const iconColors: Record<string, string> = {
        blue: "text-blue-500",
        green: "text-green-500",
        purple: "text-purple-500",
        orange: "text-orange-500",
        red: "text-rose-500",
    };

    // 🔘 Composant Pagination
    const PaginationControls = () => (
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800">
            <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="
                    flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg
                    bg-gray-100 text-gray-800 hover:bg-gray-200
                    dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all shadow-sm hover:shadow
                "
            >
                <ChevronLeft size={16} />
                Previous
            </button>

            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page <span className="font-semibold">{currentPage}</span> / {totalPages}
            </span>

            <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="
                    flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg
                    bg-gray-100 text-gray-800 hover:bg-gray-200
                    dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all shadow-sm hover:shadow
                "
            >
                Next
                <ChevronRight size={16} />
            </button>
        </div>
    );

    return (
        <div className="bg-white bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col h-full">

            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Icon className={iconColors[color] || "text-blue-500"} size={20} />
                    {title}
                </h3>
            </div>

            {/* List */}
            <div className="p-0 flex-1">
                {paginatedData.map((item: any, index: number) => {
                    const rawValue = getValue(item);
                    const labelContent =
                        typeof valueLabel === "function"
                            ? valueLabel(item, rawValue)
                            : valueLabel;

                    return (
                        <div
                            key={item.id || index}
                            className={`px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${index !== paginatedData.length - 1
                                    ? "border-b border-gray-100 dark:border-gray-800"
                                    : ""
                                }`}
                        >

                            {/* Rank */}
                            <span className="text-sm font-medium text-gray-400 w-4">
                                {(currentPage - 1) * itemsPerPage + index + 1}
                            </span>

                            {/* Main button */}
                            <button
                                onClick={() => navigate(`/strategy/${item.tokenAddress}`)}
                                className="flex items-center gap-4 text-left w-full rounded-xl transition"
                            >
                                <div className="relative">
                                    <img
                                        src={item.collectionImage}
                                        alt={item.tokenName}
                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                                "https://via.placeholder.com/40";
                                        }}
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-gray-100 dark:bg-gray-800 text-[10px] font-bold px-1 rounded border border-gray-300 dark:border-gray-600">
                                        {item.tokenSymbol}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {item.tokenName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.collectionName}
                                    </p>
                                </div>
                            </button>

                            {/* Right value */}
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                                    {formatValue(rawValue)}
                                </p>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">
                                    {labelContent}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            <PaginationControls />
        </div>
    );
};

// --- Composant Carte Globale ---
const StatCard = ({ title, value, subValue, icon: Icon }: any) => (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
                {subValue && <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><ArrowUpRight size={12} /> {subValue}</p>}
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <Icon size={24} />
            </div>
        </div>
    </div>
);

// --- Page Principale ---
const MetricsPage = () => {
    const [strategiesData, setStrategiesData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    // 1. Fetching Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(STRATEGIES_DATA_URL);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setStrategiesData(data);
            } catch (error) {
                console.error("Failed to fetch strategies data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // 2. Calcul des Global Stats
    const totals = useMemo(() => {
        if (!strategiesData.length) return { mcap: 0, treasury: 0, inventory: 0, volume: 0 };
        return strategiesData.reduce((acc, curr) => ({
            mcap: acc.mcap + (curr.market_cap_usd || 0),
            treasury: acc.treasury + (curr.treasuryValueUsd || 0),
            inventory: acc.inventory + (curr.inventoryCount || 0),
            volume: acc.volume + (curr.volume24h ? parseFloat(curr.volume24h) : 0)
        }), { mcap: 0, treasury: 0, inventory: 0, volume: 0 });
    }, [strategiesData]);

    // Helper pour calculer le % du total en sécurité
    const getShareOfTotal = (val: number, total: number) => {
        if (!total || total === 0) return '0%';
        const p = (val / total) * 100;
        // Utilise ton fmtPercent existant (attend une string)
        return `${fmtPercent(String(p))}% `;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans ">

            <header className="bg-white dark:bg-gray-900 px-6 py-1 flex justify-between items-center shrink-0 z-50">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Metrics Dashboard</h1>
                    <p className="text-gray-500">Overview of strategy performance and ecosystem health.</p>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md transition-colors">
                    <button
                        
                        onClick={() => navigate("/")}
                        className="p-2 rounded-md transition-colors hover:bg-gray-100 text-gray-500"
                    >
                        <Table size={20} />
                    </button>
                </div>
            </header>
            <div className="p-6 ">
                {/* --- Global Stats Grid --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard
                        title="Cumulative Market Cap"
                        value={fmtUSD(totals.mcap)}
                        icon={Activity}
                    />
                    <StatCard
                        title="Total Treasury Value"
                        value={fmtUSD(totals.treasury, 2)}
                        icon={Wallet}
                    />
                    <StatCard
                        title="24h Tokens Volume"
                        value={fmtUSD(totals.volume, 2)}
                        icon={BarChart3}
                    />
                    <StatCard
                        title="Total Inventory (NFTs)"
                        value={fmtNum(totals.inventory, 0, "standard")}
                        icon={Layers}
                    />
                </div>
                
                {/* --- Widgets Grid --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                    {/* Widget 2: Top Market Cap -> Affiche % du Total */}
                    <RankingWidget
                        title="Highest Market Cap"
                        icon={Coins}
                        data={strategiesData}
                        getValue={(item: any) => item.market_cap_usd}
                        formatValue={(val: number) => fmtUSD(val, 1)}
                        // Fonction dynamique
                        valueLabel={(_: any, val: number) => getShareOfTotal(val, totals.mcap)}
                        color="green"
                    />
                    {/* Widget 1: Top Treasury -> Affiche % du Total */}
                    <RankingWidget
                        title="Top Treasuries"
                        icon={Wallet}
                        data={strategiesData}
                        getValue={(item: any) => item.treasuryValueUsd}
                        formatValue={(val: number) => fmtUSD(val, 2)}
                        // Fonction dynamique
                        valueLabel={(_: any, val: number) => getShareOfTotal(val, totals.treasury)}
                        color="blue"
                    />
                    {/* Widget 3: Best 24h Volume -> Affiche % du Total */}
                    <RankingWidget
                        title="Top Volume (24h)"
                        icon={Activity}
                        data={strategiesData}
                        getValue={(item: any) => parseFloat(item.volume24h || 0)}
                        formatValue={(val: number) => fmtUSD(val, 2)}
                        // Fonction dynamique
                        valueLabel={(_: any, val: number) => getShareOfTotal(val, totals.volume)}
                        color="purple"
                    />
                    {/* 
                    <RankingWidget
                        title="NFT Buys by TW contracts (24h)"
                        icon={Activity}
                        data={strategiesData}
                        getValue={(item: any) => parseFloat(item.stratBuy24h || 0)}
                        formatValue={(val: number) => fmtNum(val)}
                        // Fonction dynamique
                        valueLabel={(item: any) => fmtEth(item.stratBuy24hVol)}
                        color="purple"
                    />
                    */}
                    <div className="bg-white bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col h-full">
                        {/* Header Section */}
                        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                NFT Activity feeds (7d)
                            </h3>
                        </div>

                        {/* List Section */}
                        <div className="p-0 flex-1">
                            <TradeFeed
                                sourceType='global'
                                timeframe='7d'
                                typeFilter='ALL'
                            />
                        </div>

                    </div>
                    {/* Widget 4: Tightest Spreads -> Reste statique "Spread" (car c'est déjà un %) */}
                    <RankingWidget
                        title="Tightest Spreads"
                        icon={Percent}
                        data={strategiesData}
                        getValue={(item: any) => item.marketDepthKPIs?.spreadPercent ?? 100}
                        formatValue={(val: number) => `${fmtPercent(String(val))}%`}
                        sortDirection="asc"
                        valueLabel={(item: any) => fmtEth(item.marketDepthKPIs?.wallVolumeEth)}
                        color="orange"
                    />

                    {/* Widget 5: Top Inventory Size -> Affiche % du Total */}
                    <RankingWidget
                        title="Biggest Inventory"
                        icon={Layers}
                        data={strategiesData}
                        getValue={(item: any) => item.inventoryCount}
                        formatValue={(val: number) => fmtNum(val)}
                        // Fonction dynamique
                        valueLabel={(_: any, val: number) => getShareOfTotal(val, totals.inventory)}
                        color="red"
                    />

                    {/* Widget 6: Top Gainers -> Reste statique "Change" */}
                    <RankingWidget
                        title="Top Gainers (24h)"
                        icon={ArrowUpRight}
                        data={strategiesData}
                        getValue={(item: any) => parseFloat(item.priceChange24h || 0)}
                        formatValue={(val: number) => {
                            const str = fmtPercent(String(Math.abs(val)));
                            return val > 0 ? `+${str}%` : `-${str}%`;
                        }}
                        valueLabel="Change"
                        color="green"
                    />
                    
                    
                </div>
                
            </div>
        </div>
    );
};

export default MetricsPage;