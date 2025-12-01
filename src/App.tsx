import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";

import StrategyList from "./pages/StrategyList";
import StrategyPage from "./pages/StrategyPage";
import MetricsPage from "./pages/MetricsPage";
import "./index.css";

export default function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<StrategyList />} />
                    <Route path="/strategy/:tokenAddress" element={<StrategyPage />} />
                    <Route path="/metrics" element={<MetricsPage />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}
