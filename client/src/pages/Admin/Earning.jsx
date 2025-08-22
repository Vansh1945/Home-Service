import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../store/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FaDownload, FaMoneyBillWave, FaUsers, FaCalendarAlt, FaChartPie, FaSearch, FaFilter, FaEye, FaCheck, FaTimes } from 'react-icons/fa';
import { FiArrowRight, FiArrowLeft, FiRefreshCw, FiLogOut, FiTrendingUp, FiDollarSign } from 'react-icons/fi';

const COLORS = ['#1e3a8a', '#2563eb', '#312e81', '#facc15', '#eab308', '#10b981', '#f59e0b'];

const AdminEarnings = () => {
    const { API, isAdmin, logoutUser, showToast, token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Dashboard Stats
    const [dashboardStats, setDashboardStats] = useState({
        totalGross: 0,
        totalCommission: 0,
        totalNet: 0,
        pendingCount: 0,
        totalProviders: 0,
        activeProviders: 0,
        totalBookings: 0,
        completedBookings: 0
    });

    // Data States
    const [earnings, setEarnings] = useState([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [topProviders, setTopProviders] = useState([]);
    const [allProviders, setAllProviders] = useState([]);
    const [allBookings, setAllBookings] = useState([]);
    const [adminEarnings, setAdminEarnings] = useState([]);

    // UI States
    const [selectedTab, setSelectedTab] = useState('dashboard');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processingStatus, setProcessingStatus] = useState('completed');
    const [transactionId, setTransactionId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Check admin authorization
    useEffect(() => {
        if (!isAdmin) {
            showToast('Unauthorized access. Admin privileges required.', 'error');
            logoutUser();
            return;
        }
    }, [isAdmin]);

    // Fetch all data on component mount and when date range changes
    useEffect(() => {
        if (!isAdmin) return;
        
        const fetchAllData = async () => {
            try {
                setLoading(true);
                await Promise.all([
                    fetchDashboardStats(),
                    fetchProviderEarnings(),
                    fetchWithdrawalRequests(),
                    fetchTopProviders(),
                    fetchAllProviders(),
                    fetchAllBookings(),
                    fetchAdminEarnings()
                ]);
            } catch (error) {
                console.error('Error fetching data:', error);
                showToast(error.message || 'Failed to load data', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [startDate, endDate, isAdmin]);

    // API Headers
    const getHeaders = () => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    });

    // Fetch Dashboard Statistics
    const fetchDashboardStats = async () => {
        try {
            const response = await fetch(`${API}/admin/dashboard/stats`, {
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                const stats = data.data;
                setDashboardStats({
                    totalGross: stats.overview?.totalRevenue || 0,
                    totalCommission: stats.overview?.totalRevenue * 0.1 || 0, // Assuming 10% commission
                    totalNet: stats.overview?.totalRevenue * 0.9 || 0,
                    pendingCount: stats.overview?.bookingStatus?.pending || 0,
                    totalProviders: stats.providers?.total || 0,
                    activeProviders: stats.providers?.approved || 0,
                    totalBookings: stats.overview?.totalBookings || 0,
                    completedBookings: stats.overview?.bookingStatus?.completed || 0
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            showToast('Failed to fetch dashboard statistics', 'error');
        }
    };

    // Fetch Provider Earnings
    const fetchProviderEarnings = async () => {
        try {
            const queryParams = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage
            });

            const response = await fetch(`${API}/payment/admin/earnings?${queryParams}`, {
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                setEarnings(data.data?.earnings || []);
            } else {
                throw new Error(data.message || 'Failed to fetch earnings');
            }
        } catch (error) {
            console.error('Error fetching earnings:', error);
            showToast('Failed to fetch provider earnings', 'error');
            setEarnings([]);
        }
    };

    // Fetch Withdrawal Requests
    const fetchWithdrawalRequests = async () => {
        try {
            const queryParams = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage
            });

            if (statusFilter !== 'all') {
                queryParams.append('status', statusFilter);
            }

            const response = await fetch(`${API}/payment/admin/requests?${queryParams}`, {
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                setWithdrawalRequests(data.data?.requests || []);
            } else {
                throw new Error(data.message || 'Failed to fetch withdrawal requests');
            }
        } catch (error) {
            console.error('Error fetching withdrawal requests:', error);
            showToast('Failed to fetch withdrawal requests', 'error');
            setWithdrawalRequests([]);
        }
    };

    // Fetch Top Providers
    const fetchTopProviders = async () => {
        try {
            const response = await fetch(`${API}/payment/admin/top-providers?limit=10&period=month`, {
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                setTopProviders(data.data || []);
            } else {
                throw new Error(data.message || 'Failed to fetch top providers');
            }
        } catch (error) {
            console.error('Error fetching top providers:', error);
            showToast('Failed to fetch top providers', 'error');
            setTopProviders([]);
        }
    };

    // Fetch All Providers
    const fetchAllProviders = async () => {
        try {
            const queryParams = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage
            });

            if (searchTerm) {
                queryParams.append('search', searchTerm);
            }

            const response = await fetch(`${API}/admin/providers?${queryParams}`, {
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                setAllProviders(data.providers || []);
            } else {
                throw new Error(data.message || 'Failed to fetch providers');
            }
        } catch (error) {
            console.error('Error fetching providers:', error);
            showToast('Failed to fetch providers', 'error');
            setAllProviders([]);
        }
    };

    // Fetch All Bookings
    const fetchAllBookings = async () => {
        try {
            const queryParams = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage
            });

            const response = await fetch(`${API}/booking/admin/bookings?${queryParams}`, {
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                setAllBookings(data.bookings || []);
            } else {
                throw new Error(data.message || 'Failed to fetch bookings');
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            showToast('Failed to fetch bookings', 'error');
            setAllBookings([]);
        }
    };

    // Fetch Admin Earnings (Platform Revenue)
    const fetchAdminEarnings = async () => {
        try {
            const queryParams = new URLSearchParams({
                page: 1,
                limit: 100
            });

            const response = await fetch(`${API}/payment/admin/earnings?${queryParams}`, {
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                // Calculate admin earnings from commission
                const adminEarningsData = (data.data?.earnings || []).map(earning => ({
                    date: earning.createdAt,
                    commission: earning.commissionAmount || 0,
                    service: earning.booking?.service?.name || 'Unknown Service',
                    provider: earning.provider?.name || 'Unknown Provider'
                }));
                setAdminEarnings(adminEarningsData);
            }
        } catch (error) {
            console.error('Error fetching admin earnings:', error);
            setAdminEarnings([]);
        }
    };

    // Process Booking Payment
    const processBookingPayment = async (bookingId) => {
        try {
            setRefreshing(true);
            const response = await fetch(`${API}/payment/admin/bookings/${bookingId}/process-payment`, {
                method: 'POST',
                headers: getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                showToast('Payment processed successfully');
                await Promise.all([
                    fetchProviderEarnings(),
                    fetchAllBookings(),
                    fetchDashboardStats()
                ]);
            } else {
                throw new Error(data.message || 'Failed to process payment');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            showToast(error.message || 'Failed to process payment', 'error');
        } finally {
            setRefreshing(false);
        }
    };

    // Handle Process Withdrawal
    const handleProcessWithdrawal = async () => {
        if (!selectedRequest) return;

        try {
            setRefreshing(true);
            const response = await fetch(`${API}/payment/admin/process/${selectedRequest._id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    status: processingStatus,
                    transactionId: transactionId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                showToast(`Withdrawal ${processingStatus} successfully`);
                setSelectedRequest(null);
                setTransactionId('');
                await Promise.all([
                    fetchWithdrawalRequests(),
                    fetchDashboardStats()
                ]);
            } else {
                throw new Error(data.message || 'Failed to process withdrawal');
            }
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            showToast(error.message || 'Failed to process withdrawal', 'error');
        } finally {
            setRefreshing(false);
        }
    };

    // Download Report
    const downloadReport = async (type) => {
        try {
            setRefreshing(true);
            const endpoint = type === 'pdf' ? 'generate-report' : 'generate-report-excel';
            const queryParams = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            const response = await fetch(`${API}/payment/admin/${endpoint}?${queryParams}`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to download report');
            }

            // Create blob from response
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `admin-earnings-report.${type === 'pdf' ? 'pdf' : 'xlsx'}`);
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showToast(`${type.toUpperCase()} report downloaded successfully`);
        } catch (error) {
            console.error('Error downloading report:', error);
            showToast(error.message || 'Failed to download report', 'error');
        } finally {
            setRefreshing(false);
        }
    };

    // Refresh Data
    const refreshData = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchDashboardStats(),
                fetchProviderEarnings(),
                fetchWithdrawalRequests(),
                fetchTopProviders(),
                fetchAllProviders(),
                fetchAllBookings(),
                fetchAdminEarnings()
            ]);
            showToast('Data refreshed successfully');
        } catch (error) {
            showToast('Failed to refresh data', 'error');
        } finally {
            setRefreshing(false);
        }
    };

    // Chart Data Processing
    const earningsChartData = useMemo(() => {
        const statusMap = {
            pending: { name: 'Pending', value: 0, color: '#facc15' },
            available: { name: 'Available', value: 0, color: '#10b981' },
            processing: { name: 'Processing', value: 0, color: '#2563eb' },
            paid: { name: 'Paid', value: 0, color: '#1e3a8a' }
        };

        earnings.forEach(earning => {
            if (statusMap[earning.status]) {
                statusMap[earning.status].value += earning.netAmount || 0;
            }
        });

        return Object.values(statusMap).filter(item => item.value > 0);
    }, [earnings]);

    const withdrawalChartData = useMemo(() => {
        const statusMap = {
            pending: { name: 'Pending', value: 0, color: '#facc15' },
            processing: { name: 'Processing', value: 0, color: '#2563eb' },
            completed: { name: 'Completed', value: 0, color: '#10b981' },
            rejected: { name: 'Rejected', value: 0, color: '#ef4444' }
        };

        withdrawalRequests.forEach(request => {
            if (statusMap[request.status]) {
                statusMap[request.status].value += request.amount || 0;
            }
        });

        return Object.values(statusMap).filter(item => item.value > 0);
    }, [withdrawalRequests]);

    const monthlyEarningsData = useMemo(() => {
        const monthlyData = {};
        
        earnings.forEach(earning => {
            const month = format(new Date(earning.createdAt), 'MMM yyyy');
            if (!monthlyData[month]) {
                monthlyData[month] = { 
                    name: month, 
                    gross: 0, 
                    commission: 0, 
                    net: 0 
                };
            }
            monthlyData[month].gross += earning.grossAmount || 0;
            monthlyData[month].commission += earning.commissionAmount || 0;
            monthlyData[month].net += earning.netAmount || 0;
        });

        return Object.values(monthlyData).slice(-6); // Last 6 months
    }, [earnings]);

    const adminRevenueData = useMemo(() => {
        const revenueData = {};
        
        adminEarnings.forEach(earning => {
            const month = format(new Date(earning.date), 'MMM yyyy');
            if (!revenueData[month]) {
                revenueData[month] = { name: month, revenue: 0 };
            }
            revenueData[month].revenue += earning.commission || 0;
        });

        return Object.values(revenueData).slice(-6);
    }, [adminEarnings]);

    // Filter functions
    const filteredWithdrawals = useMemo(() => {
        return withdrawalRequests.filter(request => {
            const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
            const matchesSearch = !searchTerm || 
                request.provider?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                request.provider?.email?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [withdrawalRequests, statusFilter, searchTerm]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-blue-50">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"
                />
                <span className="ml-4 text-blue-900 font-medium">Loading admin earnings data...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-blue-50">
            {/* Header */}
            <header className="bg-blue-900 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Admin Earnings Dashboard</h1>
                        <p className="text-blue-200 mt-1">Manage platform earnings and provider payments</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={refreshData}
                            disabled={refreshing}
                            className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-600 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> 
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button
                            onClick={logoutUser}
                            className="px-4 py-2 bg-yellow-500 text-blue-900 rounded-md hover:bg-yellow-400 transition flex items-center gap-2"
                        >
                            <FiLogOut /> Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8 overflow-x-auto">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: FaChartPie },
                            { id: 'earnings', label: 'Provider Earnings', icon: FaMoneyBillWave },
                            { id: 'withdrawals', label: 'Withdrawals', icon: FiRefreshCw },
                            { id: 'topProviders', label: 'Top Providers', icon: FaUsers },
                            { id: 'allProviders', label: 'All Providers', icon: FaUsers },
                            { id: 'bookings', label: 'Bookings', icon: FaCalendarAlt },
                            { id: 'adminRevenue', label: 'Platform Revenue', icon: FiDollarSign }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedTab(tab.id)}
                                    className={`px-3 py-4 text-sm font-medium flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors ${
                                        selectedTab === tab.id 
                                            ? 'border-blue-600 text-blue-900' 
                                            : 'border-transparent text-gray-500 hover:text-blue-900 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" /> {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                {/* Date Range Selector */}
                <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h2 className="text-lg font-medium text-blue-900 flex items-center gap-2">
                            <FaCalendarAlt /> Date Range Filter
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">From:</label>
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date) => setStartDate(date)}
                                    selectsStart
                                    startDate={startDate}
                                    endDate={endDate}
                                    className="border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    dateFormat="MMM dd, yyyy"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">To:</label>
                                <DatePicker
                                    selected={endDate}
                                    onChange={(date) => setEndDate(date)}
                                    selectsEnd
                                    startDate={startDate}
                                    endDate={endDate}
                                    minDate={startDate}
                                    className="border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    dateFormat="MMM dd, yyyy"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => downloadReport('pdf')}
                                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm flex items-center gap-1"
                                >
                                    <FaDownload /> PDF
                                </button>
                                <button
                                    onClick={() => downloadReport('excel')}
                                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm flex items-center gap-1"
                                >
                                    <FaDownload /> Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Tab */}
                {selectedTab === 'dashboard' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-8"
                    >
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                                        <p className="mt-2 text-3xl font-bold text-blue-600">
                                            ${dashboardStats.totalGross.toFixed(2)}
                                        </p>
                                    </div>
                                    <FiDollarSign className="w-8 h-8 text-blue-600" />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">Platform gross earnings</p>
                            </div>
                            
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500">Admin Commission</h3>
                                        <p className="mt-2 text-3xl font-bold text-green-600">
                                            ${dashboardStats.totalCommission.toFixed(2)}
                                        </p>
                                    </div>
                                    <FiTrendingUp className="w-8 h-8 text-green-600" />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">Platform commission earned</p>
                            </div>
                            
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500">Provider Payments</h3>
                                        <p className="mt-2 text-3xl font-bold text-indigo-600">
                                            ${dashboardStats.totalNet.toFixed(2)}
                                        </p>
                                    </div>
                                    <FaMoneyBillWave className="w-8 h-8 text-indigo-600" />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">Paid to providers</p>
                            </div>
                            
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500">Active Providers</h3>
                                        <p className="mt-2 text-3xl font-bold text-purple-600">
                                            {dashboardStats.activeProviders}
                                        </p>
                                    </div>
                                    <FaUsers className="w-8 h-8 text-purple-600" />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">Out of {dashboardStats.totalProviders} total</p>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Revenue Trend</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={adminRevenueData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']} />
                                            <Legend />
                                            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Platform Revenue" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Provider Earnings Trend</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={monthlyEarningsData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
                                            <Legend />
                                            <Area type="monotone" dataKey="net" stackId="1" stroke="#2563eb" fill="#2563eb" name="Provider Net" />
                                            <Area type="monotone" dataKey="commission" stackId="1" stroke="#10b981" fill="#10b981" name="Platform Commission" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Commission Summary</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-500">Total Commission Earned</span>
                                        <span className="text-lg font-bold text-green-600">
                                            ${adminEarnings.reduce((sum, earning) => sum + (earning.commission || 0), 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-500">Average Commission per Service</span>
                                        <span className="text-lg font-bold text-blue-600">
                                            ${adminEarnings.length > 0 ? (adminEarnings.reduce((sum, earning) => sum + (earning.commission || 0), 0) / adminEarnings.length).toFixed(2) : '0.00'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-500">Total Services</span>
                                        <span className="text-lg font-bold text-purple-600">{adminEarnings.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Commission Earnings</h3>
                                <div className="space-y-3">
                                    {adminEarnings.slice(0, 5).map((earning, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{earning.service}</p>
                                                <p className="text-xs text-gray-500">{earning.provider}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-600">${earning.commission.toFixed(2)}</p>
                                                <p className="text-xs text-gray-500">{format(new Date(earning.date), 'MMM dd')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Additional Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Earnings Distribution</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={earningsChartData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                nameKey="name"
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {earningsChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Withdrawal Requests</h3>
                            {withdrawalRequests.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-blue-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Provider</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Method</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {withdrawalRequests.slice(0, 5).map((request) => (
                                                <tr key={request._id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">{request.provider?.name || 'N/A'}</div>
                                                                <div className="text-sm text-gray-500">{request.provider?.email || ''}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        ${request.amount?.toFixed(2) || '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {request.paymentMethod || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                            ${request.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                        'bg-blue-100 text-blue-800'}`}>
                                                            {request.status || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {request.createdAt ? format(new Date(request.createdAt), 'MMM dd, yyyy') : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button
                                                            onClick={() => setSelectedRequest(request)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            Process
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500">No withdrawal requests found</p>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Provider Earnings Tab */}
                {selectedTab === 'earnings' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-6 rounded-lg shadow-sm border"
                    >
                        <h2 className="text-lg font-medium text-blue-900 mb-4">Provider Earnings</h2>
                        {earnings.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-blue-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Provider</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Service</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Gross</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Commission</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Net</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {earnings.map((earning) => (
                                            <tr key={earning._id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{earning.provider?.name || 'N/A'}</div>
                                                            <div className="text-sm text-gray-500">{earning.provider?.email || ''}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {earning.booking?.service?.name || earning.booking?.service || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    ${earning.grossAmount?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    ${earning.commissionAmount?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    ${earning.netAmount?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${earning.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                            earning.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                earning.status === 'available' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-purple-100 text-purple-800'}`}>
                                                        {earning.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {earning.createdAt ? format(new Date(earning.createdAt), 'MMM dd, yyyy') : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {earning.status === 'pending' && earning.booking?._id && (
                                                        <button
                                                            onClick={() => processBookingPayment(earning.booking._id)}
                                                            className="text-indigo-600 hover:text-indigo-900"
                                                        >
                                                            Process
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No earnings data found</p>
                        )}
                    </motion.div>
                )}

                {/* Withdrawals Tab */}
                {selectedTab === 'withdrawals' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-6"
                    >
                        {/* Filters */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by provider name or email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="completed">Completed</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Withdrawal Requests */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h2 className="text-lg font-medium text-blue-900 mb-4">Withdrawal Requests</h2>
                            {filteredWithdrawals.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-blue-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Provider</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Method</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredWithdrawals.map((request) => (
                                                <tr key={request._id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">{request.provider?.name || 'N/A'}</div>
                                                                <div className="text-sm text-gray-500">{request.provider?.email || ''}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        ${request.amount?.toFixed(2) || '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {request.paymentMethod || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                            ${request.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                        'bg-blue-100 text-blue-800'}`}>
                                                            {request.status || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {request.createdAt ? format(new Date(request.createdAt), 'MMM dd, yyyy') : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        {request.status === 'pending' && (
                                                            <button
                                                                onClick={() => setSelectedRequest(request)}
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                Process
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500">No withdrawal requests found</p>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Top Providers Tab */}
                {selectedTab === 'topProviders' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-6 rounded-lg shadow-sm border"
                    >
                        <h2 className="text-lg font-medium text-blue-900 mb-4">Top Performing Providers</h2>
                        {topProviders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-blue-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Rank</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Provider</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Total Earnings</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Bookings</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Avg. Earnings</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {topProviders.map((provider, index) => (
                                            <tr key={provider.providerId}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    #{index + 1}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{provider.name || 'Unknown'}</div>
                                                            <div className="text-sm text-gray-500">{provider.email || ''}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    ${provider.totalEarnings?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {provider.bookingCount || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    ${((provider.totalEarnings || 0) / (provider.bookingCount || 1)).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No top providers data available</p>
                        )}
                    </motion.div>
                )}

                {/* All Providers Tab */}
                {selectedTab === 'allProviders' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-6 rounded-lg shadow-sm border"
                    >
                        <h2 className="text-lg font-medium text-blue-900 mb-4">All Providers</h2>
                        {allProviders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-blue-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Provider</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Services</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Joined</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {allProviders.map((provider) => (
                                            <tr key={provider._id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{provider.name || 'Unknown'}</div>
                                                            <div className="text-sm text-gray-500">{provider.email || ''}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${provider.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {provider.approved ? 'Approved' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {provider.services?.join(', ') || 'No services'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {provider.createdAt ? format(new Date(provider.createdAt), 'MMM dd, yyyy') : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                                                        <FaEye />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No providers data available</p>
                        )}
                    </motion.div>
                )}

                {/* Bookings Tab */}
                {selectedTab === 'bookings' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-6 rounded-lg shadow-sm border"
                    >
                        <h2 className="text-lg font-medium text-blue-900 mb-4">All Bookings</h2>
                        {allBookings.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-blue-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Customer</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Provider</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Service</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Payment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {allBookings.map((booking) => (
                                            <tr key={booking._id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{booking.customer?.name || 'N/A'}</div>
                                                            <div className="text-sm text-gray-500">{booking.customer?.email || ''}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{booking.provider?.name || 'N/A'}</div>
                                                            <div className="text-sm text-gray-500">{booking.provider?.email || ''}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {booking.service?.name || booking.service || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    ${booking.totalAmount?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                    'bg-blue-100 text-blue-800'}`}>
                                                        {booking.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {booking.createdAt ? format(new Date(booking.createdAt), 'MMM dd, yyyy') : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {booking.paymentStatus === 'pending' && booking.status === 'completed' ? (
                                                        <button
                                                            onClick={() => processBookingPayment(booking._id)}
                                                            className="text-indigo-600 hover:text-indigo-900"
                                                        >
                                                            Process Payment
                                                        </button>
                                                    ) : (
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                            ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                                                'bg-yellow-100 text-yellow-800'}`}>
                                                            {booking.paymentStatus || 'N/A'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No bookings data available</p>
                        )}
                    </motion.div>
                )}

                {/* Platform Revenue Tab */}
                {selectedTab === 'adminRevenue' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-6"
                    >
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h2 className="text-lg font-medium text-blue-900 mb-4">Platform Revenue Analytics</h2>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={adminRevenueData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']} />
                                        <Legend />
                                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Platform Revenue" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h2 className="text-lg font-medium text-blue-900 mb-4">Commission Breakdown</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500">Total Commission Earned</span>
                                    <span className="text-lg font-bold text-green-600">
                                        ${adminEarnings.reduce((sum, earning) => sum + (earning.commission || 0), 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500">Average Commission per Service</span>
                                    <span className="text-lg font-bold text-blue-600">
                                        ${adminEarnings.length > 0 ? (adminEarnings.reduce((sum, earning) => sum + (earning.commission || 0), 0) / adminEarnings.length).toFixed(2) : '0.00'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500">Total Services Processed</span>
                                    <span className="text-lg font-bold text-purple-600">{adminEarnings.length}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h2 className="text-lg font-medium text-blue-900 mb-4">Recent Commission Earnings</h2>
                            <div className="space-y-3">
                                {adminEarnings.slice(0, 10).map((earning, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{earning.service}</p>
                                            <p className="text-xs text-gray-500">{earning.provider}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-green-600">${earning.commission.toFixed(2)}</p>
                                            <p className="text-xs text-gray-500">{format(new Date(earning.date), 'MMM dd')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Process Withdrawal Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                    >
                        <h3 className="text-lg font-medium text-blue-900 mb-4">Process Withdrawal Request</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Provider</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedRequest.provider?.name || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Amount</label>
                                <p className="mt-1 text-sm text-gray-900">${selectedRequest.amount?.toFixed(2) || '0.00'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedRequest.paymentMethod || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    value={processingStatus}
                                    onChange={(e) => setProcessingStatus(e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                >
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            {processingStatus === 'completed' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                                    <input
                                        type="text"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Enter transaction reference"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    onClick={() => {
                                        setSelectedRequest(null);
                                        setTransactionId('');
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleProcessWithdrawal}
                                    disabled={refreshing}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {refreshing ? 'Processing...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AdminEarnings;