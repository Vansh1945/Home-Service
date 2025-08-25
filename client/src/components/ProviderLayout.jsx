import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    FiMenu, FiX, FiHome, FiCalendar, FiDollarSign,
    FiFileText, FiMessageSquare, FiUser, FiChevronDown,
    FiLogOut, FiBell, FiCreditCard, FiCheckCircle,
    FiActivity, FiSettings
} from 'react-icons/fi';
import { useAuth } from '../store/auth';
import Logo from './Logo';

const ProviderLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logoutUser } = useAuth();

    const menuItems = [
        { name: 'Dashboard', path: '/provider/dashboard', icon: <FiHome className="w-5 h-5" /> },
        { name: 'Booking Requests', path: '/provider/booking-requests', icon: <FiCheckCircle className="w-5 h-5" /> },
        { name: 'Active Jobs', path: '/provider/active-jobs', icon: <FiCalendar className="w-5 h-5" /> },
        { name: 'Earnings', path: '/provider/earnings', icon: <FiDollarSign className="w-5 h-5" /> },
        { name: 'Feedback Viewer', path: '/provider/feedbacks', icon: <FiMessageSquare className="w-5 h-5" /> },
        { name: 'Test Result', path: '/provider/test', icon: <FiActivity className="w-5 h-5" /> }
    ];

    const isDashboardActive = location.pathname === '/provider' || location.pathname === '/provider/dashboard';

    const handleLogout = () => {
        logoutUser();
        setProfileDropdownOpen(false);
        navigate('/login');
    };

    const getUserInitials = () => {
        if (!user?.name) return 'P';
        const names = user.name.split(' ');
        return names.map(name => name[0]).join('').toUpperCase();
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile sidebar overlay */}
            <div 
                className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
                    sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
                    onClick={() => setSidebarOpen(false)}
                />
                
                {/* Mobile sidebar */}
                <div className={`relative flex flex-col w-80 max-w-xs h-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                    {/* Mobile header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <Logo className="h-8 w-auto text-primary" />
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-secondary transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path || (item.name === 'Dashboard' && isDashboardActive);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                                        isActive
                                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                            : 'text-secondary hover:bg-primary/10 hover:text-primary'
                                    }`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span className="mr-3">{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:flex-shrink-0">
                <div className="flex flex-col w-72 bg-white border-r border-gray-200 shadow-sm">
                    {/* Desktop header */}
                    <div className="flex items-center px-6 py-6 border-b border-gray-200">
                        <Logo className="h-10 w-auto text-primary" />
                    </div>

                    {/* Desktop navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path || (item.name === 'Dashboard' && isDashboardActive);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                                        isActive
                                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                            : 'text-secondary hover:bg-primary/10 hover:text-primary'
                                    }`}
                                >
                                    <span className="mr-3">{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Desktop sidebar footer */}
                    <div className="px-4 py-4 border-t border-gray-200">
                        <Link
                            to="/provider/settings"
                            className="flex items-center px-4 py-3 text-sm font-medium text-secondary hover:bg-primary/10 hover:text-primary rounded-xl transition-all duration-200"
                        >
                            <FiSettings className="w-5 h-5 mr-3" />
                            Settings
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top navigation bar */}
                <header className="bg-white border-b border-gray-200 shadow-sm z-10">
                    <div className="flex items-center justify-between px-4 py-4 lg:px-6">
                        {/* Left side - Mobile menu button */}
                        <div className="flex items-center">
                            <button
                                type="button"
                                className="p-2 rounded-lg text-secondary lg:hidden hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <FiMenu className="w-6 h-6" />
                            </button>
                            
                            {/* Page title on mobile */}
                            <h1 className="ml-3 text-xl font-semibold text-secondary lg:hidden">
                                {menuItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
                            </h1>
                        </div>

                        {/* Right side - Actions and profile */}
                        <div className="flex items-center space-x-3">
                            {/* Messages */}
                            <Link
                                to="/provider/messages"
                                className="relative p-2 rounded-lg text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                                <span className="sr-only">Messages</span>
                                <FiMessageSquare className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full"></span>
                            </Link>

                            {/* Notifications */}
                            <Link
                                to="/provider/notifications"
                                className="relative p-2 rounded-lg text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                                <span className="sr-only">Notifications</span>
                                <FiBell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full"></span>
                            </Link>

                            {/* Profile dropdown */}
                            <div className="relative">
                                <button
                                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                >
                                    {user?.profilePicUrl ? (
                                        <img
                                            src={user.profilePicUrl}
                                            alt="Profile"
                                            className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">
                                            {getUserInitials()}
                                        </div>
                                    )}
                                    <div className="hidden md:block text-left">
                                        <p className="text-sm font-medium text-secondary">
                                            {user?.name || 'Provider'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {user?.email || 'provider@example.com'}
                                        </p>
                                    </div>
                                    <FiChevronDown 
                                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                                            profileDropdownOpen ? 'transform rotate-180' : ''
                                        }`} 
                                    />
                                </button>

                                {/* Dropdown menu */}
                                {profileDropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg py-2 z-20 border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <p className="text-sm font-medium text-secondary">
                                                {user?.name || 'Provider'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {user?.email || 'provider@example.com'}
                                            </p>
                                        </div>
                                        
                                        <Link
                                            to="/provider/profile"
                                            className="flex items-center px-4 py-3 text-sm text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                                            onClick={() => setProfileDropdownOpen(false)}
                                        >
                                            <FiUser className="w-4 h-4 mr-3" />
                                            Profile Settings
                                        </Link>
                                        
                                        <Link
                                            to="/provider/settings"
                                            className="flex items-center px-4 py-3 text-sm text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                                            onClick={() => setProfileDropdownOpen(false)}
                                        >
                                            <FiSettings className="w-4 h-4 mr-3" />
                                            Account Settings
                                        </Link>
                                        
                                        <hr className="my-2 border-gray-100" />
                                        
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <FiLogOut className="w-4 h-4 mr-3" />
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main content */}
                <main className="flex-1 overflow-auto bg-gray-50">
                    <div className="p-4 lg:p-6 xl:p-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ProviderLayout;