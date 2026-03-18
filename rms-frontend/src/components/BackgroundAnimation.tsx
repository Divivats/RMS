import { useLocation } from 'react-router-dom';

export default function BackgroundAnimation() {
    const location = useLocation();
    const path = location.pathname;

    let svgs = null;

    if (path === '/') {
        // Dashboard - Pulse and orbit
        svgs = (
            <svg viewBox="0 0 200 200" width="300" height="300" style={{ opacity: 0.1, position: 'fixed', bottom: -50, right: -50, zIndex: 0, pointerEvents: 'none' }}>
                <circle cx="100" cy="100" r="80" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="10 10">
                    <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="20s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="100" r="50" fill="none" stroke="var(--success)" strokeWidth="1">
                    <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="15s" repeatCount="indefinite" />
                </circle>
            </svg>
        );
    } else if (path.startsWith('/jobs')) {
        // Jobs - Briefcase/Squares floating
        svgs = (
            <svg viewBox="0 0 200 200" width="250" height="250" style={{ opacity: 0.1, position: 'fixed', bottom: -20, right: 0, zIndex: 0, pointerEvents: 'none' }}>
                <rect x="50" y="50" width="100" height="100" rx="10" fill="none" stroke="var(--info)" strokeWidth="3">
                    <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="25s" repeatCount="indefinite" />
                </rect>
                <rect x="70" y="70" width="60" height="60" rx="5" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="12s" repeatCount="indefinite" />
                </rect>
            </svg>
        );
    } else if (path.startsWith('/candidates') || path.startsWith('/interviews')) {
        // Candidates - People/Circles intersecting
        svgs = (
            <svg viewBox="0 0 200 200" width="280" height="280" style={{ opacity: 0.1, position: 'fixed', bottom: -30, right: -20, zIndex: 0, pointerEvents: 'none' }}>
                <circle cx="70" cy="100" r="40" fill="none" stroke="var(--warning)" strokeWidth="3">
                    <animate attributeName="r" values="35;45;35" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="130" cy="100" r="40" fill="none" stroke="var(--success)" strokeWidth="3">
                    <animate attributeName="r" values="45;35;45" dur="4s" repeatCount="indefinite" />
                </circle>
                <path d="M70,140 Q100,160 130,140" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <animate attributeName="d" values="M70,140 Q100,160 130,140; M70,140 Q100,120 130,140; M70,140 Q100,160 130,140" dur="6s" repeatCount="indefinite" />
                </path>
            </svg>
        );
    }
    
    return svgs;
}
