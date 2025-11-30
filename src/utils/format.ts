// --- UTILS ---
type IntlNotation = "standard" | "scientific" | "engineering" | "compact";
export const padAddress = (addr: string) => "0x" + addr.replace("0x", "").padStart(64, "0").toLowerCase();
export const decodeHexInt = (hex: string): number => { try { return parseInt(hex, 16); } catch (e) { console.error("decodeHexPrice error:", e); return 0; } };
export const decodeHexPrice = (hex: string): number => { try { return Number(BigInt(hex)) / 1e18; } catch (e) { console.error("decodeHexPrice error:", e); return 0; } };
export const decodeLogData = (data: string) => { const c = data.startsWith("0x") ? data.slice(2) : data; return (c.match(/.{1,64}/g) || []).map(x => "0x" + x); };
export const fmtUSD = (n?: number, decimals: number = 0, notation: IntlNotation = "compact") => n ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals, notation: notation }).format(n) : "-";
export const fmtPrice = (n?: number) => n ? "$" + n.toFixed(4) : "-";
export const fmtNum = (n?: number, decimals: number = 0, notation: IntlNotation = "compact") => n ? new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals, notation: notation }).format(n) : "-";
export const fmtEth = (n?: number, decimals: number = 3) => n ? `Ξ${n.toLocaleString('en-US', { maximumFractionDigits: decimals })}` : "-";
export const fmtPercent = (p: string) => parseFloat(p).toFixed(2);
export const fmtToken = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });