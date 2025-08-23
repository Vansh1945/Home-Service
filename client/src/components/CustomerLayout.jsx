import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    FiHome, FiCalendar, FiCreditCard, FiMessageSquare, 
    FiBell, FiUser, FiAlertCircle, FiLogOut, FiSearch,
    FiShoppingBag, FiMenu, FiX, FiChevronDown, FiMapPin
} from 'react-icons/fi';
import { FaBolt } from 'react-icons/fa';
import { useAuth } from '../store/auth';

const CustomerLayout = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logoutUser } = useAuth();

    const navigationItems = [
        { name: 'Services', path: '/customer/services', icon: <FiShoppingBag className="w-5 h-5" /> },
        { name: 'Bookings', path: '/customer/bookings', icon: <FiCalendar className="w-5 h-5" /> },
        { name: 'Payments', path: '/customer/payments', icon: <FiCreditCard className="w-5 h-5" /> },
        { name: 'Feedback', path: '/customer/feedback', icon: <FiMessageSquare className="w-5 h-5" /> },
        { name: 'Complaints', path: '/customer/complaints', icon: <FiAlertCircle className="w-5 h-5" /> },
        { name: 'Profile', path: '/customer/profile', icon: <FiUser className="w-5 h-5" /> },
    ];

    const handleLogout = () => {
        logoutUser();
        navigate('/login');
        setMobileMenuOpen(false);
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

    const isActiveRoute = (path) => {
        return location.pathname === path;
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background shadow-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 lg:h-20">
                        {/* Logo Section */}
                        <div className="flex items-center space-x-3">
                            <Link to="/customer/services" className="flex items-center space-x-2 transition-transform duration-200 hover:scale-105">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary shadow-lg">
                                    <FaBolt className="h-5 w-5 text-accent" />
                                </div>
                                <span className="font-bold text-xl lg:text-2xl text-secondary">
                                    SAFEVOLT <span className="text-accent">SOLUTIONS</span>
                                </span>
                            </Link>
                        </div>

                        {/* Search Bar - Desktop */}
                        <div className="hidden md:flex flex-1 max-w-2xl mx-8">
                            <form onSubmit={handleSearch} className="w-full">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <FiSearch className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full pl-12 pr-16 py-3 border border-gray-300 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary focus:bg-background transition-all duration-200 text-sm shadow-sm hover:shadow-md"
                                        placeholder="Search for electrical services, repairs, installations..."
                                    />
                                    <button
                                        type="submit"
                                        className="absolute inset-y-0 right-0 pr-2 flex items-center"
                                    >
                                        <div className="bg-primary hover:bg-primary/90 text-background p-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105">
                                            <FiSearch className="h-4 w-4" />
                                        </div>
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Desktop Right Section */}
                        <div className="hidden lg:flex items-center space-x-3">
                            {/* Service Location */}
                            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200">
                                <FiMapPin className="h-5 w-5 text-accent" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500">Service to</span>
                                    <span className="text-sm font-medium text-secondary truncate max-w-28">
                                        {user?.address?.city || user?.city || 'Your Location'}
                                    </span>
                                </div>
                                <FiChevronDown className="h-4 w-4 text-gray-400" />
                            </div>

                            {/* My Bookings Link */}
                            <Link
                                to="/customer/bookings"
                                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200 group"
                            >
                                <FiCalendar className="h-5 w-5 text-secondary group-hover:text-primary transition-colors" />
                                <span className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">My Bookings</span>
                            </Link>

                            {/* Notifications */}
                            <button className="relative p-2 text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20">
                                <FiBell className="h-5 w-5" />
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full animate-pulse shadow-sm"></span>
                            </button>

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent hover:border-gray-200"
                                >
                                    {user?.profilePicUrl ? (
                                        <img
                                            src={user.profilePicUrl}
                                            alt="Profile"
                                            className="w-8 h-8 rounded-full object-cover border-2 border-primary shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-background font-semibold text-sm shadow-md">
                                            {getUserInitials()}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-secondary max-w-20 truncate">
                                        {user?.name || 'Customer'}
                                    </span>
                                    <FiChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Profile Dropdown Menu */}
                                {profileDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-64 bg-background rounded-xl shadow-xl border border-gray-200 py-2 z-20 animate-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <p className="text-sm font-semibold text-secondary">{user?.name || 'Customer'}</p>
                                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                        </div>
                                        <div className="py-2">
                                            <Link
                                                to="/customer/profile"
                                                className="flex items-center px-4 py-2 text-sm text-secondary hover:bg-primary/10 hover:text-primary transition-all duration-200"
                                                onClick={() => setProfileDropdownOpen(false)}
                                            >
                                                <FiUser className="mr-3 h-4 w-4" />
                                                Profile
                                            </Link>
                                            <Link
                                                to="/customer/bookings"
                                                className="flex items-center px-4 py-2 text-sm text-secondary hover:bg-primary/10 hover:text-primary transition-all duration-200"
                                                onClick={() => setProfileDropdownOpen(false)}
                                            >
                                                <FiCalendar className="mr-3 h-4 w-4" />
                                                Bookings
                                            </Link>
                                            <Link
                                                to="/customer/complaints"
                                                className="flex items-center px-4 py-2 text-sm text-secondary hover:bg-primary/10 hover:text-primary transition-all duration-200"
                                                onClick={() => setProfileDropdownOpen(false)}
                                            >
                                                <FiAlertCircle className="mr-3 h-4 w-4" />
                                                Complaints
                                            </Link>
                                        </div>
                                        <div className="border-t border-gray-100 pt-2">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-all duration-200"
                                            >
                                                <FiLogOut className="mr-3 h-4 w-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="lg:hidden flex items-center space-x-3">
                            {/* Notifications */}
                            <button className="relative p-2 text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200">
                                <FiBell className="h-5 w-5" />
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full animate-pulse"></span>
                            </button>
                            
                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                                aria-label="Toggle menu"
                            >
                                {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Search Bar */}
                    <div className="md:hidden px-4 pb-4">
                        <form onSubmit={handleSearch}>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary focus:bg-background transition-all duration-200 text-sm"
                                    placeholder="Search services..."
                                />
                                <button
                                    type="submit"
                                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                                >
                                    <div className="bg-primary hover:bg-primary/90 text-background p-1.5 rounded-md transition-all duration-200">
                                        <FiSearch className="h-3 w-3" />
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden bg-background border-t border-gray-200 shadow-lg">
                        <div className="px-4 py-4 space-y-2">
                            {navigationItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                                        isActiveRoute(item.path)
                                            ? 'text-primary bg-primary/10 border-l-4 border-primary'
                                            : 'text-secondary hover:text-primary hover:bg-primary/5'
                                    }`}
                                >
                                    {item.icon}
                                    <span>{item.name}</span>
                                </Link>
                            ))}
                            
                            {/* Mobile Profile Section */}
                            <div className="pt-4 border-t border-gray-200">
                                <div className="flex items-center space-x-3 px-4 py-3">
                                    {user?.profilePicUrl ? (
                                        <img
                                            src={user.profilePicUrl}
                                            alt="Profile"
                                            className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-background font-semibold">
                                            {getUserInitials()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold text-secondary">{user?.name || 'Customer'}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-3 w-full px-4 py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                                >
                                    <FiLogOut className="w-5 h-5" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Mobile Bottom Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-gray-200 z-30 shadow-lg">
                <div className="grid grid-cols-5 gap-1 py-2">
                    {navigationItems.slice(0, 5).map((item) => (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-all duration-200 ${
                                isActiveRoute(item.path)
                                    ? 'text-primary bg-primary/10'
                                    : 'text-gray-500 hover:text-primary hover:bg-primary/5'
                            }`}
                        >
                            <span className={`mb-1 ${isActiveRoute(item.path) ? 'text-primary' : 'text-gray-400'}`}>
                                {item.icon}
                            </span>
                            <span className="truncate text-[10px]">
                                {item.name === 'Dashboard' ? 'Home' : 
                                 item.name === 'Complaints' ? 'Help' : 
                                 item.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <main className="pb-20 lg:pb-0">
                <div className="py-4 lg:py-6">
                    <div className="w-full">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Click outside to close dropdowns */}
            {(mobileMenuOpen || profileDropdownOpen) && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => {
                        setMobileMenuOpen(false);
                        setProfileDropdownOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default CustomerLayout;
