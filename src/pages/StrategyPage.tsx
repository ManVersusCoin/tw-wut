import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import StrategyDetailView from "../components/StrategyDetailsView";

const STRATEGIES_DATA_URL = "https://tw-aggregator.wut-tw.workers.dev/strategies_summary.json";

export default function StrategyPage() {
    const { tokenAddress } = useParams();
    const [strategy, setStrategy] = useState<any | null>(null);
    const [allStrategies, setAllStrategies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tokenAddress) return;

        // Récupération de la stratégie courante
        fetch(`https://tw-aggregator.wut-tw.workers.dev/details/${tokenAddress}.json`)
            .then((res) => res.json())
            .then(setStrategy)
            .finally(() => setLoading(false));

        // Récupération de toutes les stratégies pour le dropdown
        fetch(STRATEGIES_DATA_URL)
            .then((res) => res.json())
            .then(setAllStrategies)
            .catch(console.error);
    }, [tokenAddress]);

    if (loading)
        return <div className="p-10 text-center">Loading strategy...</div>;

    if (!strategy)
        return <div className="p-10 text-center text-red-500">Strategy not found.</div>;

    return (
        <StrategyDetailView
            strategy={strategy}
            ethPrice={strategy.poolDataExt.quote_token_price_usd}
            allStrategies={allStrategies}
            onSwitch={(id) => {
                
                window.location.href = `/strategy/${id}`;
            }}
            onBack={() => window.history.back()}
        />
    );
}
