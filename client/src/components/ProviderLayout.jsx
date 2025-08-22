import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    FiMenu, FiX, FiHome, FiCalendar, FiDollarSign,
    FiFileText, FiMessageSquare, FiUser, FiChevronDown,
    FiLogOut, FiBell, FiCreditCard, FiCheckCircle,
    FiActivity
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
        { name: 'Dashboard', path: '/provider/dashboard', icon: <FiHome /> },
        { name: 'Booking Requests', path: '/provider/booking-requests', icon: <FiCheckCircle /> },
        { name: 'Active Jobs', path: '/provider/active-jobs', icon: <FiCalendar /> },
        { name: 'Earnings', path: '/provider/earnings', icon: <FiDollarSign /> },
        { name: 'Feedback Viewer', path: '/provider/feedbacks', icon: <FiMessageSquare /> },
        { name: 'Test Result', path: '/provider/test', icon: <FiActivity /> }
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
        <div className="flex h-screen bg-blue-50 overflow-hidden">
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
                <div className="relative flex flex-col w-72 max-w-xs h-full bg-blue-900">
                    <div className="flex items-center justify-between px-4 py-5 border-b border-indigo-900">
                        <div className="flex items-center">
                            <Logo className="h-8 w-auto text-white" />
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="text-blue-200 hover:text-white"
                        >
                            <FiX size={24} />
                        </button>
                    </div>
                    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${location.pathname === item.path || (item.name === 'Dashboard' && isDashboardActive)
                                    ? 'bg-blue-600 text-white'
                                    : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                                    }`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:flex-shrink-0">
                <div className="flex flex-col w-64 border-r border-gray-200 bg-blue-900">
                    <div className="flex items-center justify-center px-4 py-5 border-b border-indigo-900">
                        <Logo className="h-8 w-auto text-white" />
                    </div>
                    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${location.pathname === item.path || (item.name === 'Dashboard' && isDashboardActive)
                                    ? 'bg-blue-600 text-white'
                                    : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                                    }`}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm lg:px-6">
                    {/* Left side - Mobile menu button */}
                    <div className="flex items-center">
                        <button
                            type="button"
                            className="p-2 text-gray-600 rounded-md lg:hidden hover:bg-blue-100 hover:text-blue-600"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <FiMenu size={20} />
                        </button>
                    </div>

                    {/* Right side - Profile and notifications */}
                    <div className="flex items-center space-x-6">
                        {/* Messages */}
                        <Link
                            to="/provider/messages"
                            className="p-1 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-600 relative"
                        >
                            <span className="sr-only">Messages</span>
                            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <FiMessageSquare className="w-5 h-5" />
                        </Link>

                        {/* Notifications */}
                        <Link
                            to="/provider/notifications"
                            className="p-1 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-600 relative"
                        >
                            <span className="sr-only">Notifications</span>
                            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <FiBell className="w-5 h-5" />
                        </Link>

                        {/* Profile dropdown */}
                        <div className="relative">
                            <button
                                className="flex items-center space-x-2 focus:outline-none"
                                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            >
                                {user?.profilePicUrl ? (
                                    <img
                                        src={user.profilePicUrl}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                        {getUserInitials()}
                                    </div>
                                )}
                                <span className="hidden md:inline text-sm font-medium text-gray-700">
                                    {user?.name || 'Provider'}
                                </span>
                                <FiChevronDown className={`text-gray-600 transition-transform ${profileDropdownOpen ? 'transform rotate-180' : ''}`} />
                            </button>

                            {profileDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                                    <Link
                                        to="/provider/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 items-center"
                                        onClick={() => setProfileDropdownOpen(false)}
                                    >
                                        <FiUser className="mr-2" /> Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 items-center"
                                    >
                                        <FiLogOut className="mr-2" /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default ProviderLayout;