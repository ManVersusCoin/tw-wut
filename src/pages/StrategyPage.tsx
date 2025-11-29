import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import StrategyDetailView from "../components/StrategyDetailsView";

export default function StrategyPage() {
    const { tokenAddress } = useParams();
    const [strategy, setStrategy] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tokenAddress) return;

        fetch(`https://tw-aggregator.wut-tw.workers.dev/details/${tokenAddress}.json`)
            .then((res) => res.json())
            .then(setStrategy)
            .finally(() => setLoading(false));
    }, [tokenAddress]);

    if (loading)
        return <div className="p-10 text-center">Loading strategy...</div>;

    if (!strategy)
        return <div className="p-10 text-center text-red-500">Strategy not found.</div>;

    return (
        <StrategyDetailView
            strategy={strategy}
            ethPrice={strategy.poolDataExt.quote_token_price_usd}
            allStrategies={[]}
            onSwitch={() => { }}
            onBack={() => window.history.back()}
        />
    );
}
