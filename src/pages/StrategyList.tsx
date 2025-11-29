import type { JSX } from "react";
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    TrendingUp, TrendingDown, Loader2, Flame,
    Filter, Columns, ArrowUpDown, Check,  ChevronRight, ChevronLeft,
    X, Users,
    Search, EyeOff, Eye, PanelLeftClose, PieChart, Info,
    Maximize2,
    Globe, FileText, Anchor, 
} from "lucide-react";
// Assumes you have these components/utils available in your project

import { Tooltip } from "../components/Tooltip";
import { EN_COLUMN_DESCRIPTIONS } from '../utils/enColumnDescriptions';
//import { formatTooltip } from '../utils/tooltipUtils';

// --- 1. CONFIGURATION ---
const STRATEGIES_DATA_URL = "https://tw-aggregator.wut-tw.workers.dev/strategies_summary.json";
const LOCAL_STORAGE_KEY = 'tw_visible_columns'; // Clé de persistence
// --- 2. TYPES ---
type HolderData = { count: number; distribution: Record<string, string>; };

export interface LastUpdate {
    date: string;          // ISO-like timestamp
    timezone_type: number; // Usually 3 for PHP DateTime
    timezone: string;      // "UTC"
}

export type StrategyData = {
    id: string;
    collection: string;
    collectionName: string;
    collectionOsSlug: string | null;
    collectionImage: string;
    tokenName: string;
    tokenSymbol: string;
    tokenAddress: string;
    price_usd: number;
    market_cap_usd: number;
    priceChange24h: number;
    volume24h: number;
    ecoTicker: string;
    ecoPriceUsd: number;
    ecoMarketCapUsd: number;
    ecoTokenAddress: string;
    burnedPercentage: number;
    burnedAmount: number;
    nftSupply: number;
    nftFloorPriceEth: number;
    nftMarketCapUsd: number;
    nftHolders: number;
    stratHolders: number;
    stratHoldersData: HolderData;
    ecoHolders: number;
    ecoHoldersData: HolderData;
    currentBalanceEth: number;
    buyVolume: number;
    saleVolume: number;
    buyCount: number;
    saleCount: number;
    realizedPnLEth: number;
    tradesCount: number;
    inventoryCount: number;
    treasuryValueUsd: number;
    feesStrat: number;
    feesPnkstr: number;
    feesRoyalties: number;
    ecoColRatio: number;
    stratColRatio: number;
    navRatio: number;
    ecoColHolderRatio: number;
    ecoStratHolderRatio: number;
    stratColHolderRatio: number;
    poolData: any;
    marketDepthKPIs: any;
    balanceKPIs: any;
    transactionHistory?: any[];
    listings_local_clean?: any[];
    dataLoaded: boolean;
    isLoading: boolean;
    last_update?: LastUpdate | null;
};

// --- 3. COLUMNS DEFINITION ---
type ColumnId =
    | "strategy" | "price" | "priceChange24h" | "volume24h" | "stratMcap" | "burn" | "stratHolders"
    | "treasury" | "currentBalance" | "buyVolume" | "saleVolume" | "realizedPnL"
    | "feesStrat" | "feesPnkstr" | "feesRoyalties"
    | "nftFloor" | "nftMcap" | "nftHolders"
    | "ecoToken" | "ecoMcap" | "ecoHolders"
    | "ecoColRatio" | "marketDepthKPIs" | "navRatio" | "ecoColHolderRatio" | "ecoStratHolderRatio" | "stratColHolderRatio"
    | "actions";

