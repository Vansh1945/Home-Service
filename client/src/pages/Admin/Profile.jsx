import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiUser, FiMail, FiLock, FiX, FiPlus, FiShield, FiUsers, FiSearch, FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';

const AdminProfile = () => {
  const { user, logoutUser, API } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Admin list state
  const [admins, setAdmins] = useState([]);
  const [adminStats, setAdminStats] = useState({ total: 0, page: 1, pages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showAdminList, setShowAdminList] = useState(false);

  // Fetch admin profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API}/admin/profile`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch profile');
        
        setProfile(data.admin);
      } catch (error) {
        toast.error(error.message);
      }
    };

    fetchProfile();
  }, [API]);

  // Handle register form changes
  const handleRegisterChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value
    });
  };

  // Handle new admin registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (registerData.password !== registerData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const response = await fetch(`${API}/admin/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');

      toast.success('New admin registered successfully!');
      setIsRegisterOpen(false);
      setRegisterData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      
      // Refresh admin list if it's currently shown
      if (showAdminList) {
        fetchAdmins();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Fetch all admins
  const fetchAdmins = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await fetch(`${API}/admin/admins?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch admins');

      setAdmins(data.admins);
      setAdminStats({
        total: data.total,
        page: data.page,
        pages: data.pages
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (showAdminList) {
        fetchAdmins(1, value);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchAdmins(newPage, searchTerm);
  };

  // Toggle admin list view
  const toggleAdminList = () => {
    setShowAdminList(!showAdminList);
    if (!showAdminList) {
      fetchAdmins();
    }
  };

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header with Register Button */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 sm:px-10 sm:py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="mt-1 text-blue-100">Welcome, {profile.name}</p>
              </div>
              
              {/* Register New Admin Button */}
              <button
                onClick={() => setIsRegisterOpen(true)}
                className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition"
              >
                <FiPlus className="mr-2" />
                Register New Admin
              </button>
            </div>
          </div>

          {/* Profile Information */}
          <div className="px-6 py-8 sm:px-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h2 className="text-lg font-medium text-blue-800 mb-4">
                  <FiUser className="inline mr-2" />
                  Personal Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-blue-600">Full Name</p>
                    <p className="text-lg font-medium">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Email Address</p>
                    <p className="text-lg font-medium">{profile.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-lg">
                <h2 className="text-lg font-medium text-indigo-800 mb-4">
                  <FiShield className="inline mr-2" />
                  Account Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-indigo-600">Role</p>
                    <p className="text-lg font-medium">Administrator</p>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-600">Member Since</p>
                    <p className="text-lg font-medium">
                      {new Date(profile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* View All Admins Section */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  <FiUsers className="inline mr-2" />
                  Admin Management
                </h2>
                <button
                  onClick={toggleAdminList}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <FiUsers className="mr-2" />
                  {showAdminList ? 'Hide Admin List' : 'View All Admins'}
                </button>
              </div>

              {showAdminList && (
                <div className="bg-gray-50 rounded-lg p-6">
                  {/* Search and Stats */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div className="relative mb-4 sm:mb-0">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search admins by name or email..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="pl-10 pr-4 py-2 w-full sm:w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      Total Admins: <span className="font-semibold">{adminStats.total}</span>
                    </div>
                  </div>

                  {/* Loading State */}
                  {loading && (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  )}

                  {/* Admin List */}
                  {!loading && admins.length > 0 && (
                    <div className="space-y-4">
                      {admins.map((admin) => (
                        <div key={admin._id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <FiUser className="text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{admin.name}</h3>
                                <p className="text-sm text-gray-500">{admin.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center text-sm text-gray-500 mb-1">
                                <FiCalendar className="mr-1" />
                                Joined {new Date(admin.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <FiShield className="mr-1" />
                                Administrator
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {!loading && admins.length === 0 && (
                    <div className="text-center py-8">
                      <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No admins found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchTerm ? 'Try adjusting your search terms.' : 'No administrators are registered yet.'}
                      </p>
                    </div>
                  )}

                  {/* Pagination */}
                  {!loading && admins.length > 0 && adminStats.pages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-700">
                        Showing page {adminStats.page} of {adminStats.pages}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiChevronLeft className="mr-1" />
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === adminStats.pages}
                          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                          <FiChevronRight className="ml-1" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <button
                onClick={logoutUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => setIsRegisterOpen(false)}
            ></div>

            {/* Modal content */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                {/* Modal header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      <FiShield className="inline mr-2 text-blue-600" />
                      Register New Admin
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">Enter details for the new administrator</p>
                  </div>
                  <button
                    onClick={() => setIsRegisterOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                {/* Registration form */}
                <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={registerData.name}
                        onChange={handleRegisterChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={registerData.email}
                        onChange={handleRegisterChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={registerData.password}
                        onChange={handleRegisterChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        minLength="6"
                      />
                    </div>

                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={registerData.confirmPassword}
                        onChange={handleRegisterChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Register Admin
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;