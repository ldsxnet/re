import { useState, useEffect, useCallback } from "react";
import { calcCost, fmtCost } from "../lib/modelPricing";

interface ModelStat {
  calls: number;
  promptTokens: number;
  completionTokens: number;
}

interface CacheStats {
  enabled: boolean;
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxEntries: number;
  ttlMs: number;
}

interface StatsResponse {
  modelStats: Record<string, ModelStat>;
  uptimeSeconds: number;
  cacheStats?: CacheStats;
}

function fmtUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const PROVIDER_COLOR: Record<string, string> = {
  "claude": "#fb923c",
  "gpt": "#60a5fa",
  "o3": "#60a5fa",
  "o4": "#60a5fa",
  "gemini": "#34d399",
  "x-ai": "#a78bfa",
  "meta": "#a78bfa",
  "deepseek": "#a78bfa",
  "mistral": "#a78bfa",
  "qwen": "#a78bfa",
  "google": "#34d399",
  "anthropic": "#fb923c",
  "cohere": "#a78bfa",
  "amazon": "#a78bfa",
  "baidu": "#a78bfa",
};

function modelColor(model: string): string {
  for (const [prefix, color] of Object.entries(PROVIDER_COLOR)) {
    if (model.startsWith(prefix)) return color;
  }
  return "#94a3b8";
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  padding: "14px 16px",
  textAlign: "center",
};

const metricValue: React.CSSProperties = {
  fontSize: "22px", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em",
};

const metricLabel: React.CSSProperties = {
  fontSize: "11px", color: "#64748b", marginTop: "4px",
};

