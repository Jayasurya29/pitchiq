import { Outlet, Link, useLocation } from 'react-router-dom'

function Layout() {
  const location = useLocation()

  const links = [
    { path: '/', label: 'Research', icon: '⟡' },
    { path: '/pending', label: 'Pending', icon: '◎' },
    { path: '/history', label: 'History', icon: '▤' },
    { path: '/analytics', label: 'Analytics', icon: '▲' },
    { path: '/sequence', label: 'Sequences', icon: '⋯' },
  ]

  return (
    <div className="min-h-screen flex" style={{background: '#f4f5f7'}}>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-52 flex flex-col px-3 py-5 z-50" style={{background: '#1e1f2e'}}>

        {/* Logo */}
        <div className="px-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background: '#6366f1'}}>
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="text-sm font-semibold text-white">PitchIQ</span>
          </div>
        </div>

        {/* Section label */}
        <p className="px-3 text-[10px] uppercase tracking-widest mb-2" style={{color: '#4b4d6b'}}>Menu</p>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1">
          {links.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: location.pathname === link.path ? '#2d2f45' : 'transparent',
                color: location.pathname === link.path ? '#ffffff' : '#6b6d8a'
              }}
            >
              <span className="text-xs">{link.icon}</span>
              {link.label}
              {link.path === '/pending' && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{background: '#f59e0b'}} />
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pt-4" style={{borderTop: '1px solid #2d2f45'}}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{background: '#10b981'}} />
            <span className="text-xs" style={{color: '#4b4d6b'}}>Pipeline ready</span>
          </div>
        </div>

      </aside>

      {/* Main */}
      <main className="ml-52 flex-1 min-h-screen">

        {/* Top bar */}
        <div className="sticky top-0 z-40 px-8 h-12 flex items-center justify-between" style={{background: '#f4f5f7', borderBottom: '1px solid #e5e7eb'}}>
          <p className="text-xs capitalize" style={{color: '#9ca3af'}}>
            {location.pathname === '/' ? 'Research' : location.pathname.replace('/', '')}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{background: '#10b981'}} />
            <span className="text-xs" style={{color: '#9ca3af'}}>API live</span>
          </div>
        </div>

        {/* Page content */}
        <div className="px-8 py-8">
          <Outlet />
        </div>

      </main>

    </div>
  )
}

export default Layout