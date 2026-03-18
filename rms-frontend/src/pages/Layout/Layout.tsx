import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Loader';
import BackgroundAnimation from '../../components/BackgroundAnimation';
/* ── SVG Icon Components ────────────────────────────── */
const Icons = {
    dashboard: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    briefcase: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M12 12h.01" />
        </svg>
    ),
    user: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
        </svg>
    ),
    plus: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
        </svg>
    ),
    userPlus: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="8" r="4" /><path d="M3.5 21a8.38 8.38 0 0 1 13 0" /><path d="M19 8v6M22 11h-6" />
        </svg>
    ),
    logout: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
    chevronLeft: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    chevronRight: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
        </svg>
    ),
    menu: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
    ),
};

const iconMap: Record<string, React.ReactNode> = {
    dashboard: Icons.dashboard,
    briefcase: Icons.briefcase,
    user: Icons.user,
    plus: Icons.plus,
    userPlus: Icons.userPlus,
};

const navItems = [
    {
        section: 'Main',
        links: [
            { to: '/', label: 'Dashboard', icon: 'dashboard', roles: ['Admin', 'Consultant'] },
            { to: '/jobs', label: 'Job Positions', icon: 'briefcase', roles: ['Admin', 'Consultant'] },
            { to: '/candidates', label: 'Candidates', icon: 'user', roles: ['Admin', 'Consultant'] },
        ],
    },
    {
        section: 'Management',
        links: [
            { to: '/jobs/create', label: 'Create Position', icon: 'plus', roles: ['Admin'] },
            { to: '/candidates/create', label: 'Add Candidate', icon: 'userPlus', roles: ['Admin'] },
        ],
    },
];

export default function Layout() {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(() => {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
            setIsTransitioning(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(collapsed));
    }, [collapsed]);

    if (!user) return <Navigate to="/login" replace />;

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return { title: 'Dashboard', sub: 'Overview of your recruitment pipeline' };
        if (path === '/jobs') return { title: 'Job Positions', sub: 'Manage open positions' };
        if (path === '/jobs/create') return { title: 'Create Position', sub: 'Add a new job opening' };
        if (path.startsWith('/jobs/')) return { title: 'Position Details', sub: 'View job position information' };
        if (path === '/candidates') return { title: 'Candidates', sub: 'All candidates in the system' };
        if (path === '/candidates/create') return { title: 'Add Candidate', sub: 'Register a new candidate' };
        if (path.startsWith('/candidates/')) return { title: 'Candidate Profile', sub: 'Detailed candidate view' };
        if (path.startsWith('/interviews/')) return { title: 'Interview Evaluation', sub: 'Complete the evaluation form' };
        return { title: 'RMS', sub: '' };
    };

    const page = getPageTitle();
    const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <div className="app-layout">
            <BackgroundAnimation />
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
                <div 
                    className="sidebar-brand" 
                    onClick={() => setCollapsed(c => !c)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <span className="hamburger-icon">{Icons.menu}</span>
                    {!collapsed && (
                        <div>
                            <h2><span>RMS</span> Portal</h2>
                            <p>Recruitment System</p>
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((section) => {
                        const visibleLinks = section.links.filter(
                            (link) => link.roles.includes(user.role)
                        );
                        if (visibleLinks.length === 0) return null;

                        return (
                            <div className="sidebar-section" key={section.section}>
                                {!collapsed && <div className="sidebar-section-title">{section.section}</div>}
                                {visibleLinks.map((link) => (
                                    <NavLink
                                        key={link.to}
                                        to={link.to}
                                        end={link.to === '/'}
                                        className={({ isActive }) =>
                                            `sidebar-link ${isActive ? 'active' : ''}`
                                        }
                                        title={collapsed ? link.label : undefined}
                                    >
                                        <span className="sidebar-link-icon">{iconMap[link.icon]}</span>
                                        {!collapsed && <span className="sidebar-link-label">{link.label}</span>}
                                    </NavLink>
                                ))}
                            </div>
                        );
                    })}
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">{initials}</div>
                    {!collapsed && (
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user.fullName}</div>
                            <div className="sidebar-user-role">{user.role === 'Admin' ? 'HR / Admin' : 'Consultant'}</div>
                        </div>
                    )}
                    <button className="sidebar-logout" onClick={() => {
                        setIsTransitioning(true);
                        setTimeout(() => logout(), 1000);
                    }} title="Sign out">
                        {Icons.logout}
                    </button>
                </div>
            </aside>

            <div className="main-content">
                <header className="topbar">
                    <div className="topbar-title">
                        <h1>{page.title}</h1>
                        {page.sub && <p>{page.sub}</p>}
                    </div>
                    <div className="topbar-actions">
                        <span className="badge badge-open" style={{ fontSize: '0.8rem' }}>
                            {isAdmin ? 'HR / Admin' : 'Consultant'}
                        </span>
                    </div>
                </header>

                <main className="page-content">
                    {isTransitioning ? (
                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                            <Loader />
                        </div>
                    ) : (
                        <div className="page-animate">
                            <Outlet />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
