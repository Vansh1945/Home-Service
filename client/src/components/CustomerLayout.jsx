import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    FiMenu, FiX, FiHome, FiCalendar, FiCreditCard,
    FiFileText, FiMessageSquare, FiBell, FiUser,
    FiAlertCircle, FiChevronDown, FiLogOut, FiSearch,
    FiMapPin, FiShoppingBag
} from 'react-icons/fi';
import { useAuth } from '../store/auth';
import Logo from './Logo';

const CustomerLayout = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logoutUser } = useAuth();

    const menuItems = [
        { name: 'Dashboard', path: '/customer/dashboard', icon: <FiHome /> },
        { name: 'Book Service', path: '/customer/services', icon: <FiShoppingBag /> },
        { name: 'My Bookings', path: '/customer/bookings', icon: <FiCalendar /> },
        { name: 'Feedback', path: '/customer/feedback', icon: <FiMessageSquare /> },
        { name: 'Complaints', path: '/customer/complaints', icon: <FiAlertCircle /> },
    ];

    const handleLogout = () => {
        logoutUser();
        navigate('/login');
        setProfileDropdownOpen(false);
    };

    const getUserInitials = () => {
        if (!user?.name) return 'C';
        const names = user.name.split(' ');
        return names.map(name => name[0]).join('').toUpperCase();
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/customer/services?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navbar - Blinkit/Zomato Style */}
            <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left Section - Logo */}
                        <div className="flex items-center">
                            <Link to="/customer/dashboard" className="flex-shrink-0">
                                <Logo size="text-xl" />
                            </Link>
                        </div>

                        {/* Center Section - Search Bar (Hidden on mobile) */}
                        <div className="hidden md:flex flex-1 max-w-2xl mx-8">
                            <form onSubmit={handleSearch} className="w-full">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FiSearch className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                        placeholder="Search for electrical services..."
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Right Section - Location, Orders, Profile */}
                        <div className="flex items-center space-x-2 md:space-x-4">
                            {/* Location Selector - Show customer address */}
                            <div className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                <FiMapPin className="h-5 w-5 text-red-500" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500">Deliver to</span>
                                    <span className="text-sm font-medium text-gray-900 truncate max-w-32">
                                        {user?.address?.city || user?.city }
                                    </span>
                                </div>
                                <FiChevronDown className="h-4 w-4 text-gray-400" />
                            </div>

                            {/* My Orders */}
                            <Link
                                to="/customer/bookings"
                                className="hidden sm:flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <FiCalendar className="h-5 w-5 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">My Orders</span>
                            </Link>

                            {/* Notifications */}
                            <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <FiBell className="h-5 w-5" />
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                            </button>

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {user?.profilePicUrl ? (
                                        <img
                                            src={user.profilePicUrl}
                                            alt="Profile"
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                                            {getUserInitials()}
                                        </div>
                                    )}
                                    <span className="hidden lg:block text-sm font-medium text-gray-900 max-w-20 truncate">
                                        {user?.name || 'Customer'}
                                    </span>
                                    <FiChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Profile Dropdown Menu */}
                                {profileDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <p className="text-sm font-medium text-gray-900">{user?.name || 'Customer'}</p>
                                            <p className="text-xs text-gray-500">{user?.email}</p>
                                        </div>
                                        <Link
                                            to="/customer/profile"
                                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            onClick={() => setProfileDropdownOpen(false)}
                                        >
                                            <FiUser className="mr-3 h-4 w-4" />
                                            Profile Settings
                                        </Link>
                                        <Link
                                            to="/customer/bookings"
                                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            onClick={() => setProfileDropdownOpen(false)}
                                        >
                                            <FiCalendar className="mr-3 h-4 w-4" />
                                            My Bookings
                                        </Link>
                                        <Link
                                            to="/customer/feedback"
                                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            onClick={() => setProfileDropdownOpen(false)}
                                        >
                                            <FiMessageSquare className="mr-3 h-4 w-4" />
                                            Feedback
                                        </Link>
                                        <div className="border-t border-gray-100 mt-2 pt-2">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <FiLogOut className="mr-3 h-4 w-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Search Bar */}
                    <div className="md:hidden px-4 pb-4">
                        <form onSubmit={handleSearch}>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                    placeholder="Search for electrical services..."
                                />
                            </div>
                        </form>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden border-t border-gray-200 bg-white">
                            <div className="px-2 pt-2 pb-3 space-y-1">
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                            location.pathname === item.path
                                                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <span className="mr-3">{item.icon}</span>
                                        {item.name}
                                    </Link>
                                ))}
                                
                                {/* Mobile Location */}
                                <div className="flex items-center px-3 py-2 text-gray-600">
                                    <FiMapPin className="mr-3 h-5 w-5 text-red-500" />
                                    <div>
                                        <div className="text-xs text-gray-500">Deliver to</div>
                                        <div className="text-sm font-medium">{user?.address?.city || user?.city || 'Current Location'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
};

export default CustomerLayout;