const COLUMN_DEFS: { id: ColumnId; label: string; align: "left" | "right" | "center"; headerGroup?: string; width?: string }[] = [
    { id: "strategy", label: "Strategy", align: "left" },
    { id: "price", label: "Price", align: "right", headerGroup: "Strategy" },
    { id: "priceChange24h", label: "24h %", align: "right", headerGroup: "Strategy" },
    { id: "volume24h", label: "Vol 24h", align: "right", headerGroup: "Strategy" },
    { id: "stratMcap", label: "Mcap", align: "right", headerGroup: "Strategy" },
    { id: "burn", label: "Burn", align: "right", headerGroup: "Strategy" },
    { id: "stratHolders", label: "Holders", align: "center", headerGroup: "Strategy" },
    { id: "treasury", label: "Treasury", align: "right", headerGroup: "Trades & Holdings" },
    { id: "currentBalance", label: "Balance", align: "right", headerGroup: "Trades & Holdings" },
    { id: "buyVolume", label: "Buy Vol (Ξ)", align: "right", headerGroup: "Trades & Holdings" },
    { id: "saleVolume", label: "Sale Vol (Ξ)", align: "right", headerGroup: "Trades & Holdings" },
    { id: "realizedPnL", label: "Realized P&L", align: "right", headerGroup: "Trades & Holdings" },
    { id: "feesStrat", label: "Strat (8%)", align: "right", headerGroup: "Fees" },
    { id: "feesPnkstr", label: "PNKSTR (1%)", align: "right", headerGroup: "Fees" },
    { id: "feesRoyalties", label: "Royalties (1%)", align: "right", headerGroup: "Fees" },
    { id: "nftFloor", label: "NFT Floor", align: "right", headerGroup: "NFT Collection" },
    { id: "nftMcap", label: "NFT Col Mcap", align: "right", headerGroup: "NFT Collection" },
    { id: "nftHolders", label: "Col Holders", align: "right", headerGroup: "NFT Collection" },
    { id: "ecoToken", label: "Eco Token", align: "center", headerGroup: "Ecosystem Token" },
    { id: "ecoMcap", label: "Eco Mcap", align: "right", headerGroup: "Ecosystem Token" },
    { id: "ecoHolders", label: "Eco Holders", align: "center", headerGroup: "Ecosystem Token" },
    { id: "ecoColRatio", label: "Eco/Col %", align: "right", headerGroup: "KPI / Ratio" },
    { id: "marketDepthKPIs", label: "Dominance/Wall", align: "right", headerGroup: "KPI / Ratio" },
    { id: "navRatio", label: "NAV Ratio", align: "right", headerGroup: "KPI / Ratio" },
    { id: "ecoColHolderRatio", label: "Eco/Col Holders %", align: "right", headerGroup: "KPI / Ratio" },
    { id: "ecoStratHolderRatio", label: "Eco/Strat Holders %", align: "right", headerGroup: "KPI / Ratio" },
    { id: "stratColHolderRatio", label: "Strat/Col Holders %", align: "right", headerGroup: "KPI / Ratio" },
    { id: "actions", label: "", align: "center", width: "50px" }
];

const DEFAULT_VISIBLE_SET = new Set<ColumnId>([
    "strategy", "price", "priceChange24h", "stratMcap", "treasury", "currentBalance", "marketDepthKPIs", "navRatio", "actions"
]);

const GROUP_BG_STYLES: Record<string, string> = {
    "Strategy": "bg-white dark:bg-gray-900",
    "Trades & Holdings": "bg-gray-50 dark:bg-gray-800/40",
    "Fees": "bg-slate-50 dark:bg-slate-900/20",
    "NFT Collection": "bg-zinc-50 dark:bg-zinc-900/20",
    "Ecosystem Token": "bg-stone-50 dark:bg-stone-900/20",
    "KPI / Ratio": "bg-orange-50/30 dark:bg-orange-900/10"
};

