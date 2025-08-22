import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Download,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  User,
  Building,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart,
  Activity,
  Wallet,
  Receipt,
  TrendingDown
} from 'lucide-react';

const ProviderEarningsDashboard = () => {
  const { token, API, showToast, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
    commissionRate: 10
  });
  const [earnings, setEarnings] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [availableEarnings, setAvailableEarnings] = useState([]);
  const [pendingEarningsDetails, setPendingEarningsDetails] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [expandedCards, setExpandedCards] = useState({
    pending: false,
    available: false,
    monthly: false
  });
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    useSavedBankDetails: false,
    paymentDetails: {
      accountNumber: '',
      accountName: '',
      ifscCode: '',
      upiId: '',
      bankName: ''
    }
  });
  const [providerBankDetails, setProviderBankDetails] = useState(null);
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Fetch earnings summary
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/payment/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch earnings summary');
      }

      const data = await response.json();
      if (data.success) {
        setSummary({
          totalEarnings: data.totalEarnings || 0,
          pendingEarnings: data.pendingEarnings || 0,
          totalWithdrawn: data.totalWithdrawn || 0,
          availableBalance: data.availableBalance || 0,
          commissionRate: data.commissionRate || 10
        });
      } else {
        throw new Error(data.message || 'Failed to fetch earnings summary');
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available earnings (bookings with available status)
  const fetchAvailableEarnings = async () => {
    try {
      const response = await fetch(`${API}/payment/earnings?status=available&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch available earnings');

      const data = await response.json();
      if (data.success) {
        setAvailableEarnings(data.data.earnings || []);
      }
    } catch (error) {
      console.error('Error fetching available earnings:', error);
    }
  };

  // Fetch pending earnings details
  const fetchPendingEarningsDetails = async () => {
    try {
      const response = await fetch(`${API}/payment/earnings?status=pending&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch pending earnings');

      const data = await response.json();
      if (data.success) {
        setPendingEarningsDetails(data.data.earnings || []);
      }
    } catch (error) {
      console.error('Error fetching pending earnings:', error);
    }
  };

  // Fetch monthly earnings data
  const fetchMonthlyData = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      const response = await fetch(`${API}/payment/earnings?from=${startDate}&to=${endDate}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch monthly data');

      const data = await response.json();
      if (data.success) {
        // Group earnings by month
        const monthlyEarnings = {};
        const months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        // Initialize all months with 0
        months.forEach((month, index) => {
          monthlyEarnings[month] = {
            month,
            earnings: 0,
            bookings: 0,
            commission: 0
          };
        });

        // Group data by month
        data.data.earnings.forEach(earning => {
          const date = new Date(earning.date);
          const monthIndex = date.getMonth();
          const monthName = months[monthIndex];
          
          if (monthlyEarnings[monthName]) {
            monthlyEarnings[monthName].earnings += earning.netAmount || 0;
            monthlyEarnings[monthName].bookings += 1;
            monthlyEarnings[monthName].commission += earning.commission || 0;
          }
        });

        setMonthlyData(Object.values(monthlyEarnings));
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  // Fetch payment history
  const fetchPaymentHistory = async (page = 1, limit = 10) => {
    try {
      const response = await fetch(`${API}/payment/history?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch payment history');

      const data = await response.json();
      if (data.success) {
        setPaymentHistory(data.data.payments || []);
        setPagination({
          page: data.data.pagination.page,
          limit: data.data.pagination.limit,
          total: data.data.pagination.total,
          pages: data.data.pagination.pages
        });
      } else {
        throw new Error(data.message || 'Failed to fetch payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      showToast(error.message, 'error');
    }
  };

  // Fetch booking-wise earnings
  const fetchEarnings = async (page = 1, limit = 10) => {
    try {
      let url = `${API}/payment/earnings?page=${page}&limit=${limit}`;
      const params = new URLSearchParams();

      if (dateFilter.startDate) params.append('from', dateFilter.startDate);
      if (dateFilter.endDate) params.append('to', dateFilter.endDate);

      if (params.toString()) {
        url += `&${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch earnings');

      const data = await response.json();
      if (data.success) {
        setEarnings(data.data.earnings || []);
        setPagination({
          page: data.data.pagination.page,
          limit: data.data.pagination.limit,
          total: data.data.pagination.total,
          pages: data.data.pagination.pages
        });
      } else {
        throw new Error(data.message || 'Failed to fetch earnings');
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
      showToast(error.message, 'error');
    }
  };

  // Fetch provider bank details from profile
  const fetchProviderBankDetails = async () => {
    try {
      setLoadingBankDetails(true);
      const response = await fetch(`${API}/provider/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch provider profile');
      }

      const data = await response.json();
      if (data.provider && data.provider.bankDetails) {
        setProviderBankDetails(data.provider.bankDetails);
        return data.provider.bankDetails;
      } else {
        throw new Error('No bank details found in profile');
      }
    } catch (error) {
      console.error('Error fetching provider bank details:', error);
      showToast(error.message, 'error');
      return null;
    } finally {
      setLoadingBankDetails(false);
    }
  };

  // Use saved bank details
  const useSavedBankDetails = async () => {
    if (!providerBankDetails) {
      const bankDetails = await fetchProviderBankDetails();
      if (!bankDetails) return;
    }

    const bankDetails = providerBankDetails;
    
    if (!bankDetails.accountNo || !bankDetails.ifsc) {
      showToast('Incomplete bank details in profile. Please update your profile first.', 'error');
      return;
    }

    // Auto-populate the form with saved bank details
    setWithdrawalForm(prev => ({
      ...prev,
      useSavedBankDetails: true,
      paymentDetails: {
        ...prev.paymentDetails,
        accountNumber: bankDetails.accountNo,
        ifscCode: bankDetails.ifsc,
        accountName: user?.name || '', // Use provider name from auth context
        bankName: '' // Bank name is not stored in provider model, so leave empty
      }
    }));

    showToast('Bank details loaded from profile', 'success');
  };

  // Clear saved bank details
  const clearSavedBankDetails = () => {
    setWithdrawalForm(prev => ({
      ...prev,
      useSavedBankDetails: false,
      paymentDetails: {
        accountNumber: '',
        accountName: '',
        ifscCode: '',
        upiId: '',
        bankName: ''
      }
    }));
  };

  // Handle withdrawal request
  const handleWithdrawal = async () => {
    if (!withdrawalForm.amount || parseFloat(withdrawalForm.amount) < 500) {
      showToast('Minimum withdrawal amount is ₹500', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API}/payment/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawalForm.amount),
          paymentMethod: withdrawalForm.paymentMethod
          // Remove paymentDetails as backend doesn't expect it
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Withdrawal request failed');
      }

      const data = await response.json();
      if (data.success) {
        showToast(data.message || 'Withdrawal request submitted successfully!', 'success');
        setShowWithdrawal(false);
        setWithdrawalForm({
          amount: '',
          paymentMethod: 'bank_transfer',
          paymentDetails: {
            accountNumber: '',
            accountName: '',
            ifscCode: '',
            upiId: '',
            bankName: ''
          }
        });
        // Refresh data
        await fetchSummary();
        await fetchPaymentHistory();
      } else {
        throw new Error(data.error || 'Withdrawal request failed');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Download statement
  const downloadStatement = async (format = 'pdf') => {
    try {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate);

      const endpoint = format === 'pdf'
        ? `${API}/payment/download-statement`
        : `${API}/payment/download-statement-excel`;

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to download statement');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earnings_statement_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast('Statement downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading statement:', error);
      showToast(error.message, 'error');
    }
  };

  // Refresh all data
  const refreshData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSummary(), 
        fetchPaymentHistory(), 
        fetchAvailableEarnings(), 
        fetchPendingEarningsDetails(),
        fetchMonthlyData()
      ]);
      if (activeTab === 'earnings') {
        await fetchEarnings();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (activeTab === 'earnings') {
      fetchEarnings();
    } else if (activeTab === 'history') {
      fetchPaymentHistory();
    }
  }, [dateFilter, activeTab]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;

    if (activeTab === 'earnings') {
      fetchEarnings(newPage, pagination.limit);
    } else if (activeTab === 'history') {
      fetchPaymentHistory(newPage, pagination.limit);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed':
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'processing': return <RefreshCw className="w-4 h-4" />;
      case 'failed':
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleCardExpansion = (cardType) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardType]: !prev[cardType]
    }));
  };

  const getMonthlyTrend = (currentMonth, previousMonth) => {
    if (previousMonth === 0) return { trend: 'neutral', percentage: 0 };
    const change = ((currentMonth - previousMonth) / previousMonth) * 100;
    return {
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(change).toFixed(1)
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
              <p className="text-gray-600 mt-2">Track your earnings and manage withdrawals</p>
            </div>
          </div>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Earnings Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(summary.totalEarnings)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Lifetime earnings</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Enhanced Available Balance Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Balance</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(summary.availableBalance || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Wallet className="w-6 h-6 text-green-600" />
                  </div>
                  <button
                    onClick={() => toggleCardExpansion('available')}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {expandedCards.available ? 
                      <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                </div>
              </div>
              
              {expandedCards.available && (
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Recent Available Bookings:</p>
                  {availableEarnings.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {availableEarnings.slice(0, 3).map((earning, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">#{earning.bookingId}</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(earning.netAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No available earnings</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Pending Earnings Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Earnings</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatCurrency(summary.pendingEarnings)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Under approval</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <button
                    onClick={() => toggleCardExpansion('pending')}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {expandedCards.pending ? 
                      <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                </div>
              </div>
              
              {expandedCards.pending && (
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Payment History Status:</p>
                  {pendingEarningsDetails.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {pendingEarningsDetails.slice(0, 3).map((earning, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">#{earning.bookingId}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(earning.status)}`}>
                              {earning.status}
                            </span>
                          </div>
                          <span className="font-medium text-yellow-600">
                            {formatCurrency(earning.netAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No pending earnings</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Withdrawn Amount Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Withdrawn Amount</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(summary.totalWithdrawn || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Already withdrawn</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <ArrowDownLeft className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Details Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Earnings Overview</h3>
                  <p className="text-sm text-gray-500">Current year performance breakdown</p>
                </div>
              </div>
              <button
                onClick={() => toggleCardExpansion('monthly')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                {expandedCards.monthly ? 
                  <ChevronUp className="w-5 h-5 text-gray-500" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                }
              </button>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">This Month</span>
                </div>
                <p className="text-lg font-bold text-blue-700">
                  {formatCurrency(monthlyData[new Date().getMonth()]?.earnings || 0)}
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-600">Bookings</span>
                </div>
                <p className="text-lg font-bold text-green-700">
                  {monthlyData[new Date().getMonth()]?.bookings || 0}
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <PieChart className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-600">Avg/Month</span>
                </div>
                <p className="text-lg font-bold text-orange-700">
                  {formatCurrency(monthlyData.reduce((sum, month) => sum + month.earnings, 0) / 12)}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600">Best Month</span>
                </div>
                <p className="text-lg font-bold text-purple-700">
                  {monthlyData.reduce((max, month) => month.earnings > max.earnings ? month : max, {earnings: 0}).month || 'N/A'}
                </p>
              </div>
            </div>

            {expandedCards.monthly && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {monthlyData.map((month, index) => {
                    const prevMonth = index > 0 ? monthlyData[index - 1] : null;
                    const trend = prevMonth ? getMonthlyTrend(month.earnings, prevMonth.earnings) : { trend: 'neutral', percentage: 0 };
                    
                    return (
                      <div key={month.month} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">{month.month}</span>
                          {trend.trend !== 'neutral' && (
                            <div className={`flex items-center gap-1 ${trend.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                              {trend.trend === 'up' ? 
                                <TrendingUp className="w-3 h-3" /> : 
                                <TrendingDown className="w-3 h-3" />
                              }
                              <span className="text-xs">{trend.percentage}%</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(month.earnings)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {month.bookings} bookings
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Withdrawal Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowWithdrawal(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all"
          >
            <DollarSign className="w-5 h-5" />
            Request Withdrawal
          </button>
        </div>

        {/* Withdrawal Modal */}
        {showWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Request Withdrawal</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm({
                    ...withdrawalForm,
                    amount: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="500 minimum"
                  min="500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum withdrawal amount: ₹500
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={withdrawalForm.paymentMethod}
                  onChange={(e) => setWithdrawalForm({
                    ...withdrawalForm,
                    paymentMethod: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              {withdrawalForm.paymentMethod === 'bank_transfer' && (
                <div className="space-y-3">
                  {/* Use Saved Bank Details Option */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        {withdrawalForm.useSavedBankDetails ? 'Using saved bank details' : 'Use saved bank details from profile'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!withdrawalForm.useSavedBankDetails ? (
                        <button
                          type="button"
                          onClick={useSavedBankDetails}
                          disabled={loadingBankDetails}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-1"
                        >
                          {loadingBankDetails ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Use Saved'
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={clearSavedBankDetails}
                          className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={withdrawalForm.paymentDetails.accountNumber}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        paymentDetails: {
                          ...withdrawalForm.paymentDetails,
                          accountNumber: e.target.value
                        }
                      })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        withdrawalForm.useSavedBankDetails ? 'bg-gray-50' : ''
                      }`}
                      placeholder="Enter account number"
                      readOnly={withdrawalForm.useSavedBankDetails}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={withdrawalForm.paymentDetails.accountName}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        paymentDetails: {
                          ...withdrawalForm.paymentDetails,
                          accountName: e.target.value
                        }
                      })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        withdrawalForm.useSavedBankDetails ? 'bg-gray-50' : ''
                      }`}
                      placeholder="Enter account holder name"
                      readOnly={withdrawalForm.useSavedBankDetails}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={withdrawalForm.paymentDetails.ifscCode}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        paymentDetails: {
                          ...withdrawalForm.paymentDetails,
                          ifscCode: e.target.value
                        }
                      })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        withdrawalForm.useSavedBankDetails ? 'bg-gray-50' : ''
                      }`}
                      placeholder="Enter IFSC code"
                      readOnly={withdrawalForm.useSavedBankDetails}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={withdrawalForm.paymentDetails.bankName}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        paymentDetails: {
                          ...withdrawalForm.paymentDetails,
                          bankName: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter bank name"
                    />
                  </div>
                </div>
              )}

              {withdrawalForm.paymentMethod === 'upi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={withdrawalForm.paymentDetails.upiId}
                    onChange={(e) => setWithdrawalForm({
                      ...withdrawalForm,
                      paymentDetails: {
                        ...withdrawalForm.paymentDetails,
                        upiId: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter UPI ID"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowWithdrawal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawal}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-1"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : 'Request Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'earnings', label: 'Booking Earnings', icon: CreditCard },
                { id: 'history', label: 'Payment History', icon: FileText },
                { id: 'reports', label: 'Reports', icon: Download }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                {paymentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {paymentHistory.slice(0, 5).map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-full">
                            {record.type === 'withdrawal' ? (
                              <ArrowDownLeft className="w-4 h-4 text-red-600" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{record.type === 'withdrawal' ? 'Withdrawal' : 'Earning'}</p>
                            <p className="text-sm text-gray-500">{formatDate(record.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${record.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'
                            }`}>
                            {record.type === 'withdrawal' ? '-' : '+'}{formatCurrency(record.amount)}
                          </p>
                          <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${getStatusColor(record.status)}`}>
                            {getStatusIcon(record.status)}
                            <span>{record.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No recent activity found</p>
                  </div>
                )}
              </div>
            )}

            {/* Earnings Tab */}
            {activeTab === 'earnings' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Booking Earnings</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <input
                        type="date"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({
                          ...dateFilter,
                          startDate: e.target.value
                        })}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                      <span>to</span>
                      <input
                        type="date"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({
                          ...dateFilter,
                          endDate: e.target.value
                        })}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {earnings.length > 0 ? (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Earnings</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {earnings.map((earning, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{earning.bookingId}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(earning.date)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{earning.serviceName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(earning.grossAmount)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-{formatCurrency(earning.commission)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">+{formatCurrency(earning.netAmount)}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(earning.status)}`}>
                                  {earning.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Showing page {pagination.page} of {pagination.pages} - {pagination.total} records
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.pages}
                          className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No earnings found for the selected period</p>
                  </div>
                )}
              </div>
            )}

            {/* Payment History Tab */}
            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Payment History</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <select
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                        defaultValue="all"
                      >
                        <option value="all">All Transactions</option>
                        <option value="withdrawal">Withdrawals</option>
                        <option value="earning">Earnings</option>
                      </select>
                    </div>
                  </div>
                </div>

                {paymentHistory.length > 0 ? (
                  <div>
                    <div className="space-y-4">
                      {paymentHistory.map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${record.type === 'withdrawal' ? 'bg-red-100' : 'bg-green-100'
                              }`}>
                              {record.type === 'withdrawal' ? (
                                <ArrowDownLeft className="w-4 h-4 text-red-600" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{record.type === 'withdrawal' ? 'Withdrawal' : 'Earning'}</p>
                              <p className="text-sm text-gray-500">Ref: {record.referenceId}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${record.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'
                              }`}>
                              {record.type === 'withdrawal' ? '-' : '+'}{formatCurrency(record.amount)}
                            </p>
                            <p className="text-sm text-gray-500">{formatDate(record.date)}</p>
                            <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${getStatusColor(record.status)}`}>
                              {getStatusIcon(record.status)}
                              <span>{record.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Showing page {pagination.page} of {pagination.pages} - {pagination.total} records
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.pages}
                          className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No payment history found</p>
                  </div>
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Download Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Earnings Statement</h4>
                        <p className="text-sm text-gray-500">Detailed report of your earnings</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => downloadStatement('pdf')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        PDF
                      </button>
                      <button
                        onClick={() => downloadStatement('xlsx')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Excel
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderEarningsDashboard;
