import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Settings, 
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Activity,
  Target,
  Award,
  Filter,
  BarChart2,
  Zap,
  Star,
  Percent,
  Calculator,
  Crown,
  Shield,
  Sparkles,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 2000, suffix = '' }) => {
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

  return <span>{count}{suffix}</span>;
};

// Skeleton Loading Component for Table
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-6 bg-gray-200 rounded-full w-24 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
      </div>
    </td>
  </tr>
);

const AdminCommissionPage = () => {
  const { API, token, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('rules');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [commissionRules, setCommissionRules] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerCommission, setProviderCommission] = useState(null);
  const [bookings, setBookings] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalCommission: 0,
    totalProviders: 0,
    activeRules: 0,
    totalProcessedCommissions: 0,
    avgCommissionRate: 0
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Modal states
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  
  // Form state matching backend model
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    type: 'percentage',
    value: 10,
    applyTo: 'all',
    performanceTier: '',
    specificProvider: ''
  });

  // Filters (removed invoiceSearch)
  const [filters, setFilters] = useState({
    search: '',
    isActive: '',
    performanceTier: '',
    bookingSearch: ''
  });

  // Available options matching backend enum
  const performanceTiers = ['basic', 'standard', 'premium'];

  // Fetch commission rules
  const fetchCommissionRules = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.isActive && { isActive: filters.isActive }),
        ...(filters.performanceTier && { performanceTier: filters.performanceTier })
      });

      const response = await fetch(`${API}/commission/rules/list?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setCommissionRules(data.data);
        setPagination(data.pagination);
        
        // Calculate stats
        const activeCount = data.data.filter(rule => rule.isActive).length;
        setStats(prev => ({ 
          ...prev, 
          activeRules: activeCount,
          totalRules: data.pagination.total
        }));
        
        // Calculate average commission rate
        if (data.data.length > 0) {
          const percentageRules = data.data.filter(rule => rule.type === 'percentage');
          const avgRate = percentageRules.length > 0 
            ? percentageRules.reduce((sum, rule) => sum + rule.value, 0) / percentageRules.length
            : 0;
          setStats(prev => ({ ...prev, avgCommissionRate: avgRate.toFixed(1) }));
        }
      }
    } catch (error) {
      showToast('Failed to fetch commission rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch providers
  const fetchProviders = async () => {
    try {
      const response = await fetch(`${API}/admin/providers?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProviders(data.data || []);
        setStats(prev => ({ 
          ...prev, 
          totalProviders: (data.data || []).length 
        }));
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      setProviders([]);
    }
  };

  // Fetch provider commission details
  const fetchProviderCommission = async (providerId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/commission/provider/${providerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProviderCommission(data.data);
      }
    } catch (error) {
      showToast('Failed to fetch provider commission details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create/update commission rule
  const handleSaveRule = async () => {
    if (!ruleForm.name || !ruleForm.value || ruleForm.value < 0) {
      showToast('Please fill all required fields with valid values', 'error');
      return;
    }

    if (ruleForm.applyTo === 'performanceTier' && !ruleForm.performanceTier) {
      showToast('Performance tier is required when applyTo is performanceTier', 'error');
      return;
    }

    if (ruleForm.applyTo === 'specificProvider' && !ruleForm.specificProvider) {
      showToast('Provider is required when applyTo is specificProvider', 'error');
      return;
    }

    setLoading(true);
    try {
      const method = editingRule ? 'PUT' : 'POST';
      const url = editingRule 
        ? `${API}/commission/rules/${editingRule._id}`
        : `${API}/commission/rules`;
      
      const payload = {
        name: ruleForm.name,
        description: ruleForm.description,
        type: ruleForm.type,
        value: ruleForm.value,
        applyTo: ruleForm.applyTo,
        ...(ruleForm.applyTo === 'performanceTier' && { performanceTier: ruleForm.performanceTier }),
        ...(ruleForm.applyTo === 'specificProvider' && { specificProvider: ruleForm.specificProvider })
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.success) {
        showToast(`Rule ${editingRule ? 'updated' : 'created'} successfully`);
        setShowRuleModal(false);
        setEditingRule(null);
        resetRuleForm();
        fetchCommissionStats();
        fetchCommissionRules(pagination.page, pagination.limit);
      } else {
        showToast(data.message || 'Failed to save rule', 'error');
      }
    } catch (error) {
      showToast('Failed to save rule', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle rule status
  const toggleRuleStatus = async (ruleId) => {
    try {
      const response = await fetch(`${API}/commission/rules/${ruleId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast(data.message || 'Rule status updated');
        fetchCommissionStats();
        fetchCommissionRules(pagination.page, pagination.limit);
      } else {
        showToast(data.message || 'Failed to toggle rule status', 'error');
      }
    } catch (error) {
      showToast('Failed to toggle rule status', 'error');
    }
  };

  // Delete commission rule
  const deleteCommissionRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this commission rule?')) return;
    
    try {
      const response = await fetch(`${API}/commission/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast('Commission rule deleted successfully');
        fetchCommissionRules(pagination.page, pagination.limit);
      } else {
        showToast(data.message || 'Failed to delete rule', 'error');
      }
    } catch (error) {
      showToast('Failed to delete commission rule', 'error');
    }
  };

  // Process commission for booking (removed fetchInvoices call)
  const processBookingCommission = async (bookingId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/commission/process/${bookingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast('Commission processed successfully');
        fetchCommissionStats();
        fetchBookings();
      } else {
        showToast(data.message || 'Failed to process commission', 'error');
      }
    } catch (error) {
      showToast('Failed to process commission', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings with commission status
  const fetchBookings = async () => {
    try {
      const queryParams = new URLSearchParams({
        status: 'completed',
        limit: 50,
        ...(filters.bookingSearch && { search: filters.bookingSearch })
      });

      const response = await fetch(`${API}/admin/bookings?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setBookings(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setBookings([]);
    }
  };

  // Fetch commission statistics
  const fetchCommissionStats = async () => {
    try {
      const response = await fetch(`${API}/admin/commission/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(prev => ({
          ...prev,
          totalCommission: data.totalCommission || 0,
          totalProcessedCommissions: data.totalProcessed || 0,
          avgCommissionRate: data.avgRate?.toFixed(1) || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch commission stats:', error);
    }
  };

  // Reset form
  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      description: '',
      type: 'percentage',
      value: 10,
      applyTo: 'all',
      performanceTier: '',
      specificProvider: ''
    });
  };

  // Open edit modal
  const openEditModal = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name || '',
      description: rule.description || '',
      type: rule.type || 'percentage',
      value: rule.value || 10,
      applyTo: rule.applyTo || 'all',
      performanceTier: rule.performanceTier || '',
      specificProvider: rule.specificProvider?._id || ''
    });
    setShowRuleModal(true);
  };

  // Filter rules
  const filteredRules = commissionRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesActive = filters.isActive === '' || rule.isActive.toString() === filters.isActive;
    const matchesTier = filters.performanceTier === '' || rule.performanceTier === filters.performanceTier;
    
    return matchesSearch && matchesActive && matchesTier;
  });

  // Filter bookings (updated to work without invoice references)
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = filters.bookingSearch === '' || 
      booking._id.toLowerCase().includes(filters.bookingSearch.toLowerCase()) ||
      booking.provider?.name.toLowerCase().includes(filters.bookingSearch.toLowerCase());
    return matchesSearch;
  });

  // Initial data fetch (removed fetchInvoices)
  useEffect(() => {
    fetchCommissionRules();
    fetchProviders();
    fetchBookings();
    fetchCommissionStats();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchCommissionRules(1, pagination.limit);
  }, [filters.isActive, filters.performanceTier]);

  useEffect(() => {
    fetchBookings();
  }, [filters.bookingSearch]);

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-8 backdrop-blur-sm bg-white/95">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent">
                Commission Management
              </h1>
              <p className="text-gray-600 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-blue-500" />
                Manage commission rules and provider earnings with advanced controls
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  fetchCommissionRules();
                  fetchProviders();
                  fetchBookings();
                  fetchCommissionStats();
                }}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => {
                  resetRuleForm();
                  setShowRuleModal(true);
                }}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Commission Rule
              </button>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Commission</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    ₹<AnimatedCounter value={stats.totalCommission} />
                  </p>
                  <div className="flex items-center mt-2 text-blue-100 text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    All time earnings
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Active Rules</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={stats.activeRules} />
                  </p>
                  <div className="flex items-center mt-2 text-emerald-100 text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Currently active
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
                  <p className="text-purple-100 text-sm font-medium">Total Providers</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={stats.totalProviders} />
                  </p>
                  <div className="flex items-center mt-2 text-purple-100 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Registered providers
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-transparent"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Avg Commission Rate</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={parseFloat(stats.avgCommissionRate)} suffix="%" />
                  </p>
                  <div className="flex items-center mt-2 text-amber-100 text-xs">
                    <Percent className="w-3 h-3 mr-1" />
                    Average rate
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra Enhanced Management Sections */}
        <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 rounded-3xl shadow-2xl border border-blue-200/50 p-8 mb-8 backdrop-blur-lg overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-blue-400/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          </div>
          
          <div className="relative z-10">
            {/* Enhanced Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <BarChart2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-800 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                    Management Sections
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Navigate through different commission management areas</p>
                </div>
              </div>
              
              {/* Quick Stats Indicator */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-emerald-700">Live Data</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Active Rules</div>
                  <div className="text-lg font-bold text-blue-600">{stats.activeRules}</div>
                </div>
              </div>
            </div>

            {/* Ultra Enhanced Tab Navigation */}
            <div className="relative">
              <div className="flex space-x-2 p-2 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-2xl border border-gray-200/50 backdrop-blur-sm">
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`group relative flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-sm transition-all duration-300 transform ${
                    activeTab === 'rules'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105 shadow-blue-500/25'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-white/80 hover:shadow-md hover:scale-102'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-all duration-300 ${
                    activeTab === 'rules' 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-blue-50 group-hover:bg-blue-100'
                  }`}>
                    <Settings className={`w-4 h-4 transition-all duration-300 ${
                      activeTab === 'rules' ? 'text-white' : 'text-blue-500'
                    }`} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span>Commission Rules</span>
                    <span className={`text-xs opacity-75 ${
                      activeTab === 'rules' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      Manage & Configure
                    </span>
                  </div>
                  {activeTab === 'rules' && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse"></div>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('providers')}
                  className={`group relative flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-sm transition-all duration-300 transform ${
                    activeTab === 'providers'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg scale-105 shadow-purple-500/25'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-white/80 hover:shadow-md hover:scale-102'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-all duration-300 ${
                    activeTab === 'providers' 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-purple-50 group-hover:bg-purple-100'
                  }`}>
                    <Users className={`w-4 h-4 transition-all duration-300 ${
                      activeTab === 'providers' ? 'text-white' : 'text-purple-500'
                    }`} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span>Provider Commissions</span>
                    <span className={`text-xs opacity-75 ${
                      activeTab === 'providers' ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      Track & Monitor
                    </span>
                  </div>
                  {activeTab === 'providers' && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/20 to-indigo-400/20 animate-pulse"></div>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('processing')}
                  className={`group relative flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-sm transition-all duration-300 transform ${
                    activeTab === 'processing'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg scale-105 shadow-emerald-500/25'
                      : 'text-gray-600 hover:text-emerald-600 hover:bg-white/80 hover:shadow-md hover:scale-102'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-all duration-300 ${
                    activeTab === 'processing' 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-emerald-50 group-hover:bg-emerald-100'
                  }`}>
                    <DollarSign className={`w-4 h-4 transition-all duration-300 ${
                      activeTab === 'processing' ? 'text-white' : 'text-emerald-500'
                    }`} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span>Commission Processing</span>
                    <span className={`text-xs opacity-75 ${
                      activeTab === 'processing' ? 'text-emerald-100' : 'text-gray-500'
                    }`}>
                      Process & Execute
                    </span>
                  </div>
                  {activeTab === 'processing' && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/20 to-green-400/20 animate-pulse"></div>
                  )}
                </button>
              </div>
              
              {/* Active Tab Indicator */}
              <div className="mt-4 flex justify-center">
                <div className="flex space-x-2">
                  {['rules', 'providers', 'processing'].map((tab, index) => (
                    <div
                      key={tab}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        activeTab === tab 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 w-8' 
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Commission Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search rules..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.isActive}
                  onChange={(e) => setFilters({...filters, isActive: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Performance Tier</label>
                <select
                  value={filters.performanceTier}
                  onChange={(e) => setFilters({...filters, performanceTier: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Tiers</option>
                  {performanceTiers.map(tier => (
                    <option key={tier} value={tier}>
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ultra Enhanced Rules Table */}
          <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-2xl overflow-hidden border border-blue-200/50 backdrop-blur-sm">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Commission Rules</h3>
                    <p className="text-blue-100 text-sm">Manage and configure commission rules</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">{filteredRules.length} Rules</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-blue-200/50">
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Rule Name</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Commission</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Apply To</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Status</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Created</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100/50">
                  {loading ? (
                    // Enhanced Loading Skeleton
                    Array.from({ length: 5 }).map((_, index) => (
                      <SkeletonRow key={index} />
                    ))
                  ) : filteredRules.length > 0 ? (
                    filteredRules.map((rule, index) => (
                      <tr 
                        key={rule._id} 
                        className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-md"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Settings className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                {rule.name}
                              </div>
                              {rule.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs mt-1 group-hover:text-gray-600">
                                  {rule.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-2">
                            <div className={`p-2 rounded-lg ${
                              rule.type === 'percentage' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {rule.type === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {rule.type === 'percentage' ? `${rule.value}%` : `₹${rule.value.toFixed(2)}`}
                              </div>
                              <div className="text-xs text-gray-500 capitalize">
                                {rule.type} based
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                              rule.applyTo === 'all' 
                                ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' : 
                              rule.applyTo === 'performanceTier' 
                                ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300' : 
                                'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
                            }`}>
                              {rule.applyTo === 'all' && <Users className="w-3 h-3 mr-1" />}
                              {rule.applyTo === 'performanceTier' && <Award className="w-3 h-3 mr-1" />}
                              {rule.applyTo === 'specificProvider' && <User className="w-3 h-3 mr-1" />}
                              {rule.applyTo === 'all' ? 'All Providers' : 
                               rule.applyTo === 'performanceTier' ? 'Performance Tier' : 'Specific Provider'}
                            </span>
                            {rule.performanceTier && (
                              <div className="flex items-center space-x-1">
                                <Crown className="w-3 h-3 text-purple-500" />
                                <span className="text-xs text-purple-600 font-medium">
                                  {rule.performanceTier.charAt(0).toUpperCase() + rule.performanceTier.slice(1)} Tier
                                </span>
                              </div>
                            )}
                            {rule.specificProvider && (
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3 text-green-500" />
                                <span className="text-xs text-green-600 font-medium truncate max-w-24">
                                  {rule.specificProvider.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              rule.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                            }`}></div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              rule.isActive 
                                ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 border border-emerald-300' 
                                : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                            }`}>
                              {rule.isActive ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Inactive
                                </>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <Calendar className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {format(new Date(rule.createdAt), 'dd MMM yyyy')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(rule.createdAt), 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditModal(rule)}
                              className="group/btn relative p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 rounded-xl transition-all duration-200 transform hover:scale-110 hover:shadow-lg"
                              title="Edit Rule"
                            >
                              <Edit className="w-4 h-4" />
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                Edit Rule
                              </div>
                            </button>
                            <button
                              onClick={() => toggleRuleStatus(rule._id)}
                              className={`group/btn relative p-2 rounded-xl transition-all duration-200 transform hover:scale-110 hover:shadow-lg ${
                                rule.isActive 
                                  ? 'bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700' 
                                  : 'bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700'
                              }`}
                              title={rule.isActive ? 'Deactivate Rule' : 'Activate Rule'}
                            >
                              {rule.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                {rule.isActive ? 'Deactivate' : 'Activate'}
                              </div>
                            </button>
                            <button
                              onClick={() => deleteCommissionRule(rule._id)}
                              className="group/btn relative p-2 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-xl transition-all duration-200 transform hover:scale-110 hover:shadow-lg"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-4 h-4" />
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                Delete Rule
                              </div>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                            <Settings className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Commission Rules Found</h3>
                            <p className="text-sm text-gray-500">Get started by creating your first commission rule.</p>
                          </div>
                          <button
                            onClick={() => {
                              resetRuleForm();
                              setShowRuleModal(true);
                            }}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 transform hover:scale-105 shadow-md"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Rule
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => fetchCommissionRules(pagination.page - 1, pagination.limit)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchCommissionRules(pagination.page + 1, pagination.limit)}
                    disabled={pagination.page >= pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => fetchCommissionRules(pagination.page - 1, pagination.limit)}
                        disabled={pagination.page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
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
                            onClick={() => fetchCommissionRules(pageNum, pagination.limit)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pagination.page === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => fetchCommissionRules(pagination.page + 1, pagination.limit)}
                        disabled={pagination.page >= pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provider Commissions Tab */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Provider Commission Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Provider</label>
                <select
                  value={selectedProvider || ''}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    if (e.target.value) {
                      fetchProviderCommission(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a provider</option>
                  {providers.map(provider => (
                    <option key={provider._id} value={provider._id}>
                      {provider.name} - {provider.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {providerCommission && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-blue-100">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-900">Total Earnings</p>
                      <p className="text-lg font-bold text-blue-900">
                        ₹{providerCommission.totalEarnings?.toLocaleString('en-IN') || 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-green-100">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-900">Commission Rate</p>
                      <p className="text-lg font-bold text-green-900">
                        {providerCommission.commissionRate || 0}%
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-purple-100">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-900">Completed Jobs</p>
                      <p className="text-lg font-bold text-purple-900">
                        {providerCommission.completedJobs || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commission Processing Tab */}
      {activeTab === 'processing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Process Commission for Completed Bookings</h3>
              <button
                onClick={fetchBookings}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={filters.bookingSearch}
                  onChange={(e) => setFilters({...filters, bookingSearch: e.target.value})}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.length > 0 ? (
                    filteredBookings.map((booking) => (
                      <tr key={booking._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking._id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.provider?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.provider?.email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{booking.totalAmount?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.commissionProcessed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.commissionProcessed ? 'Processed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!booking.commissionProcessed && (
                            <button
                              onClick={() => processBookingCommission(booking._id)}
                              disabled={loading}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            >
                              Process Commission
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                        No bookings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ultra Enhanced Commission Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl border border-blue-200/50 w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-3xl p-6 text-white">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-t-3xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {editingRule ? 'Edit Commission Rule' : 'Add Commission Rule'}
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      {editingRule ? 'Update existing rule configuration' : 'Create a new commission rule'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowRuleModal(false);
                    setEditingRule(null);
                    resetRuleForm();
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <XCircle className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Settings className="w-4 h-4 mr-2 text-blue-500" />
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({...ruleForm, name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                    placeholder="Enter descriptive rule name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Edit className="w-4 h-4 mr-2 text-blue-500" />
                    Description
                  </label>
                  <textarea
                    value={ruleForm.description}
                    onChange={(e) => setRuleForm({...ruleForm, description: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 resize-none"
                    rows="3"
                    placeholder="Describe the rule purpose and conditions"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Calculator className="w-4 h-4 mr-2 text-blue-500" />
                      Commission Type *
                    </label>
                    <select
                      value={ruleForm.type}
                      onChange={(e) => setRuleForm({...ruleForm, type: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 items-center">
                      <DollarSign className="w-4 h-4 mr-2 text-blue-500" />
                      Value * {ruleForm.type === 'percentage' ? '(%)' : '(₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={ruleForm.type === 'percentage' ? '0.1' : '1'}
                      value={ruleForm.value}
                      onChange={(e) => setRuleForm({...ruleForm, value: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                      placeholder={ruleForm.type === 'percentage' ? '10.5' : '1000'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Target className="w-4 h-4 mr-2 text-blue-500" />
                    Apply To *
                  </label>
                  <select
                    value={ruleForm.applyTo}
                    onChange={(e) => setRuleForm({...ruleForm, applyTo: e.target.value, performanceTier: '', specificProvider: ''})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                  >
                    <option value="all">All Providers</option>
                    <option value="performanceTier">Performance Tier</option>
                    <option value="specificProvider">Specific Provider</option>
                  </select>
                </div>

                {ruleForm.applyTo === 'performanceTier' && (
                  <div className="animate-fadeIn">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Award className="w-4 h-4 mr-2 text-purple-500" />
                      Performance Tier *
                    </label>
                    <select
                      value={ruleForm.performanceTier}
                      onChange={(e) => setRuleForm({...ruleForm, performanceTier: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-purple-50/50"
                    >
                      <option value="">Select tier</option>
                      {performanceTiers.map(tier => (
                        <option key={tier} value={tier}>
                          {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {ruleForm.applyTo === 'specificProvider' && (
                  <div className="animate-fadeIn">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Users className="w-4 h-4 mr-2 text-green-500" />
                      Provider *
                    </label>
                    <select
                      value={ruleForm.specificProvider}
                      onChange={(e) => setRuleForm({...ruleForm, specificProvider: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-green-50/50"
                    >
                      <option value="">Select provider</option>
                      {providers.map(provider => (
                        <option key={provider._id} value={provider._id}>
                          {provider.name} - {provider.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowRuleModal(false);
                    setEditingRule(null);
                    resetRuleForm();
                  }}
                  className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 border-2 border-gray-200 rounded-xl hover:bg-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRule}
                  disabled={loading}
                  className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-700 border-2 border-transparent rounded-xl hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {editingRule ? 'Update Rule' : 'Create Rule'}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminCommissionPage;
