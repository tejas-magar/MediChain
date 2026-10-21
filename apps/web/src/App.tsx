import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Server,
  Layers,
  Code2,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Terminal,
} from 'lucide-react';

interface HealthData {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
  uptime: number;
}

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthData = await res.json();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backend offline');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">MediLedger</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Phase 0: Scaffold
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Monorepo Ready
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
              Privacy-Conscious Medical Verification Platform
            </h1>
            <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-6">
              Phase 0 repository scaffolding complete. Built on a modular npm workspaces monorepo
              with strict TypeScript checks, Express API backend, React + Vite frontend, and Hardhat
              contracts workspace.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" /> React 18 + Vite
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
                <Server className="w-3.5 h-3.5 text-blue-400" /> Express + TypeScript
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
                <Cpu className="w-3.5 h-3.5 text-amber-400" /> Hardhat Contracts
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Strict TypeScript
              </span>
            </div>
          </div>
        </div>

        {/* Live Backend Health Monitor */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Backend Health Status</h2>
                <p className="text-xs text-slate-400">
                  Live communication check against Express backend (/health)
                </p>
              </div>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-all shadow-md shadow-cyan-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Check Status
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Connection State</span>
              {health ? (
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Online (200 OK)
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  {error}
                </div>
              ) : (
                <span className="text-slate-400 text-sm">Checking...</span>
              )}
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Service Identifier</span>
              <span className="text-sm font-medium text-slate-200">
                {health ? health.service : '—'}
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Environment</span>
              <span className="text-sm font-medium text-slate-200 uppercase tracking-wide">
                {health ? health.environment : '—'}
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Uptime / Last Check</span>
              <span className="text-sm font-medium text-slate-200">
                {health ? `${health.uptime}s uptime` : lastChecked ? lastChecked : '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Workspace Architecture Cards */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Configured Workspaces
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Frontend Card */}
            <div className="bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">apps/web</h3>
              <p className="text-xs text-cyan-400 font-mono mb-3">@mediledger/web</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                React 18 single-page application powered by Vite, Tailwind CSS, and strict
                TypeScript.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Strict TypeScript Config
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tailwind CSS Engine
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Production Build
                  Verified
                </li>
              </ul>
            </div>

            {/* Backend Card */}
            <div className="bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">apps/api</h3>
              <p className="text-xs text-blue-400 font-mono mb-3">@mediledger/api</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Node.js Express REST API in TypeScript with Zod runtime environment variable
                validation.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zod Environment
                  Validation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Health Check Endpoint
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Helmet & CORS Hardening
                </li>
              </ul>
            </div>

            {/* Contracts Card */}
            <div className="bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">contracts</h3>
              <p className="text-xs text-amber-400 font-mono mb-3">@mediledger/contracts</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Hardhat Solidity development workspace ready for blockchain verification in upcoming
                phases.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Hardhat 2.22 Tooling
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Solidity 0.8.28 Ready
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> TypeScript Integration
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Development Commands Guide */}
        <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">Key Workspace Scripts</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-cyan-400">npm run dev:api</span>
              <p className="text-slate-400 font-sans mt-1">Start Express API in watch mode</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-cyan-400">npm run dev:web</span>
              <p className="text-slate-400 font-sans mt-1">Start Vite development server</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-cyan-400">npm run typecheck</span>
              <p className="text-slate-400 font-sans mt-1">
                Run strict TypeScript checks across monorepo
              </p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-cyan-400">npm run lint</span>
              <p className="text-slate-400 font-sans mt-1">Run consistent ESLint across all code</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-cyan-400">npm run format:check</span>
              <p className="text-slate-400 font-sans mt-1">Check Prettier formatting consistency</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-cyan-400">npm run build</span>
              <p className="text-slate-400 font-sans mt-1">
                Compile API and bundle web for production
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-400">
        MediLedger Monorepo • Phase 0 Scaffold • Strict TypeScript Verification
      </footer>
    </div>
  );
};

export default App;
