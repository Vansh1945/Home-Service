
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import {
    Search,
    Calendar,
    User,
    Clock,
    MapPin,
    Eye,
    Trash2,
    Download,
    CheckCircle,
    XCircle,
    AlertCircle,
    UserCheck,
    CreditCard,
    ChevronDown,
    ChevronUp,
    BarChart2,
    DollarSign,
    Users,
    Briefcase,
    Edit,
    UserPlus,
    RefreshCw,
    TrendingUp,
    Activity,
    Filter,
    MoreHorizontal,
    Phone,
    Mail,
    Star,
    Award,
    Target
} from 'lucide-react';

// Skeleton Loading Component
const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-4 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
            <div className="flex items-center">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="ml-3">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
            </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
            <div className="flex items-center">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="ml-3">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
            </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
            <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
            <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
            </div>
        </td>
    </tr>
);

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 2000 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            
            setCount(Math.floor(progress * value));
            
            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <span>{count}</span>;
};

const AdminBookingsView = () => {
    const { token, API, showToast } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        accepted: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0
    });
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    // Filter states
    const [filters, setFilters] = useState({
        status: '',
        from: '',
        to: '',
        search: ''
    });

    // Status options
    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
    ];

    // Enhanced status colors with gradients
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200';
            case 'accepted': return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200';
            case 'completed': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200';
            case 'cancelled': return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200';
            default: return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200';
        }
    };

    // Status icons with animation
    const getStatusIcon = (status) => {
        const baseClass = "w-4 h-4 transition-transform duration-300 group-hover:scale-110";
        switch (status) {
            case 'pending': return <AlertCircle className={`${baseClass} animate-pulse`} />;
            case 'accepted': return <UserCheck className={baseClass} />;
            case 'completed': return <CheckCircle className={baseClass} />;
            case 'cancelled': return <XCircle className={baseClass} />;
            default: return <AlertCircle className={baseClass} />;
        }
    };

    // Fetch all providers
    const fetchProviders = async () => {
        try {
            const response = await fetch(`${API}/admin/providers`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch providers');
            }

            const data = await response.json();
            setProviders(data.providers || data.data || []);
        } catch (error) {
            console.error('Error fetching providers:', error);
            showToast('Failed to fetch providers', 'error');
        }
    };

    // Calculate stats from bookings
    const calculateStats = (bookings) => {
        const stats = {
            total: bookings.length,
            pending: 0,
            accepted: 0,
            completed: 0,
            cancelled: 0,
            revenue: 0
        };

        bookings.forEach(booking => {
            if (booking.status) {
                stats[booking.status] = (stats[booking.status] || 0) + 1;
            }
            if (booking.status === 'completed' || booking.status === 'accepted') {
                stats.revenue += booking.totalAmount || 0;
            }
        });

        return stats;
    };

    // Fetch bookings
    const fetchBookings = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();

            // Map filters to backend expected params
            if (filters.status && filters.status.trim() !== '') {
                queryParams.append('status', filters.status);
            }
            if (filters.from && filters.from.trim() !== '') {
                queryParams.append('startDate', filters.from);
            }
            if (filters.to && filters.to.trim() !== '') {
                queryParams.append('endDate', filters.to);
            }
            if (filters.search && filters.search.trim() !== '') {
                queryParams.append('search', filters.search);
            }

            const response = await fetch(`${API}/booking/admin/bookings?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookings');
            }

            const data = await response.json();
            const fetchedBookings = Array.isArray(data.data) ? data.data : 
                                   Array.isArray(data.bookings) ? data.bookings : [];

            setBookings(fetchedBookings);
            setStats(calculateStats(fetchedBookings));
        } catch (error) {
            console.error('Error fetching bookings:', error);
            showToast('Failed to fetch bookings', 'error');
        } finally {
            setLoading(false);
            if (initialLoad) setInitialLoad(false);
        }
    };

    // Fetch booking details
    const fetchBookingDetails = async (bookingId) => {
        try {
            setLoading(true);
            console.log('Fetching booking details for ID:', bookingId);
            
            // Try multiple possible endpoints
            let response;
            let data;
            
            // First try the admin-specific endpoint
            try {
                response = await fetch(`${API}/booking/admin/bookings/${bookingId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    data = await response.json();
                    console.log('Admin endpoint response:', data);
                }
            } catch (adminError) {
                console.log('Admin endpoint failed, trying general endpoint');
            }
            
            // If admin endpoint fails, try the general endpoint
            if (!response || !response.ok) {
                response = await fetch(`${API}/booking/bookings/${bookingId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch booking details: ${response.status} ${response.statusText}`);
                }
                
                data = await response.json();
                console.log('General endpoint response:', data);
            }

            // Try different possible data structures
            const bookingData = data.data || data.booking || data;
            console.log('Processed booking data:', bookingData);
            
            if (!bookingData || !bookingData._id) {
                // If no detailed data, use the booking from the list
                const listBooking = bookings.find(b => b._id === bookingId);
                if (listBooking) {
                    console.log('Using booking from list:', listBooking);
                    setSelectedBooking(listBooking);
                } else {
                    throw new Error('No booking data found');
                }
            } else {
                setSelectedBooking(bookingData);
            }
            
            setShowModal(true);
        } catch (error) {
            console.error('Error fetching booking details:', error);
            showToast(`Failed to fetch booking details: ${error.message}`, 'error');
            
            // Fallback: try to use booking data from the list
            const listBooking = bookings.find(b => b._id === bookingId);
            if (listBooking) {
                console.log('Fallback: using booking from list');
                setSelectedBooking(listBooking);
                setShowModal(true);
            }
        } finally {
            setLoading(false);
        }
    };

    // Delete booking
    const deleteBooking = async (bookingId) => {
        try {
            setLoading(true);
            const response = await fetch(`${API}/booking/admin/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete booking');
            }

            showToast('Booking deleted successfully', 'success');
            setDeleteConfirm(null);
            fetchBookings();
        } catch (error) {
            console.error('Error deleting booking:', error);
            showToast('Failed to delete booking', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Delete user booking
    const deleteUserBooking = async (userId, bookingId) => {
        try {
            setLoading(true);
            const response = await fetch(`${API}/booking/admin/user/${userId}/booking/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete user booking');
            }

            showToast('User booking deleted successfully', 'success');
            setDeleteConfirm(null);
            fetchBookings();
        } catch (error) {
            console.error('Error deleting user booking:', error);
            showToast('Failed to delete user booking', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Assign provider to booking
    const assignProvider = async (bookingId, providerId) => {
        try {
            setLoading(true);
            const response = await fetch(`${API}/booking/admin/${bookingId}/assign`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ providerId })
            });

            if (!response.ok) {
                throw new Error('Failed to assign provider');
            }

            showToast('Provider assigned successfully', 'success');
            fetchBookings();
            if (selectedBooking) {
                fetchBookingDetails(selectedBooking._id);
            }
        } catch (error) {
            console.error('Error assigning provider:', error);
            showToast('Failed to assign provider', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Reschedule booking
    const rescheduleBooking = async (bookingId, newDate, newTime) => {
        try {
            setLoading(true);
            const body = {};
            if (newDate) body.date = newDate;
            if (newTime) body.time = newTime;
            
            if (Object.keys(body).length === 0) {
                throw new Error('Please provide date or time to reschedule');
            }

            const response = await fetch(`${API}/booking/admin/${bookingId}/reschedule`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error('Failed to reschedule booking');
            }

            showToast('Booking rescheduled successfully', 'success');
            fetchBookings();
            if (selectedBooking) {
                fetchBookingDetails(selectedBooking._id);
            }
            setShowModal(false);
        } catch (error) {
            console.error('Error rescheduling booking:', error);
            showToast('Failed to reschedule booking', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle filter change with debounce
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            status: '',
            from: '',
            to: '',
            search: ''
        });
    };

    // Export bookings
    const exportBookings = () => {
        const headers = [
            'Booking ID',
            'Customer Name',
            'Customer Email',
            'Customer Phone',
            'Provider Name',
            'Provider Email',
            'Provider Phone',
            'Services',
            'Booking Date',
            'Booking Time',
            'Status',
            'Street Address',
            'City',
            'Postal Code',
            'State',
            'Country',
            'Payment Method',
            'Payment Status',
            'Coupon Applied',
            'Total Discount',
            'Total Amount',
            'Created At'
        ];

        const rows = bookings.map(booking => {
            const servicesList = booking.services?.map(s => 
                `${s.service?.title || 'N/A'} (Qty: ${s.quantity || 1})`
            ).join('; ') || 'N/A';

            return [
                booking._id || 'N/A',
                booking.customer?.name || 'N/A',
                booking.customer?.email || 'N/A',
                booking.customer?.phone || 'N/A',
                booking.provider?.businessName || booking.provider?.name || 'N/A',
                booking.provider?.email || 'N/A',
                booking.provider?.phone || 'N/A',
                servicesList,
                formatDate(booking.date),
                booking.time || 'N/A',
                booking.status || 'N/A',
                booking.address?.street || 'N/A',
                booking.address?.city || 'N/A',
                booking.address?.postalCode || 'N/A',
                booking.address?.state || 'N/A',
                booking.address?.country || 'N/A',
                booking.paymentMethod || 'N/A',
                booking.paymentStatus || 'N/A',
                booking.couponApplied || 'N/A',
                booking.totalDiscount || '0.00',
                booking.totalAmount || '0.00',
                booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'N/A'
            ];
        });

        // Add BOM (Byte Order Mark) for UTF-8 encoding
        const BOM = "\uFEFF";
        const csvContent = BOM + [headers, ...rows]
            .map(row => row.map(field => {
                if (typeof field === 'string') {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            }).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast('Bookings exported successfully', 'success');
    };

    // Debounce filter changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!initialLoad) {
                fetchBookings();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [filters]);

    useEffect(() => {
        fetchBookings();
        fetchProviders();
    }, []);

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (time) => {
        if (!time) return 'N/A';
        return time;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    const getPaymentMethodIcon = (method) => {
        switch (method?.toLowerCase()) {
            case 'credit_card': return <CreditCard className="w-4 h-4 mr-1" />;
            case 'wallet': return <Briefcase className="w-4 h-4 mr-1" />;
            case 'cash': return <DollarSign className="w-4 h-4 mr-1" />;
            default: return <CreditCard className="w-4 h-4 mr-1" />;
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Enhanced Header */}
                <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-8 backdrop-blur-sm bg-white/95">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent">
                                Admin Bookings Management
                            </h1>
                            <p className="text-gray-600 flex items-center">
                                <Activity className="w-4 h-4 mr-2 text-blue-500" />
                                View and manage all system bookings with advanced controls
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={fetchBookings}
                                disabled={loading}
                                className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <button
                                onClick={exportBookings}
                                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Enhanced Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent"></div>
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Total Bookings</p>
                                    <p className="text-3xl font-bold text-white mt-1">
                                        <AnimatedCounter value={stats.total} />
                                    </p>
                                    <div className="flex items-center mt-2 text-blue-100 text-xs">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        All time
                                    </div>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <BarChart2 className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="group relative bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-transparent"></div>
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <p className="text-amber-100 text-sm font-medium">Pending</p>
                                    <p className="text-3xl font-bold text-white mt-1">
                                        <AnimatedCounter value={stats.pending} />
                                    </p>
                                    <div className="flex items-center mt-2 text-amber-100 text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Awaiting action
                                    </div>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <AlertCircle className="w-8 h-8 text-white animate-pulse" />
                                </div>
                            </div>
                        </div>

                        <div className="group relative bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent"></div>
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-100 text-sm font-medium">Completed</p>
                                    <p className="text-3xl font-bold text-white mt-1">
                                        <AnimatedCounter value={stats.completed} />
                                    </p>
                                    <div className="flex items-center mt-2 text-emerald-100 text-xs">
                                        <Award className="w-3 h-3 mr-1" />
                                        Successfully done
                                    </div>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <CheckCircle className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="group relative bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent"></div>
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Total Revenue</p>
                                    <p className="text-2xl font-bold text-white mt-1">
                                        {formatCurrency(stats.revenue)}
                                    </p>
                                    <div className="flex items-center mt-2 text-purple-100 text-xs">
                                        <Target className="w-3 h-3 mr-1" />
                                        Earnings
                                    </div>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <DollarSign className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Filters */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-2xl border border-gray-200 mb-6">
                        <div className="flex items-center mb-4">
                            <Filter className="w-5 h-5 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-800">Filter & Search</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Search</label>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search bookings..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm hover:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm hover:bg-white"
                                >
                                    {statusOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">From Date</label>
                                <input
                                    type="date"
                                    value={filters.from}
                                    onChange={(e) => handleFilterChange('from', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm hover:bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">To Date</label>
                                <input
                                    type="date"
                                    value={filters.to}
                                    onChange={(e) => handleFilterChange('to', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm hover:bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="text-sm text-gray-600 flex items-center">
                                <Users className="w-4 h-4 mr-2 text-blue-500" />
                                Showing <span className="font-semibold mx-1">{bookings.length}</span> bookings
                            </div>
                            <button
                                onClick={clearFilters}
                                className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                            >
                                <XCircle className="w-4 h-4 mr-1" />
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Enhanced Bookings Table */}
                <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden backdrop-blur-sm bg-white/95">
                    {loading && initialLoad ? (
                        <div className="text-center py-16">
                            <div className="relative">
                                <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                                <div className="absolute inset-0 w-12 h-12 mx-auto border-4 border-blue-200 rounded-full animate-ping"></div>
                            </div>
                            <p className="text-gray-600 text-lg">Loading bookings...</p>
                            <p className="text-gray-400 text-sm mt-2">Please wait while we fetch the latest data</p>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="relative mb-6">
                                <Calendar className="w-20 h-20 text-gray-300 mx-auto" />
                                <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-gray-200 rounded-full animate-pulse"></div>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
                            <p className="text-gray-600 mb-4">Try adjusting your filters or search terms to find bookings.</p>
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <BarChart2 className="w-4 h-4 mr-2" />
                                                Booking ID
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <User className="w-4 h-4 mr-2" />
                                                Customer
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                                            <div className="flex items-center">
                                                <UserCheck className="w-4 h-4 mr-2" />
                                                Provider
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <Briefcase className="w-4 h-4 mr-2" />
                                                Services
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">
                                            <div className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                Date & Time
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <Activity className="w-4 h-4 mr-2" />
                                                Status
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <MoreHorizontal className="w-4 h-4 mr-2" />
                                                Actions
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading && !initialLoad ? (
                                        // Show skeleton rows during filtering/search
                                        Array.from({ length: 5 }).map((_, index) => (
                                            <SkeletonRow key={index} />
                                        ))
                                    ) : (
                                        bookings.map((booking) => (
                                            <tr key={booking._id || Math.random().toString(36).substr(2, 9)} 
                                                className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 transform hover:scale-[1.01]">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                        <div className="text-sm font-bold text-blue-900 font-mono">
                                                            #{booking._id ? booking._id.substring(booking._id.length - 8) : 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
                                                            <User className="w-6 h-6 text-blue-600" />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                                                                {booking.customer?.name || 'N/A'}
                                                            </div>
                                                            <div className="text-sm text-gray-600 flex items-center">
                                                                <Mail className="w-3 h-3 mr-1" />
                                                                {booking.customer?.email || 'N/A'}
                                                            </div>
                                                            {booking.customer?.phone && (
                                                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                                                    <Phone className="w-3 h-3 mr-1" />
                                                                    {booking.customer.phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
                                                            {booking.provider ? (
                                                                <UserCheck className="w-6 h-6 text-green-600" />
                                                            ) : (
                                                                <User className="w-6 h-6 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                                                                {booking.provider?.businessName || booking.provider?.name || 'Unassigned'}
                                                            </div>
                                                            <div className="text-sm text-gray-600 flex items-center">
                                                                <Mail className="w-3 h-3 mr-1" />
                                                                {booking.provider?.email || 'N/A'}
                                                            </div>
                                                            {booking.provider?.phone && (
                                                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                                                    <Phone className="w-3 h-3 mr-1" />
                                                                    {booking.provider.phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="space-y-2">
                                                        <div className="text-sm font-semibold text-blue-900 flex items-center">
                                                            <Star className="w-4 h-4 mr-1 text-yellow-500" />
                                                            {booking.services?.[0]?.service?.title || 'N/A'}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {booking.services?.[0]?.service?.category || 'N/A'} 
                                                            {booking.services?.length > 1 && (
                                                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                    +{booking.services.length - 1} more
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-lg font-bold text-green-600 flex items-center">
                                                            <DollarSign className="w-4 h-4 mr-1" />
                                                            {formatCurrency(booking.totalAmount)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center text-sm font-medium text-blue-900">
                                                            <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                                            {formatDate(booking.date)}
                                                        </div>
                                                        {booking.time && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                                                {formatTime(booking.time)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`group inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border transition-all duration-300 hover:scale-105 ${getStatusColor(booking.status)}`}>
                                                        {getStatusIcon(booking.status)}
                                                        <span className="ml-2 capitalize">{booking.status || 'N/A'}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => booking._id && fetchBookingDetails(booking._id)}
                                                            className="group p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-110 shadow-md hover:shadow-lg"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                        {booking.status === 'pending' && booking._id && (
                                                            <button
                                                                onClick={() => setDeleteConfirm({
                                                                    id: booking._id,
                                                                    userId: booking.customer?._id
                                                                })}
                                                                className="group p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-110 shadow-md hover:shadow-lg"
                                                                title="Delete Booking"
                                                            >
                                                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Enhanced Booking Details Modal */}
                {showModal && selectedBooking && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-blue-900">Booking Details</h2>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Booking Info */}
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <h3 className="font-semibold text-blue-900 mb-3">Booking Information</h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm text-gray-600">Booking ID</p>
                                                    <p className="font-medium text-blue-900">{selectedBooking._id || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Date</p>
                                                    <p className="font-medium text-blue-900">{formatDate(selectedBooking.date)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Time</p>
                                                    <p className="font-medium text-blue-900">{selectedBooking.time || 'Not specified'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Status</p>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                                                        {getStatusIcon(selectedBooking.status)}
                                                        <span className="ml-1 capitalize">{selectedBooking.status || 'N/A'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer Info */}
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <h3 className="font-semibold text-blue-900 mb-3">Customer Information</h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm text-gray-600">Name</p>
                                                    <p className="font-medium text-blue-900">{selectedBooking.customer?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Email</p>
                                                    <p className="font-medium text-blue-900">{selectedBooking.customer?.email || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Phone</p>
                                                    <p className="font-medium text-blue-900">{selectedBooking.customer?.phone || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">User ID</p>
                                                    <p className="font-medium text-blue-900">{selectedBooking.customer?._id || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Service & Address */}
                                    <div className="space-y-4">
                                        {/* Service Info */}
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <h3 className="font-semibold text-blue-900 mb-3">Services Information</h3>
                                            {selectedBooking.services?.map((serviceItem, index) => (
                                                <div key={index} className="space-y-3 mb-4 last:mb-0">
                                                    <div>
                                                        <p className="text-sm text-gray-600">Service #{index + 1}</p>
                                                        <p className="font-medium text-blue-900">{serviceItem.service?.title || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Category</p>
                                                        <p className="font-medium text-blue-900">{serviceItem.service?.category || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Description</p>
                                                        <p className="font-medium text-blue-900">{serviceItem.service?.description || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Quantity</p>
                                                        <p className="font-medium text-blue-900">{serviceItem.quantity || 1}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Price</p>
                                                        <p className="font-medium text-blue-900">{formatCurrency(serviceItem.price)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Discount</p>
                                                        <p className="font-medium text-blue-900">{formatCurrency(serviceItem.discountAmount)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {!selectedBooking.services?.length && (
                                                <p className="text-sm text-gray-600">No services found</p>
                                            )}
                                        </div>

                                        {/* Provider Assignment - Only show for pending bookings */}
                                        {selectedBooking.status === 'pending' && (
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <h3 className="font-semibold text-blue-900 mb-3">Provider Assignment</h3>
                                                {selectedBooking.provider ? (
                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className="text-sm text-gray-600">Current Provider</p>
                                                            <p className="font-medium text-blue-900">{selectedBooking.provider.businessName || selectedBooking.provider.name || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-600">Email</p>
                                                            <p className="font-medium text-blue-900">{selectedBooking.provider.email || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-600">Phone</p>
                                                            <p className="font-medium text-blue-900">{selectedBooking.provider.phone || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-600">No provider assigned yet</p>
                                                )}
                                                
                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign New Provider</label>
                                                    <select
                                                        onChange={(e) => selectedBooking._id && assignProvider(selectedBooking._id, e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>Select a provider</option>
                                                        {providers.map(provider => (
                                                            <option key={provider._id} value={provider._id}>
                                                                {provider.businessName || provider.name} ({provider.email})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {/* Address */}
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <h3 className="font-semibold text-blue-900 mb-3">Service Address</h3>
                                            <div className="flex items-start">
                                                <MapPin className="w-4 h-4 mt-1 mr-2 text-blue-600" />
                                                <div>
                                                    <p className="font-medium text-blue-900">{selectedBooking.address?.street || 'N/A'}</p>
                                                    <p className="font-medium text-blue-900">{selectedBooking.address?.city || 'N/A'}, {selectedBooking.address?.postalCode || 'N/A'}</p>
                                                    <p className="font-medium text-blue-900">{selectedBooking.address?.state || 'N/A'}, {selectedBooking.address?.country || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Info */}
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <h3 className="font-semibold text-blue-900 mb-3">Payment Information</h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm text-gray-600">Payment Method</p>
                                                    <div className="flex items-center">
                                                        {getPaymentMethodIcon(selectedBooking.paymentMethod)}
                                                        <span className="font-medium text-blue-900 capitalize">{selectedBooking.paymentMethod || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Payment Status</p>
                                                    <p className="font-medium text-blue-900">{selectedBooking.paymentStatus || 'N/A'}</p>
                                                </div>
                                                {selectedBooking.couponApplied && (
                                                    <div>
                                                        <p className="text-sm text-gray-600">Coupon Applied</p>
                                                        <p className="font-medium text-blue-900">{selectedBooking.couponApplied}</p>
                                                    </div>
                                                )}
                                                {selectedBooking.totalDiscount > 0 && (
                                                    <div>
                                                        <p className="text-sm text-gray-600">Total Discount</p>
                                                        <p className="font-medium text-blue-900">{formatCurrency(selectedBooking.totalDiscount)}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm text-gray-600">Total Amount</p>
                                                    <p className="font-bold text-blue-900">{formatCurrency(selectedBooking.totalAmount)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reschedule Booking - Only show for pending bookings */}
                                        {selectedBooking.status === 'pending' && (
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <h3 className="font-semibold text-blue-900 mb-3">Reschedule Booking</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                                                        <input
                                                            type="date"
                                                            id="newDate"
                                                            min={new Date().toISOString().split('T')[0]}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Time</label>
                                                        <input
                                                            type="time"
                                                            id="newTime"
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newDate = document.getElementById('newDate').value;
                                                        const newTime = document.getElementById('newTime').value;
                                                        rescheduleBooking(selectedBooking._id, newDate, newTime);
                                                    }}
                                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    <Edit className="w-4 h-4 mr-2 inline" />
                                                    Reschedule Booking
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <div className="flex items-center mb-4">
                                <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                                <h3 className="text-lg font-semibold text-blue-900">Confirm Deletion</h3>
                            </div>
                            <p className="text-gray-700 mb-6">
                                Are you sure you want to delete this booking? This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (deleteConfirm.userId && deleteConfirm.id) {
                                            deleteUserBooking(deleteConfirm.userId, deleteConfirm.id);
                                        } else if (deleteConfirm.id) {
                                            deleteBooking(deleteConfirm.id);
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminBookingsView;