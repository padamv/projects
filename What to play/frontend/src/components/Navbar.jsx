import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
    const location = useLocation();

    return (
        <nav className="navbar">
            <div className="navbar-brand">What to Play?</div>
            <div className="navbar-links">
                <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Library</Link>
                <Link to="/spin" className={location.pathname === '/spin' ? 'active' : ''}>Spin</Link>
            </div>
        </nav>
    );
}
