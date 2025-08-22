import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import {
    Search,
    Users,
    Calendar,
    Phone,
    Mail,
    MapPin,
    Eye,
    Filter,
    ChevronLeft,
    ChevronRight,
    User,
    DollarSign,
    Bookmark,
    Clock,
    Shield
} from 'lucide-react';

const AdminCustomersView = () => {
    const { token, API, showToast } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCustomer, setExpandedCustomer] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
    });

    // Fetch customers from API
    const fetchCustomers = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const response = await fetch(
                `${API}/admin/customers?page=${page}&limit=${pagination.limit}&search=${search}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch customers');
            }

            const data = await response.json();

            if (data.success) {
                setCustomers(data.customers);
                setPagination({
                    page: data.page,
                    limit: data.limit || pagination.limit,
                    total: data.total,
                    pages: data.pages
                });
            } else {
                showToast(data.message || 'Failed to fetch customers', 'error');
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            showToast('Error fetching customers', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchCustomers();
    }, []);

    // Handle search
    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchCustomers(1, value);
        }, 500);

        return () => clearTimeout(timeoutId);
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchCustomers(newPage, searchTerm);
        }
    };

    // Toggle customer details
    const toggleCustomerDetails = (customerId) => {
        setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Loading skeleton
    const LoadingSkeleton = () => (
        <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        Customer Management
                    </h1>
                    <p className="text-gray-600">
                        Manage and view all registered customers
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="p-2 md:p-3 bg-blue-100 rounded-full">
                                <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                            </div>
                            <div className="ml-3 md:ml-4">
                                <p className="text-xs md:text-sm font-medium text-gray-600">Total Customers</p>
                                <p className="text-xl md:text-2xl font-semibold text-gray-900">{pagination.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="p-2 md:p-3 bg-green-100 rounded-full">
                                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                            </div>
                            <div className="ml-3 md:ml-4">
                                <p className="text-xs md:text-sm font-medium text-gray-600">Active Today</p>
                                <p className="text-xl md:text-2xl font-semibold text-gray-900">
                                    {customers.filter(c => {
                                        const today = new Date();
                                        const updatedAt = new Date(c.updatedAt);
                                        return updatedAt.toDateString() === today.toDateString();
                                    }).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="p-2 md:p-3 bg-purple-100 rounded-full">
                                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                            </div>
                            <div className="ml-3 md:ml-4">
                                <p className="text-xs md:text-sm font-medium text-gray-600">Total Spent</p>
                                <p className="text-xl md:text-2xl font-semibold text-gray-900">
                                    {formatCurrency(customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
                        <div className="flex items-center">
                            <div className="p-2 md:p-3 bg-yellow-100 rounded-full">
                                <Bookmark className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
                            </div>
                            <div className="ml-3 md:ml-4">
                                <p className="text-xs md:text-sm font-medium text-gray-600">Avg. Bookings</p>
                                <p className="text-xl md:text-2xl font-semibold text-gray-900">
                                    {customers.length > 0
                                        ? (customers.reduce((sum, c) => sum + (c.totalBookings || 0), 0) / customers.length)
                                        : 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6 border border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 md:h-5 md:w-5" />
                            <input
                                type="text"
                                placeholder="Search customers by name, email, or phone..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                <Filter className="h-4 w-4 mr-1 inline" />
                                Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Customers List */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-base md:text-lg font-medium text-gray-900">
                            All Customers ({pagination.total})
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-4 md:p-6">
                            <LoadingSkeleton />
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="p-8 md:p-12 text-center">
                            <Users className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                            <p className="text-gray-500">No customers found</p>
                            {searchTerm && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        fetchCustomers();
                                    }}
                                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Clear search and try again
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {customers.map((customer) => (
                                <div key={customer._id} className="p-4 md:p-6 hover:bg-gray-50">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                        {/* Customer Info */}
                                        <div className="flex items-start space-x-4">
                                            <div className="flex-shrink-0">
                                                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <User className="h-5 w-5 text-blue-600" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    <p className="text-sm md:text-base font-medium text-gray-900 truncate">
                                                        {customer.name}
                                                    </p>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {customer.role || 'customer'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 truncate">
                                                    {customer.email}
                                                </p>
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    <span className="inline-flex items-center text-xs text-gray-500">
                                                        <Phone className="h-3 w-3 mr-1" />
                                                        {customer.phone || 'No phone'}
                                                    </span>
                                                    {customer.address?.city && (
                                                        <span className="inline-flex items-center text-xs text-gray-500">
                                                            <MapPin className="h-3 w-3 mr-1" />
                                                            {customer.address.city}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats and Actions */}
                                        <div className="mt-4 md:mt-0 flex items-center space-x-4">
                                            <div className="hidden md:flex space-x-4">
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-gray-500">Bookings</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {customer.totalBookings || 0}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-gray-500">Spent</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {formatCurrency(customer.totalSpent || 0)}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-gray-500">Joined</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {formatDate(customer.createdAt).split(',')[0]}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleCustomerDetails(customer._id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                {expandedCustomer === customer._id ? 'Hide' : 'View'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedCustomer === customer._id && (
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {/* Personal Information */}
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                                        <User className="h-4 w-4 mr-2 text-gray-500" />
                                                        Personal Information
                                                    </h3>
                                                    <dl className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">Full Name</dt>
                                                            <dd className="text-sm text-gray-900">{customer.name}</dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">Email</dt>
                                                            <dd className="text-sm text-gray-900">{customer.email}</dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">Phone</dt>
                                                            <dd className="text-sm text-gray-900">{customer.phone || 'Not provided'}</dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">Account Created</dt>
                                                            <dd className="text-sm text-gray-900">{formatDate(customer.createdAt)}</dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">Last Active</dt>
                                                            <dd className="text-sm text-gray-900">{formatDate(customer.updatedAt)}</dd>
                                                        </div>
                                                    </dl>
                                                </div>

                                                {/* Address Information */}
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                                                        Address Information
                                                    </h3>
                                                    {customer.address ? (
                                                        <dl className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <dt className="text-sm text-gray-500">Street</dt>
                                                                <dd className="text-sm text-gray-900">{customer.address.street || 'Not provided'}</dd>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <dt className="text-sm text-gray-500">City</dt>
                                                                <dd className="text-sm text-gray-900">{customer.address.city || 'Not provided'}</dd>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <dt className="text-sm text-gray-500">State</dt>
                                                                <dd className="text-sm text-gray-900">{customer.address.state || 'Not provided'}</dd>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <dt className="text-sm text-gray-500">Postal Code</dt>
                                                                <dd className="text-sm text-gray-900">{customer.address.postalCode || 'Not provided'}</dd>
                                                            </div>
                                                        </dl>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">No address information available</p>
                                                    )}
                                                </div>

                                                {/* Customer Stats */}
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                                        <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                                                        Customer Statistics
                                                    </h3>
                                                    <dl className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">Total Bookings</dt>
                                                            <dd className="text-sm text-gray-900">{customer.totalBookings || 0}</dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">Total Amount Spent</dt>
                                                            <dd className="text-sm text-gray-900">{formatCurrency(customer.totalSpent || 0)}</dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">Average Booking</dt>
                                                            <dd className="text-sm text-gray-900">
                                                                {customer.totalBookings
                                                                    ? formatCurrency(Math.round((customer.totalSpent || 0) / customer.totalBookings))
                                                                    : formatCurrency(0)}
                                                            </dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">First Booking Used</dt>
                                                            <dd className="text-sm text-gray-900">
                                                                {customer.firstBookingUsed ? 'Yes' : 'No'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt className="text-sm text-gray-500">Custom Discount</dt>
                                                            <dd className="text-sm text-gray-900">
                                                                {customer.customDiscount || 0}%
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="bg-white px-4 py-3 md:px-6 md:py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.pages}
                                    className="ml-3 relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                        <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                                        <span className="font-medium">{pagination.total}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                        <button
                                            onClick={() => handlePageChange(1)}
                                            disabled={pagination.page === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <span className="sr-only">First</span>
                                            <ChevronLeft className="h-5 w-5" />
                                            <ChevronLeft className="h-5 w-5 -ml-2" />
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page === 1}
                                            className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>

                                        {/* Page numbers */}
                                        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                            let pageNum;
                                            if (pagination.pages <= 5) {
                                                pageNum = i + 1;
                                            } else if (pagination.page <= 3) {
                                                pageNum = i + 1;
                                            } else if (pagination.page >= pagination.pages - 2) {
                                                pageNum = pagination.pages - 4 + i;
                                            } else {
                                                pageNum = pagination.page - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pagination.page === pageNum
                                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}

                                        <button
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page === pagination.pages}
                                            className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Next</span>
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(pagination.pages)}
                                            disabled={pagination.page === pagination.pages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Last</span>
                                            <ChevronRight className="h-5 w-5" />
                                            <ChevronRight className="h-5 w-5 -ml-2" />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminCustomersView;