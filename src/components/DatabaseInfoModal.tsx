import { useState } from "react";
import { Database, Copy, Check, X, Shield, Terminal, ArrowRight, Table, Info } from "lucide-react";
import { SUPABASE_SETUP_SQL } from "../lib/supabase";

interface DatabaseInfoModalProps {
  isConfigured: boolean;
  onClose: () => void;
}

export default function DatabaseInfoModal({ isConfigured, onClose }: DatabaseInfoModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="db-info-container" 
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header segment */}
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Database className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white tracking-tight">Supabase Configuration Guide</h3>
              <p className="text-xs text-zinc-500">How to sync your moodboards with your database</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-900 hover:border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 text-zinc-300 text-sm">
          {/* Connection Status card */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            isConfigured 
              ? "bg-emerald-950/20 border-emerald-900/60 text-emerald-300" 
              : "bg-amber-950/20 border-amber-900/60 text-amber-300"
          }`}>
            <div className="shrink-0 pt-0.5">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <span className="font-semibold block text-sm">
                Status: {isConfigured ? "Live Database Connected!" : "Running in Sandbox Fallback Mode"}
              </span>
              <p className="text-xs opacity-90 leading-relaxed">
                {isConfigured 
                  ? "Your app is securely connected to Supabase. Every pin creation, board, follow, and save resides in your cloud database." 
                  : "Not configured yet. All interactions are securely sandboxed inside your local browser storage (localStorage) so you can still use the app offline!"}
              </p>
            </div>
          </div>

          {/* Simple step-by-step checklist */}
          <div className="space-y-3.5">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" /> 
              Step-by-Step database setup
            </h4>
            <div className="space-y-3 pl-1">
              {/* Step 1 */}
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">1</span>
                <div>
                  <span className="font-medium text-zinc-100 block">Create a Supabase Project</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">supabase.com</a>, start a new project, and grab your Connection credentials.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">2</span>
                <div>
                  <span className="font-medium text-zinc-100 block">Add Credentials to Server (Securely)</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Under the <strong>Secrets Settings</strong> panel in AI Studio, configure the connection secrets. This keeps your credentials safe server-side:
                  </p>
                  <div className="mt-2 p-3.5 bg-zinc-950 border border-zinc-900/80 rounded-lg text-[11px] font-mono whitespace-pre-wrap text-zinc-400 leading-relaxed selection:bg-zinc-800">
                    <div>SUPABASE_URL=your-supabase-url</div>
                    <div>SUPABASE_ANON_KEY=your-client-anon-key</div>
                    <div className="text-indigo-400">SUPABASE_SERVICE_ROLE_KEY=your-secure-service-role-key</div>
                    <div>SUPABASE_STORAGE_BUCKET=pin-images</div>
                    <div>SESSION_SECRET=your-random-32-plus-character-secret</div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">3</span>
                <div>
                  <span className="font-medium text-zinc-100 block">Run SQL Setup queries</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Copy the table schema query below, open the <strong>SQL Editor</strong> tab in your Supabase dashboard, paste it, and click <strong>Run</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">4</span>
                <div>
                  <span className="font-medium text-zinc-100 block">Create the Storage Bucket</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    In Supabase Storage, create a public bucket named <strong>pin-images</strong>. Uploaded files are stored there and pins keep only the public image URL.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Code SQL Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-zinc-400 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-zinc-500" />
                database-schema.sql
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied SQL!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy SQL Script
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <pre className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl overflow-x-auto text-[11px] font-mono text-zinc-400 max-h-48 scrollbar-thin scrollbar-thumb-zinc-800 overflow-y-auto selection:bg-zinc-800 select-all">
                {SUPABASE_SETUP_SQL}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer segment */}
        <div className="p-5 border-t border-zinc-900 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Table className="h-3.5 w-3.5 shrink-0" />
            6 tables + Storage - Authenticated API
          </span>
          <button 
            onClick={onClose}
            className="flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition cursor-pointer"
          >
            I Understand
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