export default function PageStats({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [cacheOp, setCacheOp] = useState(false);
  const [editTtl, setEditTtl] = useState<string>("");
  const [editMaxEntries, setEditMaxEntries] = useState<string>("");
  const [showCacheSettings, setShowCacheSettings] = useState(false);

  const loadStats = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/stats`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as StatsResponse;
      setStats(data);
      if (data.cacheStats) {
        setEditTtl(String(Math.round(data.cacheStats.ttlMs / 60000)));
        setEditMaxEntries(String(data.cacheStats.maxEntries));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, apiKey]);

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, 15000);
    return () => clearInterval(id);
  }, [loadStats]);

  const handleReset = async () => {
    if (!apiKey || !window.confirm("确定要重置所有用量统计吗？此操作不可撤销。")) return;
    setResetting(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/stats/reset`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handleCacheClear = async () => {
    if (!apiKey || !window.confirm("清空响应缓存？")) return;
    setCacheOp(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/cache/clear`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setCacheOp(false);
    }
  };

  const handleCacheToggle = async () => {
    if (!apiKey || !stats?.cacheStats) return;
    setCacheOp(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/cache`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !stats.cacheStats.enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setCacheOp(false);
    }
  };

  const handleCacheApply = async () => {
    if (!apiKey) return;
    const ttlMins = parseInt(editTtl, 10);
    const maxEnts = parseInt(editMaxEntries, 10);
    if (isNaN(ttlMins) || ttlMins < 1 || isNaN(maxEnts) || maxEnts < 1) {
      alert("TTL 须≥1分钟，最大条目数须≥1");
      return;
    }
    setCacheOp(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/cache`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttlMs: ttlMins * 60000, maxEntries: maxEnts }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowCacheSettings(false);
      await loadStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setCacheOp(false);
    }
  };

  if (!apiKey) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>&#128274;</div>
        <div style={{ fontSize: "15px" }}>请先在首页输入 Proxy Key</div>
      </div>
    );
  }

  if (loading && !stats) {
    return <div style={{ textAlign: "center", padding: "40px", color: "#64748b", fontSize: "14px" }}>加载中...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ color: "#ef4444", fontSize: "14px", marginBottom: "12px" }}>加载失败: {error}</div>
        <button onClick={loadStats} style={{
          padding: "6px 16px", borderRadius: "6px",
          background: "rgba(99,102,241,0.2)", color: "#a5b4fc",
          border: "1px solid rgba(99,102,241,0.3)", cursor: "pointer", fontSize: "13px",
        }}>重试</button>
      </div>
    );
  }

  const modelStats = stats?.modelStats ?? {};
  const sortedModels = Object.entries(modelStats).sort((a, b) => b[1].calls - a[1].calls);
  const totalCalls = sortedModels.reduce((s, [, v]) => s + v.calls, 0);
  const totalPrompt = sortedModels.reduce((s, [, v]) => s + v.promptTokens, 0);
  const totalCompletion = sortedModels.reduce((s, [, v]) => s + v.completionTokens, 0);
  const cs = stats?.cacheStats;

  const totalCost = sortedModels.reduce((s, [model, v]) => {
    const c = calcCost(model, v.promptTokens, v.completionTokens);
    return c !== null ? s + c : s;
  }, 0);
  const hasAnyCost = sortedModels.some(([model, v]) =>
    calcCost(model, v.promptTokens, v.completionTokens) !== null
  );

  const btnBase: React.CSSProperties = {
    fontSize: "11px", padding: "4px 12px", borderRadius: "6px",
    border: "1px solid rgba(99,102,241,0.25)", cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ fontSize: "12px", color: "#64748b" }}>
          {stats && `运行时间: ${fmtUptime(stats.uptimeSeconds)}`}
          {loading && " · 刷新中..."}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={loadStats} disabled={loading} style={{
            ...btnBase, background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
            opacity: loading ? 0.6 : 1,
          }}>刷新</button>
          <button onClick={handleReset} disabled={resetting} style={{
            ...btnBase, background: "rgba(239,68,68,0.1)", color: "#f87171",
            border: "1px solid rgba(239,68,68,0.2)",
            opacity: resetting ? 0.6 : 1,
          }}>重置统计</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "总请求", value: fmtNum(totalCalls) },
          { label: "输入 Token", value: fmtNum(totalPrompt) },
          { label: "输出 Token", value: fmtNum(totalCompletion) },
          {
            label: "估算费用 (USD)",
            value: hasAnyCost ? fmtCost(totalCost) : "—",
            highlight: hasAnyCost,
          },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={cardStyle}>
            <div style={{
              ...metricValue,
              color: highlight ? "#fbbf24" : "#e2e8f0",
            }}>{value}</div>
            <div style={metricLabel}>{label}</div>
          </div>
        ))}
      </div>

      {cs && (
        <div style={{
          background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px", padding: "14px 16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>响应缓存</span>
              <span style={{
                fontSize: "10px", padding: "2px 7px", borderRadius: "99px",
                background: cs.enabled ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.12)",
                color: cs.enabled ? "#34d399" : "#f87171",
                border: `1px solid ${cs.enabled ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.25)"}`,
                fontWeight: 600,
              }}>
                {cs.enabled ? "已启用" : "已禁用"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => setShowCacheSettings(v => !v)} disabled={cacheOp} style={{
                ...btnBase, background: "rgba(99,102,241,0.12)", color: "#a5b4fc",
                opacity: cacheOp ? 0.6 : 1,
              }}>设置</button>
              <button onClick={handleCacheToggle} disabled={cacheOp} style={{
                ...btnBase,
                background: cs.enabled ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)",
                color: cs.enabled ? "#f87171" : "#34d399",
                border: `1px solid ${cs.enabled ? "rgba(239,68,68,0.2)" : "rgba(52,211,153,0.2)"}`,
                opacity: cacheOp ? 0.6 : 1,
              }}>{cs.enabled ? "禁用" : "启用"}</button>
              <button onClick={handleCacheClear} disabled={cacheOp} style={{
                ...btnBase, background: "rgba(239,68,68,0.07)", color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.08)",
                opacity: cacheOp ? 0.6 : 1,
              }}>清空</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {[
              { label: "命中率", value: `${(cs.hitRate * 100).toFixed(1)}%` },
              { label: "命中次数", value: fmtNum(cs.hits) },
              { label: "未命中", value: fmtNum(cs.misses) },
              { label: `条目 / ${fmtNum(cs.maxEntries)}`, value: fmtNum(cs.size) },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em" }}>{value}</div>
                <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "3px" }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "8px", fontSize: "10.5px", color: "#475569", textAlign: "right" }}>
            TTL: {Math.round(cs.ttlMs / 60000)} 分钟
          </div>

          {showCacheSettings && (
            <div style={{
              marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "12px", display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "10.5px", color: "#64748b" }}>TTL (分钟)</label>
                <input
                  type="number" min={1} value={editTtl}
                  onChange={e => setEditTtl(e.target.value)}
                  style={{
                    width: "80px", padding: "4px 8px", borderRadius: "6px",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "#e2e8f0", fontSize: "12px",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "10.5px", color: "#64748b" }}>最大条目数</label>
                <input
                  type="number" min={1} value={editMaxEntries}
                  onChange={e => setEditMaxEntries(e.target.value)}
                  style={{
                    width: "90px", padding: "4px 8px", borderRadius: "6px",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "#e2e8f0", fontSize: "12px",
                  }}
                />
              </div>
              <button onClick={handleCacheApply} disabled={cacheOp} style={{
                ...btnBase, padding: "6px 14px",
                background: "rgba(99,102,241,0.2)", color: "#a5b4fc",
                opacity: cacheOp ? 0.6 : 1,
              }}>应用</button>
            </div>
          )}
        </div>
      )}

      {sortedModels.length === 0 ? (
        <div style={{
          background: "rgba(0,0,0,0.3)", borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "40px 20px", textAlign: "center", color: "#475569", fontSize: "13px",
        }}>
          暂无统计数据，发起 API 请求后此处将显示按模型汇总的用量。
        </div>
      ) : (
        <div style={{
          background: "rgba(0,0,0,0.3)", borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["模型", "请求数", "输入 Token", "输出 Token", "合计 Token", "估算费用 (USD)"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left",
                    fontSize: "10.5px", fontWeight: 600,
                    color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedModels.map(([model, s]) => {
                const cost = calcCost(model, s.promptTokens, s.completionTokens);
                return (
                  <tr key={model} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "9px 14px" }}>
                      <span style={{
                        color: modelColor(model), fontFamily: "monospace",
                        fontSize: "12px", fontWeight: 500,
                      }}>{model}</span>
                    </td>
                    <td style={{ padding: "9px 14px", color: "#cbd5e1" }}>{fmtNum(s.calls)}</td>
                    <td style={{ padding: "9px 14px", color: "#94a3b8" }}>{fmtNum(s.promptTokens)}</td>
                    <td style={{ padding: "9px 14px", color: "#94a3b8" }}>{fmtNum(s.completionTokens)}</td>
                    <td style={{ padding: "9px 14px", color: "#64748b" }}>{fmtNum(s.promptTokens + s.completionTokens)}</td>
                    <td style={{ padding: "9px 14px", color: cost !== null ? "#fbbf24" : "#334155", fontVariantNumeric: "tabular-nums" }}>
                      {cost !== null ? fmtCost(cost) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