// --- UTILS ---
const fmtUSD = (n?: number, decimals: number = 0) => n ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals, notation: "compact" }).format(n) : "-";
const fmtPrice = (n?: number) => n ? "$" + n.toFixed(4) : "-";
const fmtNum = (n?: number) => n ? new Intl.NumberFormat('en-US', { notation: "compact" }).format(n) : "-";
const fmtEth = (n?: number) => n ? `Ξ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : "-";

const getSortValue = (s: StrategyData, key: ColumnId): number | string => {
    switch (key) {
        case "strategy": return s.tokenSymbol;
        case "price": return s.price_usd || 0;
        case "priceChange24h": return s.priceChange24h || 0;
        case "volume24h": return s.volume24h || 0;
        case "stratMcap": return s.market_cap_usd || 0;
        case "burn": return s.burnedPercentage || 0;
        case "stratHolders": return s.stratHolders || 0;
        case "buyVolume": return s.buyVolume || 0;
        case "saleVolume": return s.saleVolume || 0;
        case "realizedPnL": return s.realizedPnLEth || 0;
        case "treasury": return s.treasuryValueUsd || 0;
        case "currentBalance": return s.currentBalanceEth || 0;
        case "feesStrat": return s.feesStrat || 0;
        case "feesPnkstr": return s.feesPnkstr || 0;
        case "feesRoyalties": return s.feesRoyalties || 0;
        case "nftFloor": return s.nftFloorPriceEth || 0;
        case "nftMcap": return s.nftMarketCapUsd || 0;
        case "nftHolders": return s.nftHolders || 0;
        case "ecoToken": return s.ecoTicker || "";
        case "ecoMcap": return s.ecoMarketCapUsd || 0;
        case "ecoHolders": return s.ecoHolders || 0;
        case "marketDepthKPIs": return s.marketDepthKPIs?.dominanceVolumeEth || (0 - s.marketDepthKPIs?.wallVolumeEth) || 0;
        case "ecoColRatio": return s.ecoColRatio || 0;
        case "navRatio": return s.navRatio || 0;
        case "ecoColHolderRatio": return s.ecoColHolderRatio || 0;
        case "ecoStratHolderRatio": return s.ecoStratHolderRatio || 0;
        case "stratColHolderRatio": return s.stratColHolderRatio || 0;
        default: return 0;
    }
};
const getInitialVisibleColumns = (): Set<ColumnId> => {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Vérification de base pour s'assurer que les IDs stockés sont valides
            const validColumns = parsed.filter((id: string) =>
                COLUMN_DEFS.some(def => def.id === id)
            ) as ColumnId[];
            if (validColumns.length > 0) {
                return new Set(validColumns);
            }
        }
    } catch (e) {
        // En cas d'erreur (formatage corrompu), on retourne les valeurs par défaut
        console.error("Error reading columns from localStorage:", e);
    }
    return DEFAULT_VISIBLE_SET;
};
// --- COMPONENTS ---

// Import or define Tooltip component if not already done
// Placeholder for Tooltip integration (Assuming you have it as discussed)

export default function StrategyDashboard(): JSX.Element {
    const [strategies, setStrategies] = useState<StrategyData[]>([]);
    const [globalLoading, setGlobalLoading] = useState<boolean>(true);
    const [statusMessage, setStatusMessage] = useState<string>("Initializing...");
    const [activePanel, setActivePanel] = useState<"strategies" | "columns" | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [visibleStrategyIds, setVisibleStrategyIds] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: ColumnId; direction: "asc" | "desc" } | null>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [selectedStrategyId] = useState<string | null>(null);
    const [selectedHolderDist, setSelectedHolderDist] = useState<{ symbol: string, data: HolderData } | null>(null);
    const hasLoadedInit = useRef(false);
    const navigate = useNavigate();
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(getInitialVisibleColumns());

    useEffect(() => {
        if (hasLoadedInit.current) return;
        hasLoadedInit.current = true;
        const init = async () => {
            try {
                setStatusMessage("Loading Summary Data...");
                const response = await fetch(STRATEGIES_DATA_URL);
                if (!response.ok) throw new Error("Failed to load strategies summary");
                const data: StrategyData[] = await response.json();
                setStrategies(data);
                setVisibleStrategyIds(new Set(data.map(s => s.id)));
                setGlobalLoading(false);
                setStatusMessage("");
            } catch (e) {
                console.error(e);
                setStatusMessage("Error loading data.");
                setGlobalLoading(false);
            }
        };
        init();
    }, []);

    // --- EFFECT POUR LA PERSISTENCE DES COLONNES ---
    useEffect(() => {
        // Sauvegarde la configuration dans le localStorage à chaque changement
        const columnArray = Array.from(visibleColumns);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(columnArray));
    }, [visibleColumns]);

    const toggleStrategy = (id: string) => { const s = new Set(visibleStrategyIds); if (s.has(id)) s.delete(id); else s.add(id); setVisibleStrategyIds(s); };
    const toggleColumn = (id: ColumnId) => { const s = new Set(visibleColumns); if (s.has(id)) s.delete(id); else s.add(id); setVisibleColumns(s); };
    const toggleGroup = (ids: ColumnId[]) => { const s = new Set(visibleColumns); const all = ids.every(id => s.has(id)); ids.forEach(id => all ? s.delete(id) : s.add(id)); setVisibleColumns(s); };

    const handleSort = (key: ColumnId) => {
        let direction: "asc" | "desc" = "desc";
        if (sortConfig?.key === key && sortConfig.direction === "desc") direction = "asc";
        setSortConfig({ key, direction });
    };

    const scrollTable = (direction: "left" | "right") => {
        if (tableContainerRef.current) {
            const scrollAmount = 300;
            tableContainerRef.current.scrollBy({ left: direction === "right" ? scrollAmount : -scrollAmount, behavior: "smooth" });
        }
    };

    const handleHideStrategy = (e: React.MouseEvent, stratId: string) => { e.stopPropagation(); toggleStrategy(stratId); };
    const selectedStrategy = useMemo(() => selectedStrategyId ? strategies.find(s => s.id === selectedStrategyId) : null, [selectedStrategyId, strategies]);

    if (globalLoading) return <div className="w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 h-screen"><Loader2 className="animate-spin w-10 h-10 text-blue-600" /></div>;

    // Placeholder for Detail View Navigation
    if (selectedStrategy) {
        // Navigate or render details here. 
        // For this snippet, assuming navigation happens or render Detail Component.
        // return <StrategyDetailView ... /> 
    }

    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 font-sans z-10">
            <ScrollbarStyles />
            <HolderDistributionModal isOpen={!!selectedHolderDist} onClose={() => setSelectedHolderDist(null)} tokenSymbol={selectedHolderDist?.symbol || ""} data={selectedHolderDist?.data} />
            <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-between items-center shrink-0 z-50">

                {/* LEFT SIDE */}
                <div className="flex items-center gap-4">
                    <div>
                        
                        {/* Status message */}
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 h-5">
                            {statusMessage ? (
                                <>
                                    <Loader2 size={12} className="animate-spin text-blue-500" />
                                    {statusMessage}
                                </>
                            ) : (
                                `${strategies.filter(s => visibleStrategyIds.has(s.id)).length} active strategies`
                            )}
                        </div>

                        {/* Last update */}
                        <div className="text-xs text-gray-400 mt-1 h-5">
                            {(() => {
                                const raw = strategies?.[0]?.last_update?.date;
                                if (!raw) return null;

                                const d = new Date(raw);
                                if (isNaN(d.getTime())) return null;

                                return `Updated on ${d.toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                })}`;
                            })()}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowInfoModal(true)}
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600 transition-colors"
                    >
                        <Info size={20} />
                    </button>

                    <button
                        id="btn-strategies"
                        onClick={() => setActivePanel(activePanel === "strategies" ? null : "strategies")}
                        className={`p-2 rounded-md transition-colors ${activePanel === "strategies"
                                ? "bg-blue-100 text-blue-600"
                                : "hover:bg-gray-100 text-gray-500"
                            }`}
                    >
                        <Filter size={20} />
                    </button>

                    <button
                        id="btn-columns"
                        onClick={() => setActivePanel(activePanel === "columns" ? null : "columns")}
                        className={`p-2 rounded-md transition-colors ${activePanel === "columns"
                                ? "bg-purple-100 text-purple-600"
                                : "hover:bg-gray-100 text-gray-500"
                            }`}
                    >
                        <Eye size={20} />
                    </button>
                </div>
            </header>


            <div className="relative flex-1 flex flex-col overflow-hidden">
                {activePanel && <RightPanel mode={activePanel} onClose={() => setActivePanel(null)} strategies={strategies} visibleStrategyIds={visibleStrategyIds} toggleStrategy={toggleStrategy} visibleColumns={visibleColumns} toggleColumn={toggleColumn} toggleGroup={toggleGroup} />}
                <div ref={tableContainerRef} className="flex-1 w-full overflow-auto no-scrollbar bg-white dark:bg-gray-900">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-gray-800/95 text-xs uppercase text-gray-500 tracking-wider z-30 sticky top-0 shadow-sm backdrop-blur-sm">
                            <tr>
                                {(() => {
                                    const visibleDefs = COLUMN_DEFS.filter(c => visibleColumns.has(c.id));
                                    const headerGroups: { name: string | undefined, colSpan: number, cols: typeof COLUMN_DEFS }[] = [];
                                    visibleDefs.forEach(col => {
                                        const last = headerGroups[headerGroups.length - 1];
                                        if (last && last.name === col.headerGroup) { last.colSpan++; last.cols.push(col); }
                                        else { headerGroups.push({ name: col.headerGroup, colSpan: 1, cols: [col] }); }
                                    });
                                    return headerGroups.map((g, i) => (
                                        <th key={i} colSpan={g.colSpan} className={`px-4 py-2 border-b border-r border-gray-200 dark:border-gray-700/50 text-center font-bold text-gray-600 dark:text-gray-300 ${g.name && GROUP_BG_STYLES[g.name] ? GROUP_BG_STYLES[g.name] : "bg-gray-50 dark:bg-gray-900"} ${g.cols[0].id === "strategy" ? "sticky left-0 z-40 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)] min-w-[280px]" : ""} ${g.cols[0].id === 'actions' ? 'sticky right-0 z-40' : ''}`}>
                                            {g.name || (g.cols[0].id === "strategy" ? "Strategy" : "")}
                                            {g.cols[0].id === "actions" && (
                                                <div className="flex justify-center gap-1 mt-1 ">
                                                    <button onClick={() => scrollTable("left")} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><ChevronLeft size={20} /></button>
                                                    <button onClick={() => scrollTable("right")} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><ChevronRight size={20} /></button>
                                                </div>
                                            )}
                                        </th>
                                    ));
                                })()}
                            </tr>
                            <tr>
                                {COLUMN_DEFS.filter(c => visibleColumns.has(c.id)).map((col) => {
                                    if (!col.headerGroup && col.id !== 'actions' && col.id !== 'strategy') return null; // Logic check: only mapped rows or explicit handling
                                    // Actually, we iterate all visible columns here.

                                    const bgClass = GROUP_BG_STYLES[col.headerGroup || ''] || "bg-gray-50 dark:bg-gray-900";
                                    // Align header content same as body content
                                    const justifyClass = col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start";

                                    return (
                                        <th
                                            key={col.id}
                                            onClick={() => col.id !== "actions" && handleSort(col.id)}
                                            className={`px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700/50 group/th relative ${bgClass} ${col.id === 'strategy' ? 'sticky left-0 z-40 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)]' : ''} ${col.id === 'actions' ? 'sticky right-0 z-40 border-l border-gray-200 dark:border-gray-700' : ''}`}
                                        >
                                            <Tooltip
                                                content={EN_COLUMN_DESCRIPTIONS[col.id]?.header}
                                                className='w-full h-full block'
                                                side="top" // Preference
                                                contentClassName='text-center' // Only styling classes, NO positioning classes
                                            >
                                                <div className={`flex items-center gap-1.5 ${justifyClass} text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide h-full`}>
                                                    {col.label}
                                                    {sortConfig?.key === col.id && (
                                                        <ArrowUpDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                    )}
                                                </div>
                                            </Tooltip>

                                            {/* Hide column button - cleaner positioning */}
                                            {col.id !== "actions" && col.id !== "strategy" && (
                                                <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/th:opacity-100 transition-opacity">
                                                    <button
                                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500"
                                                        onClick={(e) => { e.stopPropagation(); toggleColumn(col.id); }}
                                                        title="Hide Column"
                                                    >
                                                        <EyeOff size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                            {strategies.filter(s => visibleStrategyIds.has(s.id)).sort((a, b) => {
                                if (!sortConfig) return 0;
                                const valA = getSortValue(a, sortConfig.key);
                                const valB = getSortValue(b, sortConfig.key);
                                if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
                                if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
                                return 0;
                            }).map(s => (
                                <tr key={s.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors group">
                                    {COLUMN_DEFS.filter(c => visibleColumns.has(c.id)).map(col => {
                                        const bgClass = col.headerGroup ? GROUP_BG_STYLES[col.headerGroup] : "";

                                        // SPECIAL COLUMN: STRATEGY IDENTITY
                                        if (col.id === "strategy") return (
                                            <td key={col.id} className="px-4 py-3 bg-white dark:bg-gray-900 sticky left-0 z-20 group-hover:bg-blue-50/50 dark:group-hover:bg-gray-900 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-gray-100 dark:border-gray-800 min-w-[280px]">
                                                <div className="flex items-center gap-4 relative">
                                                    <div className="relative">
                                                        <img src={s.collectionImage} className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 object-cover shadow-sm group-hover:scale-105 transition-transform duration-200" />
                                                        {/* Optional status indicator dot if needed */}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{s.tokenName}
                                                            <span className="p-2 ml-6 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{s.tokenSymbol}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                            <a href={`https://nftstrategy.fun/strategies/${s.tokenAddress}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors" title="Strategy Page"><Globe size={14} /></a>
                                                            <a href={`https://etherscan.io/address/${s.tokenAddress}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-orange-500 transition-colors" title="Contract"><FileText size={14} /></a>
                                                            {s.collectionOsSlug && <a href={`https://opensea.io/collection/${s.collectionOsSlug}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors" title="OpenSea"><Anchor size={14} /></a>}
                                                        </div>
                                                    </div>
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => handleHideStrategy(e, s.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-red-500" title="Hide Strategy"><EyeOff size={16} /></button>
                                                    </div>
                                                </div>
                                            </td>
                                        );

                                        // SPECIAL COLUMN: ACTIONS
                                        if (col.id === "actions")
                                            return (
                                                <td key={col.id} className="px-4 py-3 text-center sticky right-0 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 z-20 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/20">
                                                    <button
                                                        onClick={() => navigate(`/strategy/${s.tokenAddress}`)}
                                                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                                                        title="Maximize Details"
                                                    >
                                                        <Maximize2 size={18} />
                                                    </button>
                                                </td>
                                            );

                                        // STANDARD DATA COLUMNS
                                        const justifyClass = col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start";
                                        //const cellData = { price_usd: s.price_usd }; // Add more data context here for tooltip parsing
                                        //const tooltipContent = formatTooltip(EN_COLUMN_DESCRIPTIONS[col.id]?.cell, cellData);

                                        return (
                                            <td key={col.id} className={`px-4 py-3 text-sm ${bgClass}`}>
                                                <div className={`flex items-center ${justifyClass} h-full w-full`}>
                                                    {/*<Tooltip
                                                        content={tooltipContent}
                                                        className="block w-full"
                                                        side={col.align === 'right' ? 'left' : 'top'}
                                                        // Remove 'right-full', 'top-1/2', etc. Just keep styling if needed or leave empty.
                                                        contentClassName=""
                                                    >*/}
                                                        {col.id === "price" && <div className="font-semibold text-gray-900 dark:text-gray-100 font-mono">{fmtPrice(s.price_usd)}</div>}

                                                        {col.id === "priceChange24h" && (
                                                            s.priceChange24h !== undefined ? (
                                                                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md border w-fit ml-auto ${s.priceChange24h >= 0 ? "text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400" : "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"}`}>
                                                                    {s.priceChange24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                                    {Math.abs(s.priceChange24h).toFixed(2)}%
                                                                </div>
                                                            ) : <span className="text-gray-400">-</span>
                                                        )}

                                                        {col.id === "volume24h" && (s.volume24h ? <div className="text-gray-600 dark:text-gray-400 font-mono text-xs">{fmtUSD(s.volume24h)}</div> : <span className="text-gray-400">-</span>)}
                                                        {col.id === "stratMcap" && <div className="font-mono text-gray-700 dark:text-gray-300">{fmtUSD(s.market_cap_usd, 2)}</div>}

                                                        {col.id === "stratHolders" && (
                                                            <div
                                                                onClick={() => s.stratHoldersData && setSelectedHolderDist({ symbol: s.tokenSymbol, data: s.stratHoldersData })}
                                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${s.stratHoldersData ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40" : "text-gray-400"}`}
                                                            >
                                                                <Users size={12} /> {fmtNum(s.stratHolders)}
                                                            </div>
                                                        )}

                                                        {col.id === "burn" && (
                                                            <div className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-1 rounded-full w-fit ml-auto">
                                                                <Flame size={12} />{s.burnedPercentage?.toFixed(1)}%
                                                            </div>
                                                        )}

                                                        {/* Volume & Count Columns */}
                                                        {(col.id === "buyVolume" || col.id === "saleVolume") && (
                                                            <div className="flex flex-col items-end">
                                                                <div className={`font-bold font-mono ${col.id === "buyVolume" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                                    {fmtEth(s[col.id])}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 font-medium">
                                                                    {col.id === "buyVolume" ? s.buyCount : s.saleCount} txns
                                                                </div>
                                                            </div>
                                                        )}

                                                        {col.id === "realizedPnL" && (
                                                            <div className={`font-bold font-mono ${s.realizedPnLEth > 0 ? "text-emerald-600 dark:text-emerald-400" : s.realizedPnLEth < 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-500"}`}>
                                                                {s.realizedPnLEth > 0 ? "+" : ""}{fmtEth(s.realizedPnLEth)}
                                                            </div>
                                                        )}

                                                        {col.id === "treasury" && (
                                                            <div className="flex flex-col items-end">
                                                                <div className="font-bold text-blue-700 dark:text-blue-400 font-mono">{fmtUSD(s.treasuryValueUsd)}</div>
                                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                                    {s.inventoryCount || 0} NFTs
                                                                </div>
                                                            </div>
                                                        )}

                                                        {col.id === "currentBalance" && (
                                                            <div className="flex flex-col items-end">
                                                                <div className="font-bold text-amber-600 dark:text-amber-400 font-mono">{fmtEth(s.currentBalanceEth)}</div>
                                                                <div className="w-16 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                                                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, s.balanceKPIs?.completionPercent || 0)}%` }}></div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {col.id === "marketDepthKPIs" && (
                                                            <div className="flex flex-col items-end">
                                                                <div className={`font-bold font-mono ${s.marketDepthKPIs?.isLeading ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                                    {s.marketDepthKPIs?.isLeading ? fmtEth(s.marketDepthKPIs?.dominanceVolumeEth) : fmtEth(s.marketDepthKPIs?.wallVolumeEth)}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                                    {s.marketDepthKPIs?.isLeading ? "Dominance" : "Wall"} ({s.marketDepthKPIs?.isLeading ? s.marketDepthKPIs?.dominanceCount : s.marketDepthKPIs?.wallCount} items)
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(col.id === "feesStrat" || col.id === "feesPnkstr" || col.id === "feesRoyalties") && (
                                                            <span className="text-gray-600 dark:text-gray-300 font-mono text-xs">{fmtEth(s[col.id])}</span>
                                                        )}

                                                        {col.id === "nftFloor" && <span className="font-mono font-medium">{s.nftFloorPriceEth ? `Ξ${s.nftFloorPriceEth.toFixed(2)}` : "-"}</span>}
                                                        {col.id === "nftMcap" && <span className="text-gray-600 dark:text-gray-400 text-xs">{fmtUSD(s.nftMarketCapUsd)}</span>}
                                                        {col.id === "nftHolders" && <span className="text-gray-600 dark:text-gray-400 text-xs">{fmtNum(s.nftHolders)}</span>}

                                                        {col.id === "ecoToken" && (
                                                            <div className="flex flex-col items-center">
                                                                <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{s.ecoTicker}</span>
                                                                {s.ecoPriceUsd ? <span className="text-[10px] text-gray-500 mt-0.5 font-mono">${s.ecoPriceUsd.toFixed(4)}</span> : null}
                                                            </div>
                                                        )}
                                                        {col.id === "ecoMcap" && <span className="text-gray-600 dark:text-gray-400 text-xs">{fmtUSD(s.ecoMarketCapUsd)}</span>}
                                                        {col.id === "ecoHolders" && (
                                                            <div
                                                                onClick={() => s.ecoHoldersData && setSelectedHolderDist({ symbol: s.ecoTicker || "", data: s.ecoHoldersData })}
                                                                className={`flex items-center justify-center gap-1 text-xs cursor-pointer hover:text-blue-500 ${s.ecoHoldersData ? "text-gray-600 dark:text-gray-400 underline decoration-dotted" : "text-gray-400"}`}
                                                            >
                                                                {s.ecoHolders ? fmtNum(s.ecoHolders) : "-"}
                                                            </div>
                                                        )}

                                                        {col.id === "ecoColRatio" && (s.ecoColRatio ? <span className="font-bold text-amber-600 dark:text-amber-500">{s.ecoColRatio.toFixed(0)}%</span> : "-")}

                                                        {col.id === "navRatio" && (
                                                            s.navRatio ? (
                                                                <span className={`font-bold px-2 py-0.5 rounded text-xs ${s.navRatio < 1 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                                                                    {s.navRatio.toFixed(2)}x
                                                                </span>
                                                            ) : "-"
                                                        )}

                                                        {(col.id === "ecoColHolderRatio" || col.id === "ecoStratHolderRatio" || col.id === "stratColHolderRatio") && (
                                                            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                                                                {s[col.id] ? `${s[col.id].toFixed(1)}%` : "-"}
                                                            </span>
                                                        )}
                                                    {/*</Tooltip>*/}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Utility components (RightPanel, InfoModal, etc.) remain largely the same, 
// just ensure they use similar Tailwind classes for consistency.
function HolderDistributionModal({ isOpen, onClose, tokenSymbol, data }: { isOpen: boolean; onClose: () => void; tokenSymbol: string; data: HolderData | undefined }) {
    if (!isOpen || !data) return null;
    const rows = Object.entries(data.distribution).map(([key, val]) => ({ label: key.replace(/_/g, " "), val: parseFloat(val) })).sort((a, b) => b.val - a.val);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-gray-200 dark:border-gray-800 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white"><PieChart size={16} /> Holders: {tokenSymbol}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={16} /></button>
                </div>
                <div className="p-5">
                    <div className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{fmtNum(data.count)} <span className="text-sm font-normal text-gray-500">holders</span></div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {rows.map((r, i) => (
                                <tr key={i}>
                                    <td className="py-2 capitalize text-gray-600 dark:text-gray-300">{r.label}</td>
                                    <td className="py-2 text-right font-bold text-gray-900 dark:text-white">{r.val.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const ScrollbarStyles = () => (
    <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none !important; width: 0px !important; height: 0px !important; background: transparent !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
    `}} />
);

function InfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white"><Info size={24} className="text-blue-600" /> Dashboard Docs</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 custom-scrollbar text-gray-700 dark:text-gray-300 space-y-4 text-sm">
                    <p>Monitor real-time metrics for TokenWorks Strategies.</p>
                </div>
            </div>
        </div>
    );
}

function RightPanel({
    mode, onClose, strategies, visibleStrategyIds, toggleStrategy,
    visibleColumns, toggleColumn, toggleGroup
}: {
    mode: "strategies" | "columns" | null;
    onClose: () => void;
    strategies: StrategyData[];
    visibleStrategyIds: Set<string>;
    toggleStrategy: (id: string) => void;
    visibleColumns: Set<ColumnId>;
    toggleColumn: (id: ColumnId) => void;
    toggleGroup: (ids: ColumnId[]) => void;
}) {
    const sidebarRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (target.closest("#btn-strategies") || target.closest("#btn-columns")) return;
            if (mode && sidebarRef.current && !sidebarRef.current.contains(target as Node)) onClose();
        }
        if (mode) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [mode, onClose]);

    const [searchTerm, setSearchTerm] = useState("");
    const groupedCols = useMemo(() => {
        const groups: Record<string, typeof COLUMN_DEFS> = { "General": [] };
        COLUMN_DEFS.forEach(col => {
            if (col.id === "actions") return;
            const g = col.headerGroup || "General";
            if (!groups[g]) groups[g] = [];
            groups[g].push(col);
        });
        return groups;
    }, []);
    const filteredStrategies = strategies.filter(s => s.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase()) || s.collectionName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <aside ref={sidebarRef} className={`absolute top-0 right-0 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl z-[90] transition-transform duration-300 ease-in-out w-72 ${mode ? "translate-x-0" : "translate-x-full"}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                    {mode === "strategies" ? <Filter className="text-blue-600" size={18} /> : <Columns className="text-purple-600" size={18} />}
                    <h2 className="font-bold text-gray-900 dark:text-white text-sm">{mode === "strategies" ? "Filter Strategies" : "Data Columns"}</h2>
                </div>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md"><PanelLeftClose className="rotate-180" size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                {mode === "strategies" && (
                    <div>
                        <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Visibility Control</h3><button onClick={() => visibleStrategyIds.size === strategies.length ? strategies.forEach(s => toggleStrategy(s.id)) : strategies.forEach(s => { if (!visibleStrategyIds.has(s.id)) toggleStrategy(s.id) })} className="text-[10px] text-blue-500 hover:underline">{visibleStrategyIds.size === strategies.length ? "Unselect All" : "Select All"}</button></div>
                        <div className="relative mb-2"><Search size={14} className="absolute left-2 top-2 text-gray-400" /><input type="text" placeholder="Search..." className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                        <div className="space-y-1 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                            {filteredStrategies.map(s => (<div key={s.id} onClick={() => toggleStrategy(s.id)} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm ${visibleStrategyIds.has(s.id) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"}`}><div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${visibleStrategyIds.has(s.id) ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600"}`}>{visibleStrategyIds.has(s.id) && <Check size={10} className="text-white" />}</div><img src={s.collectionImage} className="w-5 h-5 rounded-full object-cover" alt="" /><span className="truncate">{s.tokenSymbol}</span></div>))}
                        </div>
                    </div>
                )}
                {mode === "columns" && (
                    <div>
                        <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Configure Grid</h3></div>
                        <div className="space-y-4">
                            {Object.entries(groupedCols).map(([group, cols]) => (
                                <div key={group}>
                                    <div className="flex items-center justify-between mb-1 group cursor-pointer" onClick={() => toggleGroup(cols.map(c => c.id))}><span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600">{group}</span><div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${cols.every(c => visibleColumns.has(c.id)) ? "bg-blue-600 border-blue-600" : cols.some(c => visibleColumns.has(c.id)) ? "bg-blue-300 border-blue-300" : "border-gray-300 dark:border-gray-600"}`}>{cols.every(c => visibleColumns.has(c.id)) && <Check size={8} className="text-white" />}</div></div>
                                    <div className="pl-2 border-l-2 border-gray-100 dark:border-gray-800 space-y-0.5">
                                        {cols.map(col => (<div key={col.id} onClick={() => toggleColumn(col.id)} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs ${visibleColumns.has(col.id) ? "text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800/50" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>{visibleColumns.has(col.id) ? <Eye size={12} className="text-blue-500" /> : <EyeOff size={12} />}<span>{col.label}</span></div>))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}