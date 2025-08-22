import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Star,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Award,
  AlertTriangle,
  User,
  FileText,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileImage,
  Image,
  File
} from 'lucide-react';
import { useAuth } from '../../store/auth';

const AdminProvidersPage = () => {
  const { API } = useAuth();
  const [providers, setProviders] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [documents, setDocuments] = useState({
    profilePic: null,
    resume: null,
    passbook: null
  });
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    fetchProviders();
    fetchPendingProviders();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/admin/providers?page=${currentPage}&limit=10&search=${searchTerm}&status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setProviders(data.providers);
        setTotalPages(data.pages);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingProviders = async () => {
    try {
      const response = await fetch(`${API}/admin/providers/pending`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPendingProviders(data.providers);
      }
    } catch (error) {
      console.error('Error fetching pending providers:', error);
    }
  };

  const fetchProviderDetails = async (providerId) => {
    try {
      const response = await fetch(`${API}/admin/providers/${providerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSelectedProvider(data.provider || data.data?.provider);
        fetchProviderDocuments(providerId);
      }
    } catch (error) {
      console.error('Error fetching provider details:', error);
    }
  };

  const fetchProviderDocuments = async (providerId) => {
    setLoadingDocuments(true);
    try {
      // Fetch all document URLs in parallel
      const [profilePicUrl, resumeUrl, passbookUrl] = await Promise.all([
        fetchDocument(providerId, 'profile'),
        fetchDocument(providerId, 'resume'),
        fetchDocument(providerId, 'passbook')
      ]);

      setDocuments({
        profilePic: profilePicUrl,
        resume: resumeUrl,
        passbook: passbookUrl
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchDocument = async (providerId, type) => {
    try {
      const response = await fetch(`${API}/admin/providers/${providerId}/documents/${type}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`Error fetching ${type} document:`, error);
      return null;
    }
  };

  const handleApproveProvider = async () => {
    try {
      const response = await fetch(`${API}/admin/providers/${selectedProvider._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: approvalAction,
          remarks: approvalRemarks
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setShowApprovalModal(false);
        setApprovalRemarks('');
        fetchProviders();
        fetchPendingProviders();
        setSelectedProvider(null);
        alert(`Provider ${approvalAction} successfully!`);
      }
    } catch (error) {
      console.error('Error updating provider status:', error);
    }
  };

  const openApprovalModal = (action, provider) => {
    setSelectedProvider(provider);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const closeModal = () => {
    setSelectedProvider(null);
    // Clean up object URLs when modal closes
    Object.values(documents).forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    setDocuments({
      profilePic: null,
      resume: null,
      passbook: null
    });
  };

  const downloadDocument = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const ProviderCard = ({ provider, isPending = false }) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-full flex items-center justify-center overflow-hidden">
              {provider.profilePicUrl && provider.profilePicUrl !== 'default-provider.jpg' ? (
                <img 
                  src={`${API}/admin/providers/${provider._id}/documents/profile`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{provider.name}</h3>
              <p className="text-gray-600 flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                {provider.email}
              </p>
              <p className="text-gray-600 flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                {provider.phone}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              provider.approved 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-400 text-yellow-900'
            }`}>
              {provider.approved ? 'Approved' : 'Pending'}
            </span>
            {provider.testPassed && (
              <span className="px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-xs font-medium">
                Test Passed
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {provider.serviceArea || 'N/A'}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Award className="w-4 h-4 mr-2" />
            {provider.experience || '0'} years exp.
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            {new Date(provider.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign className="w-4 h-4 mr-2" />
            ₹{provider.wallet || 0}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Services:</p>
          <p className="text-sm font-medium text-gray-800">{provider.services || 'N/A'}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchProviderDetails(provider._id)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-900 transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </button>
          
          {isPending && (
            <>
              <button
                onClick={() => openApprovalModal('approved', provider)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-800 transition-colors"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </button>
              <button
                onClick={() => openApprovalModal('rejected', provider)}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-800 transition-colors"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const ProviderDetailsModal = () => {
    if (!selectedProvider) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Provider Details</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Basic Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="w-5 h-5 mr-3 text-blue-900" />
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{selectedProvider.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 mr-3 text-blue-900" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedProvider.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 mr-3 text-blue-900" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{selectedProvider.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-3 text-blue-900" />
                    <div>
                      <p className="text-sm text-gray-600">Service Area</p>
                      <p className="font-medium">{selectedProvider.serviceArea || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">₹{selectedProvider.wallet || 0}</p>
                    <p className="text-sm text-gray-600">Wallet Balance</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{selectedProvider.completedBookings || 0}</p>
                    <p className="text-sm text-gray-600">Completed Jobs</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-yellow-500">
                      {selectedProvider.completedBookings + (selectedProvider.canceledBookings || 0) || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Bookings</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-indigo-900">
                      {selectedProvider.rating ? `${selectedProvider.rating}/5` : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">Rating</p>
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Professional Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Services</p>
                    <p className="font-medium">{selectedProvider.services || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Experience</p>
                    <p className="font-medium">{selectedProvider.experience || '0'} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bank Account</p>
                    <p className="font-medium">
                      {selectedProvider.bankDetails?.accountNo || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">IFSC Code</p>
                    <p className="font-medium">
                      {selectedProvider.bankDetails?.ifsc || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Status Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Approval Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedProvider.approved 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-400 text-yellow-900'
                    }`}>
                      {selectedProvider.approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">KYC Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedProvider.kycStatus === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : selectedProvider.kycStatus === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-400 text-yellow-900'
                    }`}>
                      {selectedProvider.kycStatus || 'pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Test Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedProvider.testPassed 
                        ? 'bg-blue-200 text-blue-900' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedProvider.testPassed ? 'Passed' : 'Not Taken'}
                    </span>
                  </div>
                  {selectedProvider.kycStatus === 'rejected' && selectedProvider.rejectionReason && (
                    <div>
                      <p className="text-sm text-gray-600">Rejection Reason</p>
                      <p className="text-sm font-medium text-red-600">
                        {selectedProvider.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Documents</h3>
              {loadingDocuments ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Profile Picture */}
                  {documents.profilePic && (
                    <div className="bg-white p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center mb-2">
                        <Image className="w-4 h-4 mr-2 text-blue-600" />
                        <span className="font-medium text-sm">Profile Picture</span>
                      </div>
                      <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-2">
                        <img 
                          src={documents.profilePic} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => downloadDocument(documents.profilePic, 'profile.jpg')}
                        className="w-full py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center justify-center"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </button>
                    </div>
                  )}

                  {/* Resume */}
                  {documents.resume && (
                    <div className="bg-white p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center mb-2">
                        <File className="w-4 h-4 mr-2 text-blue-600" />
                        <span className="font-medium text-sm">Resume/CV</span>
                      </div>
                      <div className="aspect-[4/3] bg-gray-100 rounded-md flex items-center justify-center mb-2">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <button
                        onClick={() => window.open(documents.resume, '_blank')}
                        className="w-full py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center justify-center"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => downloadDocument(documents.resume, 'resume.pdf')}
                        className="w-full py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center justify-center mt-2"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </button>
                    </div>
                  )}

                  {/* Passbook */}
                  {documents.passbook && (
                    <div className="bg-white p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center mb-2">
                        <FileImage className="w-4 h-4 mr-2 text-blue-600" />
                        <span className="font-medium text-sm">Bank Passbook</span>
                      </div>
                      <div className="aspect-[4/3] bg-gray-100 rounded-md flex items-center justify-center mb-2">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <button
                        onClick={() => window.open(documents.passbook, '_blank')}
                        className="w-full py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center justify-center"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => downloadDocument(documents.passbook, 'passbook.pdf')}
                        className="w-full py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center justify-center mt-2"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </button>
                    </div>
                  )}

                  {/* Show message if no documents */}
                  {!documents.profilePic && !documents.resume && !documents.passbook && (
                    <div className="col-span-3 text-center py-4 text-gray-500">
                      No documents available for this provider
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!selectedProvider.approved && (
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => openApprovalModal('approved', selectedProvider)}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-800 transition-colors"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Approve Provider
                </button>
                <button
                  onClick={() => openApprovalModal('rejected', selectedProvider)}
                  className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-800 transition-colors"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Reject Provider
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ApprovalModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {approvalAction === 'approved' ? 'Approve' : 'Reject'} Provider
          </h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to {approvalAction === 'approved' ? 'approve' : 'reject'} this provider?
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks {approvalAction === 'rejected' && '(Required)'}
            </label>
            <textarea
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder={`Enter ${approvalAction === 'rejected' ? 'rejection' : 'approval'} remarks...`}
              required={approvalAction === 'rejected'}
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleApproveProvider}
              disabled={approvalAction === 'rejected' && !approvalRemarks}
              className={`flex-1 py-3 px-4 rounded-lg text-white font-medium transition-colors ${
                approvalAction === 'approved' 
                  ? 'bg-green-600 hover:bg-green-800' 
                  : 'bg-red-600 hover:bg-red-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {approvalAction === 'approved' ? 'Approve' : 'Reject'}
            </button>
            <button
              onClick={() => setShowApprovalModal(false)}
              className="flex-1 py-3 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const Pagination = () => (
    <div className="flex items-center justify-between mt-8">
      <div className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Provider Management</h1>
          <p className="text-gray-600">Manage service providers and their applications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Providers</p>
                <p className="text-2xl font-bold text-blue-600">{providers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-500">{pendingProviders.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{providers.filter(p => p.approved).length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Test Passed</p>
                <p className="text-2xl font-bold text-indigo-900">{providers.filter(p => p.testPassed).length}</p>
              </div>
              <Award className="w-8 h-8 text-indigo-900" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'all' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              All Providers
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'pending' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pending Approval ({pendingProviders.length})
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'all' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {providers.map(provider => (
                  <ProviderCard key={provider._id} provider={provider} />
                ))}
              </div>
            )}

            {activeTab === 'pending' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {pendingProviders.map(provider => (
                  <ProviderCard key={provider._id} provider={provider} isPending={true} />
                ))}
              </div>
            )}

            {activeTab === 'all' && <Pagination />}
          </>
        )}

        {/* Modals */}
        {selectedProvider && <ProviderDetailsModal />}
        {showApprovalModal && <ApprovalModal />}
      </div>
    </div>
  );
};

export default AdminProvidersPage;