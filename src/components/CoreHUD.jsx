import { LayoutDashboard, LogOut, Plus, Radio } from 'lucide-react';
import { supabase } from '../lib/supabase';

const money = (cents) => `$${((cents || 0) / 100).toLocaleString()}`;

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'decision', label: 'New decision', icon: Plus },
];

function NavButton({ item, active, onSelect, compact }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onSelect(item.key)}
      className={`label flex items-center gap-2.5 rounded transition-colors ${
        compact ? 'px-3 py-1.5' : 'w-full px-3 py-2'
      } ${active ? 'bg-indigo text-white' : 'text-dim hover:text-ink hover:bg-raised/60'}`}
    >
      <Icon size={13} />
      {item.label}
    </button>
  );
}

// Shell for every signed-in screen: identity rail on the left, viewport to the
// right. Screens that need a side panel lay it out within their own viewport.
function CoreHUD({ business, view, onNavigate, children }) {
  return (
    <div className="min-h-screen lg:flex">
      {/* Rail */}
      <aside className="hidden lg:flex lg:flex-col w-56 shrink-0 border-r border-edge bg-hull/50 backdrop-blur-sm sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-edge">
          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-breathe" />
            <span className="text-xl font-bold text-white tracking-tight">Tello</span>
          </div>
          <p className="label mt-1.5 text-faint">AI co-founder</p>
        </div>

        <nav className="p-3 space-y-1">
          {NAV.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={view === item.key}
              onSelect={onNavigate}
            />
          ))}
        </nav>

        {business && (
          <div className="mt-auto p-5 border-t border-edge space-y-3">
            <div>
              <p className="label">Business</p>
              <p className="text-sm text-ink mt-1 truncate">{business.name}</p>
            </div>
            <div>
              <p className="label">Monthly revenue</p>
              <p className="readout text-sm mt-1">{money(business.monthly_revenue)}</p>
            </div>
            <div className="pip text-faint">
              <Radio size={11} className="text-emerald animate-breathe" />
              link active
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="label flex items-center gap-2 text-faint hover:text-rose transition-colors pt-1"
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Compact bar for narrow screens */}
      <header className="lg:hidden sticky top-0 z-20 border-b border-edge bg-hull/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-breathe" />
            <span className="text-lg font-bold text-white tracking-tight">Tello</span>
          </div>
          <div className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                active={view === item.key}
                onSelect={onNavigate}
                compact
              />
            ))}
            <button
              onClick={() => supabase.auth.signOut()}
              className="label px-2 py-1.5 text-faint hover:text-rose"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Viewport */}
      <main className="flex-1 min-w-0 p-5 lg:p-6">{children}</main>
    </div>
  );
}

export default CoreHUD;
