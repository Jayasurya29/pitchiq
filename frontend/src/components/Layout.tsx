import { Outlet, Link, useLocation } from 'react-router-dom'
import { Search, Clock, BarChart2, Settings, History } from 'lucide-react'

function Layout() {
  const location = useLocation()

  const links = [
    { path: '/', label: 'Research', icon: Search },
    { path: '/pending', label: 'Pending', icon: Clock },
    { path: '/history', label: 'History', icon: History },
    { path: '/analytics', label: 'Analytics', icon: BarChart2, soon: true },
    { path: '/settings', label: 'Settings', icon: Settings, soon: true },
  ]

  return (
    <div className="min-h-screen flex" style={{background: '#f5f6f8'}}>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 flex flex-col z-50" style={{background: '#ffffff', borderRight: '1px solid #e8eaed'}}>

        {/* Logo */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: '#eff6ff'}}>
              <span style={{color: '#3b82f6', fontSize: '16px'}}>✦</span>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{color: '#0f172a'}}>PitchIQ</p>
              <p className="text-xs" style={{color: '#94a3b8'}}>Outreach engine</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3 flex-1">
          {links.map(link => {
            const Icon = link.icon
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.soon ? '#' : link.path}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#3b82f6' : '#64748b',
                  cursor: link.soon ? 'default' : 'pointer'
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} />
                  {link.label}
                </div>
                {link.soon && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{background: '#f1f5f9', color: '#94a3b8'}}>
                    SOON
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-5 py-4" style={{borderTop: '1px solid #f1f5f9'}}>
          <p className="text-xs" style={{color: '#cbd5e1'}}>v0.1 · PitchIQ</p>
        </div>

      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 min-h-screen px-10 py-8">
        <Outlet />
      </main>

    </div>
  )
}

export default Layout