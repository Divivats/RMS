import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../services/api';
import Loader from '../../components/Loader';
import BackgroundAnimation from '../../components/BackgroundAnimation';
import type { Notification } from '../../types';

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
    bell: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

const getRoleLabel = (role: string) => {
    switch (role) {
        case 'Admin': return 'HR / Admin';
        case 'Consultant': return 'Consultant';
        case 'ProjectManager': return 'Project Manager';
        case 'MD': return 'Managing Director';
        default: return role;
    }
};

const getRecruitmentItems = (role: string) => {
    const items: { section: string; links: { to: string; label: string; icon: string; roles: string[] }[] }[] = [
        {
            section: 'Main',
            links: [
                { to: '/', label: 'Dashboard', icon: 'dashboard', roles: ['Admin', 'Consultant', 'ProjectManager', 'MD'] },
                { to: '/jobs', label: 'Job Positions', icon: 'briefcase', roles: ['Admin', 'Consultant', 'ProjectManager', 'MD'] },
                { to: '/candidates', label: 'Candidates', icon: 'user', roles: ['Admin', 'Consultant', 'ProjectManager', 'MD'] },
            ],
        },
        {
            section: 'Management',
            links: [
                { to: '/jobs/create', label: 'Create Position', icon: 'plus', roles: ['Admin', 'ProjectManager'] },
                { to: '/candidates/create', label: 'Add Candidate', icon: 'userPlus', roles: ['Admin'] },
                { to: '/consultants', label: 'User Management', icon: 'users', roles: ['Admin'] },
            ],
        },
    ];
    return items;
};

const onboardingItems = [
    {
        section: 'Onboarding',
        links: [
            { to: '/onboarding', label: 'Onboarding', icon: 'clipboard', roles: ['Admin', 'Consultant'] },
        ],
    },
];

export default function Layout() {
    const { user, logout, isAdmin, isProjectManager, isMD } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(() => {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Notifications state
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    // Auto-detect section from URL
    const currentSection: Section = location.pathname.startsWith('/onboarding') ? 'onboarding' : 'recruitment';
    const [activeSection, setActiveSection] = useState<Section>(currentSection);

    // Fetch unread count every 30 seconds
    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await notificationsApi.getUnreadCount();
            setUnreadCount(res.data.count);
        } catch { /* ignore */ }
    }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await notificationsApi.getAll();
            setNotifications(res.data);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

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

    const handleBellClick = async () => {
        if (!showNotifications) {
            await fetchNotifications();
        }
        setShowNotifications(!showNotifications);
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.isRead) {
            await notificationsApi.markRead(notification.id);
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
        }
        setShowNotifications(false);
        // Navigate to related entity
        if (notification.relatedEntityType === 'JobPosition' && notification.relatedEntityId) {
            navigate(`/jobs/${notification.relatedEntityId}`);
        }
    };

    const handleMarkAllRead = async () => {
        await notificationsApi.markAllRead();
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const navItems = activeSection === 'recruitment' ? getRecruitmentItems(user.role) : onboardingItems;

    // PM and MD should not see onboarding section toggle
    const showOnboardingToggle = !isProjectManager && !isMD;

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

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

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
                {!collapsed && showOnboardingToggle && (
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

                {collapsed && showOnboardingToggle && (
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
                            <div className="sidebar-user-role">{getRoleLabel(user.role)}</div>
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
                    <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Notification Bell */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={handleBellClick}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    transition: 'all 0.2s ease',
                                }}
                                title="Notifications"
                            >
                                {Icons.bell}
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -4,
                                        background: 'var(--danger)',
                                        color: '#fff',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        borderRadius: '50%',
                                        minWidth: 18,
                                        height: 18,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 4px',
                                        animation: 'pulse 2s ease-in-out infinite',
                                    }}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <>
                                    <div
                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                                        onClick={() => setShowNotifications(false)}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        right: 0,
                                        width: 380,
                                        maxHeight: 480,
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-lg)',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                                        zIndex: 999,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        backdropFilter: 'blur(20px)',
                                    }}>
                                        <div style={{
                                            padding: '14px 16px',
                                            borderBottom: '1px solid var(--border)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                                Notifications
                                            </span>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={handleMarkAllRead}
                                                    style={{
                                                        background: 'none', border: 'none', color: 'var(--accent)',
                                                        fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                                                    }}
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ overflowY: 'auto', flex: 1 }}>
                                            {notifications.length === 0 ? (
                                                <div style={{
                                                    padding: '40px 16px',
                                                    textAlign: 'center',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '0.85rem',
                                                }}>
                                                    No notifications yet
                                                </div>
                                            ) : (
                                                notifications.map(n => (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => handleNotificationClick(n)}
                                                        style={{
                                                            padding: '12px 16px',
                                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                            cursor: 'pointer',
                                                            background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.06)',
                                                            transition: 'background 0.2s',
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.06)')}
                                                    >
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                            {!n.isRead && (
                                                                <div style={{
                                                                    width: 8, height: 8, borderRadius: '50%',
                                                                    background: 'var(--accent)', marginTop: 6, flexShrink: 0,
                                                                }} />
                                                            )}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{
                                                                    fontWeight: 600, fontSize: '0.82rem',
                                                                    color: 'var(--text-primary)', marginBottom: 2,
                                                                }}>
                                                                    {n.title}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.78rem', color: 'var(--text-secondary)',
                                                                    lineHeight: 1.4,
                                                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                                                    display: '-webkit-box', WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                }}>
                                                                    {n.message}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.7rem', color: 'var(--text-secondary)',
                                                                    marginTop: 4, opacity: 0.7,
                                                                }}>
                                                                    {formatTimeAgo(n.createdAt)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <span className="badge badge-open" style={{ fontSize: '0.8rem' }}>
                            {getRoleLabel(user.role)}
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
