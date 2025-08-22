import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    FiDollarSign, FiCalendar, FiCheckCircle, FiStar,
    FiTrendingUp, FiClock, FiUser, FiMapPin,
    FiPhone, FiMail, FiEye, FiCheck, FiX,
    FiPlay, FiRefreshCw, FiAlertCircle
} from 'react-icons/fi';
import { useAuth } from '../../store/auth';

const Dashboard = () => {
    const { token, API, showToast } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        profile: null,
        recentBookings: [],
        stats: {
            totalEarnings: 0,
            availableBalance: 0,
            completedBookings: 0,
            pendingBookings: 0,
            averageRating: 0
        }
    });
    const [actionLoading, setActionLoading] = useState({});

    // Format address object to string
    const formatAddress = useCallback((address) => {
        if (!address) return 'Address not specified';
        if (typeof address === 'string') return address;

        const parts = [
            address.street,
            address.city,
            address.state,
            address.postalCode,
            address.country
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(', ') : 'Address not specified';
    }, []);

    // Fetch dashboard data
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Fetch provider profile with earnings
            const profileResponse = await fetch(`${API}/provider/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!profileResponse.ok) {
                throw new Error('Failed to fetch profile data');
            }

            const profileData = await profileResponse.json();
            
            // Fetch recent bookings (pending and accepted)
            const [pendingResponse, acceptedResponse, completedResponse] = await Promise.all([
                fetch(`${API}/booking/provider/status/pending?limit=5`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${API}/booking/provider/status/accepted?limit=3`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${API}/booking/provider/status/completed?limit=3`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            const [pendingData, acceptedData, completedData] = await Promise.all([
                pendingResponse.ok ? pendingResponse.json() : { data: [] },
                acceptedResponse.ok ? acceptedResponse.json() : { data: [] },
                completedResponse.ok ? completedResponse.json() : { data: [] }
            ]);

            // Combine recent bookings
            const recentBookings = [
                ...pendingData.data || [],
                ...acceptedData.data || [],
                ...completedData.data || []
            ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

            // Calculate stats with improved data access
            const stats = {
                totalEarnings: profileData.provider?.earnings?.totalEarnings || 0,
                availableBalance: profileData.provider?.earnings?.availableBalance || 0,
                completedBookings: profileData.provider?.completedBookings || 0,
                pendingBookings: pendingData.data?.length || 0,
                averageRating: parseFloat(profileData.provider?.averageRating || 0)
            };

            console.log('[DASHBOARD] Calculated stats:', stats);
            console.log('[DASHBOARD] Profile earnings data:', profileData.provider?.earnings);

            setDashboardData({
                profile: profileData.provider,
                recentBookings,
                stats
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle booking actions
    const handleBookingAction = async (bookingId, action, additionalData = {}) => {
        try {
            setActionLoading(prev => ({ ...prev, [bookingId]: action }));

            const endpoint = `${API}/booking/provider/${bookingId}/${action}`;
            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(additionalData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to ${action} booking`);
            }

            const result = await response.json();
            showToast(result.message || `Booking ${action}ed successfully`, 'success');
            
            // Refresh dashboard data
            fetchDashboardData();

        } catch (error) {
            console.error(`Error ${action}ing booking:`, error);
            showToast(error.message || `Failed to ${action} booking`, 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, [bookingId]: null }));
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const { profile, recentBookings, stats } = dashboardData;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Welcome back, {profile?.name || 'Provider'}!
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Here's what's happening with your services today.
                        </p>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <FiRefreshCw className="mr-2" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Earnings */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <FiDollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                            <p className="text-2xl font-bold text-gray-900">
                                ₹{stats.totalEarnings.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Available Balance */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FiTrendingUp className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Available Balance</p>
                            <p className="text-2xl font-bold text-gray-900">
                                ₹{stats.availableBalance.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Completed Jobs */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <FiCheckCircle className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.completedBookings}</p>
                        </div>
                    </div>
                </div>

                {/* Average Rating */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <FiStar className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Average Rating</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.averageRating > 0 ? stats.averageRating : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Requests */}
                <Link
                    to="/provider/booking-requests"
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Pending Requests</h3>
                            <p className="text-3xl font-bold text-orange-600 mt-2">{stats.pendingBookings}</p>
                            <p className="text-sm text-gray-600 mt-1">Awaiting your response</p>
                        </div>
                        <FiClock className="h-8 w-8 text-orange-600" />
                    </div>
                </Link>

                {/* Active Jobs */}
                <Link
                    to="/provider/active-jobs"
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Active Jobs</h3>
                            <p className="text-3xl font-bold text-blue-600 mt-2">
                                {recentBookings.filter(b => ['accepted', 'in-progress'].includes(b.status)).length}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Currently in progress</p>
                        </div>
                        <FiCalendar className="h-8 w-8 text-blue-600" />
                    </div>
                </Link>

                {/* Earnings */}
                <Link
                    to="/provider/earnings"
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">View Earnings</h3>
                            <p className="text-3xl font-bold text-green-600 mt-2">
                                ₹{stats.availableBalance.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Ready to withdraw</p>
                        </div>
                        <FiDollarSign className="h-8 w-8 text-green-600" />
                    </div>
                </Link>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
                        <Link
                            to="/provider/booking-requests"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                            View All
                        </Link>
                    </div>
                </div>

                <div className="p-6">
                    {recentBookings.length === 0 ? (
                        <div className="text-center py-8">
                            <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No recent bookings</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                New booking requests will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentBookings.map((booking) => (
                                <div
                                    key={booking._id}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <FiUser className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {booking.customer?.name || 'Customer'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {booking.services?.[0]?.service?.title || 'Service'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <FiCalendar className="mr-1 h-4 w-4" />
                                                    {new Date(booking.date).toLocaleDateString()}
                                                </div>
                                                {booking.time && (
                                                    <div className="flex items-center">
                                                        <FiClock className="mr-1 h-4 w-4" />
                                                        {booking.time}
                                                    </div>
                                                )}
                                                <div className="flex items-center">
                                                    <FiDollarSign className="mr-1 h-4 w-4" />
                                                    ₹{booking.totalAmount}
                                                </div>
                                            </div>

                                            {booking.address && (
                                                <div className="mt-2 flex items-center text-sm text-gray-500">
                                                    <FiMapPin className="mr-1 h-4 w-4" />
                                                    <span className="truncate">{formatAddress(booking.address)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2 ml-4">
                                            {/* Status Badge */}
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                booking.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                                booking.status === 'in-progress' ? 'bg-purple-100 text-purple-800' :
                                                booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                            </span>

                                            {/* Action Buttons */}
                                            {booking.status === 'pending' && (
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={() => handleBookingAction(booking._id, 'accept')}
                                                        disabled={actionLoading[booking._id] === 'accept'}
                                                        className="p-1 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
                                                        title="Accept Booking"
                                                    >
                                                        {actionLoading[booking._id] === 'accept' ? (
                                                            <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                                                        ) : (
                                                            <FiCheck className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleBookingAction(booking._id, 'reject', { reason: 'Provider declined' })}
                                                        disabled={actionLoading[booking._id] === 'reject'}
                                                        className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                                                        title="Reject Booking"
                                                    >
                                                        {actionLoading[booking._id] === 'reject' ? (
                                                            <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                                                        ) : (
                                                            <FiX className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {booking.status === 'accepted' && (
                                                <button
                                                    onClick={() => handleBookingAction(booking._id, 'start')}
                                                    disabled={actionLoading[booking._id] === 'start'}
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50"
                                                    title="Start Job"
                                                >
                                                    {actionLoading[booking._id] === 'start' ? (
                                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                                    ) : (
                                                        <FiPlay className="h-4 w-4" />
                                                    )}
                                                </button>
                                            )}

                                            {booking.status === 'in-progress' && (
                                                <button
                                                    onClick={() => handleBookingAction(booking._id, 'complete')}
                                                    disabled={actionLoading[booking._id] === 'complete'}
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
                                                    title="Complete Job"
                                                >
                                                    {actionLoading[booking._id] === 'complete' ? (
                                                        <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                                                    ) : (
                                                        <FiCheckCircle className="h-4 w-4" />
                                                    )}
                                                </button>
                                            )}

                                            {/* View Details Button */}
                                            <Link
                                                to={`/provider/booking/${booking._id}`}
                                                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                                title="View Details"
                                            >
                                                <FiEye className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Status Alert */}
            {profile && (!profile.approved || !profile.testPassed) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                        <FiAlertCircle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                Account Setup Required
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <ul className="list-disc list-inside space-y-1">
                                    {!profile.approved && (
                                        <li>Your account is pending approval from admin</li>
                                    )}
                                    {!profile.testPassed && (
                                        <li>
                                            Complete your skill test to start accepting bookings
                                            <Link to="/provider/test" className="ml-2 text-yellow-800 underline">
                                                Take Test
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
