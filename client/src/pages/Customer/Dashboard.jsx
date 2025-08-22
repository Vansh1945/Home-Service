import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, DollarSign, ShoppingCart, Calendar, CheckCircle, XCircle, Star, MapPin, Clock, CreditCard, Tag, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CustomerDashboard = () => {
  const { token, user, API, logoutUser, showToast } = useAuth();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch(`${API}/customer/dashboard`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        setStats(data.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        showToast(error.message || 'Failed to load dashboard', 'error');
      }
    };

    if (token) {
      fetchDashboardStats();
    }
  }, [token, API]);

  const MetricCard = ({ title, value, change, icon: Icon, trend }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="p-2 bg-blue-50 rounded-lg mr-3">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        </div>
        {trend && (
          <div className={`flex items-center text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            <span className="font-medium">{change}%</span>
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );

  const TabButton = ({ id, label, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-200 max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Dashboard Unavailable</h2>
          <p className="text-gray-600 mb-4">We couldn't load your dashboard data. Please try again later.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data from stats
  const bookingTrends = [
    { name: 'Completed', value: stats.overview.completedBookings, icon: CheckCircle, color: '#10B981' },
    { name: 'Upcoming', value: stats.overview.upcomingBookings, icon: Calendar, color: '#3B82F6' },
    { name: 'Cancelled', value: stats.overview.cancelledBookings, icon: XCircle, color: '#EF4444' },
  ];

  const spendingData = [
    { name: 'Total', value: stats.overview.totalSpent },
    { name: 'This Month', value: stats.overview.monthlySpent },
    { name: 'This Week', value: stats.overview.weeklySpent },
  ];

  const complaintsData = [
    { name: 'Active', value: stats.overview.activeComplaints, color: '#F59E0B' },
    { name: 'Resolved', value: stats.overview.resolvedComplaints, color: '#10B981' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Welcome back, {user?.name || 'Customer'}!</h1>
          <p className="text-gray-600">Here's what's happening with your account</p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : 
               range === '30d' ? 'Last 30 Days' :
               range === '90d' ? 'Last 90 Days' : 'Last Year'}
            </button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Bookings"
            value={stats.overview.totalBookings}
            change={12.5}
            icon={ShoppingCart}
            trend="up"
          />
          <MetricCard
            title="Upcoming"
            value={stats.overview.upcomingBookings}
            change={5.2}
            icon={Calendar}
            trend="up"
          />
          <MetricCard
            title="Total Spent"
            value={`$${stats.overview.totalSpent.toFixed(2)}`}
            change={-2.1}
            icon={DollarSign}
            trend="down"
          />
          <MetricCard
            title="Pending Feedback"
            value={stats.overview.pendingFeedback}
            change={8.3}
            icon={MessageSquare}
            trend="up"
          />
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <TabButton
              id="overview"
              label="Overview"
              active={activeTab === 'overview'}
              onClick={setActiveTab}
            />
            <TabButton
              id="bookings"
              label="Bookings"
              active={activeTab === 'bookings'}
              onClick={setActiveTab}
            />
            <TabButton
              id="spending"
              label="Spending"
              active={activeTab === 'spending'}
              onClick={setActiveTab}
            />
            <TabButton
              id="activity"
              label="Activity"
              active={activeTab === 'activity'}
              onClick={setActiveTab}
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bookings Overview */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
                  Bookings Overview
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={bookingTrends}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {bookingTrends.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} bookings`, 'Count']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Spending Overview */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Spending Overview
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {spendingData.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-600">{item.name}</p>
                      <p className="font-bold text-lg">${item.value.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={spendingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']}
                    />
                    <Bar dataKey="value" fill="#4ADE80" name="Amount ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-6">
              {/* Recent Bookings */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Bookings
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.recentBookings.map((booking, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.services.service.title}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {booking.provider.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(booking.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Favorite Services */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Favorite Services
                </h3>
                {stats.favoriteServices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats.favoriteServices.map((service, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center mb-2">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-bold">{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-medium">{service.serviceName}</h4>
                            <p className="text-sm text-gray-600">{service.category}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-500">Booked</span>
                          <span className="font-semibold">{service.count} times</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No favorite services yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'spending' && (
            <div className="space-y-6">
              {/* Spending Trends */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Spending Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={[
                      { name: 'Jan', value: 320 },
                      { name: 'Feb', value: 450 },
                      { name: 'Mar', value: 280 },
                      { name: 'Apr', value: 390 },
                      { name: 'May', value: 510 },
                      { name: 'Jun', value: 420 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`$${value}`, 'Amount']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#106981" 
                      strokeWidth={2}
                      name="Amount ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Transactions
                </h3>
                <div className="space-y-4">
                  {stats.recentTransactions.map((txn, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-full mr-3">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {txn.booking?.services?.map(s => s.title).join(', ') || 'Service Payment'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(txn.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          txn.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          ${txn.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {txn.paymentStatus}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              {/* Coupons & Discounts */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-purple-600" />
                  Coupons & Discounts
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600">Available</p>
                    <p className="text-2xl font-bold">{stats.overview.availableCoupons}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600">Used</p>
                    <p className="text-2xl font-bold">{stats.overview.usedCoupons}</p>
                  </div>
                </div>
                <div className="text-center">
                  <button className="text-sm text-purple-600 font-medium hover:underline">
                    View all coupons
                  </button>
                </div>
              </div>

              {/* Complaints */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-red-600" />
                  Complaints & Issues
                </h3>
                <div className="flex justify-center mb-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={complaintsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={60}
                        innerRadius={30}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {complaintsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} complaints`, 'Count']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                    Create New Complaint
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;