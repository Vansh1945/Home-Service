import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    FiMenu, FiX, FiHome, FiCheckCircle, FiUsers, FiCalendar, FiMessageCircle,
    FiDollarSign, FiTag, FiPlus, FiTool,
    FiAlertCircle, FiChevronDown, FiLogOut, FiUser, FiBell
} from 'react-icons/fi';
import { useAuth } from '../store/auth'; // Adjust the import path as needed
import Logo from './Logo';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const location = useLocation();
    const { logoutUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logoutUser();
        navigate('/login');
    };

    const menuItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: <FiHome /> },
        { name: 'Approve Providers', path: '/admin/approve-providers', icon: <FiCheckCircle /> },
        { name: 'All Providers', path: '/admin/providers', icon: <FiUsers /> },
        { name: 'All Customers', path: '/admin/customers', icon: <FiUsers /> },
        { name: 'Bookings', path: '/admin/bookings', icon: <FiCalendar /> },
        { name: 'Commission Settings', path: '/admin/commission', icon: <FiDollarSign /> },
        { name: 'Coupons', path: '/admin/coupons', icon: <FiTag /> },
        { name: 'Test', path: '/admin/add-questions', icon: <FiPlus /> },
        { name: 'Add Services', path: '/admin/add-services', icon: <FiTool /> },
        { name: 'Complaint', path: '/admin/complaints', icon: <FiAlertCircle /> },
        { name: 'Feedback', path: '/admin/feedback', icon: <FiMessageCircle /> },
        { name: 'Earning', path: '/admin/earning', icon: <FiAlertCircle /> },
        // { name: 'Feedback', path: '/admin/feedback', icon: <FiMessageCircle /> },
    ];

    // Set Dashboard as active if no other path is matched
    const isDashboardActive = location.pathname === '/admin' || location.pathname === '/admin/dashboard';

    return (
        <div className="flex h-screen bg-blue-50 overflow-hidden">
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
                <div className="relative flex flex-col w-72 max-w-xs h-full bg-blue-900">
                    <div className="flex items-center justify-between px-4 py-5 border-b border-blue-800">
                        <Logo />
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
                                    ? 'bg-blue-800 text-white'
                                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                                    }`}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.name}
                                {item.active && (
                                    <span className="ml-auto w-2 h-2 bg-yellow-400 rounded-full"></span>
                                )}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:flex-shrink-0">
                <div className="flex flex-col w-64 border-r border-gray-200 bg-blue-900">
                    <div className="flex items-center justify-between px-4 py-5 border-b border-blue-800">
                        <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                    </div>
                    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${location.pathname === item.path || (item.name === 'Dashboard' && isDashboardActive)
                                    ? 'bg-blue-800 text-white'
                                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                                    }`}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.name}
                                {item.active && (
                                    <span className="ml-auto w-2 h-2 bg-yellow-400 rounded-full"></span>
                                )}
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

                    {/* Right side - Profile dropdown and notifications */}
                    <div className="flex items-center space-x-4">
                        {/* Notifications */}
                        <button className="p-1 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-600 relative">
                            <span className="sr-only">Notifications</span>
                            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <FiBell className="w-5 h-5" />
                        </button>

                        {/* Profile dropdown */}
                        <div className="relative">
                            <button
                                className="flex items-center space-x-2 focus:outline-none"
                                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                    A
                                </div>
                                <span className="hidden md:inline text-sm font-medium text-gray-700">Admin User</span>
                                <FiChevronDown className={`text-gray-500 transition-transform ${profileDropdownOpen ? 'transform rotate-180' : ''}`} />
                            </button>

                            {profileDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                                    <Link
                                        to="/admin/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center"
                                        onClick={() => setProfileDropdownOpen(false)}
                                    >
                                        <FiUser className="mr-2" /> Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center"
                                    >
                                        <FiLogOut className="mr-2" /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <main className="p-0 ">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;