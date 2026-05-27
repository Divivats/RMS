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
    users: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    onboarding: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
        </svg>
    ),
    clipboard: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
    ),
};

const iconMap: Record<string, React.ReactNode> = {
    dashboard: Icons.dashboard,
    briefcase: Icons.briefcase,
    user: Icons.user,
    plus: Icons.plus,
    userPlus: Icons.userPlus,
    users: Icons.users,
    onboarding: Icons.onboarding,
    clipboard: Icons.clipboard,
};

type Section = 'recruitment' | 'onboarding';

const recruitmentItems = [
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
            { to: '/consultants', label: 'Add Account', icon: 'users', roles: ['Admin'] },
        ],
    },
];

const onboardingItems = [
    {
        section: 'Onboarding',
        links: [
            { to: '/onboarding', label: 'Onboarding', icon: 'clipboard', roles: ['Admin', 'Consultant'] },
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

    // Auto-detect section from URL
    const currentSection: Section = location.pathname.startsWith('/onboarding') ? 'onboarding' : 'recruitment';
    const [activeSection, setActiveSection] = useState<Section>(currentSection);

    useEffect(() => {
        setActiveSection(location.pathname.startsWith('/onboarding') ? 'onboarding' : 'recruitment');
    }, [location.pathname]);

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

    const navItems = activeSection === 'recruitment' ? recruitmentItems : onboardingItems;

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
        if (path === '/onboarding') return { title: 'Onboarding', sub: 'Track employee & intern progress' };
        if (path.startsWith('/onboarding/')) return { title: 'Onboarding Details', sub: 'Probation & evaluation tracking' };
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

                {/* ── Section Toggle ── */}
                {!collapsed && (
                    <div style={{ padding: '4px 12px', marginBottom: 4 }}>
                        <div style={{
                            display: 'flex', borderRadius: 'var(--radius-md)',
                            background: 'rgba(255,255,255,0.06)', padding: 3, gap: 2,
                        }}>
                            {([
                                { key: 'recruitment' as Section, label: 'Recruitment', icon: Icons.briefcase },
                                { key: 'onboarding' as Section, label: 'Onboarding', icon: Icons.onboarding },
                            ]).map(s => (
                                <NavLink
                                    key={s.key}
                                    to={s.key === 'recruitment' ? '/' : '/onboarding'}
                                    onClick={() => setActiveSection(s.key)}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        padding: '8px 0', borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
                                        transition: 'all 0.25s ease', cursor: 'pointer', border: 'none',
                                        background: activeSection === s.key ? 'var(--accent)' : 'transparent',
                                        color: activeSection === s.key ? '#fff' : 'var(--text-sidebar)',
                                    }}
                                >
                                    {s.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}

                {collapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 8, padding: '0 4px' }}>
                        <NavLink
                            to="/"
                            onClick={() => setActiveSection('recruitment')}
                            title="Recruitment"
                            style={{
                                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: activeSection === 'recruitment' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                                color: activeSection === 'recruitment' ? '#fff' : 'var(--text-sidebar)',
                                transition: 'all 0.2s ease',
                            }}
                        >{Icons.briefcase}</NavLink>
                        <NavLink
                            to="/onboarding"
                            onClick={() => setActiveSection('onboarding')}
                            title="Onboarding"
                            style={{
                                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: activeSection === 'onboarding' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                                color: activeSection === 'onboarding' ? '#fff' : 'var(--text-sidebar)',
                                transition: 'all 0.2s ease',
                            }}
                        >{Icons.onboarding}</NavLink>
                    </div>
                )}

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
                                        end={link.to === '/' || link.to === '/onboarding'}
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
