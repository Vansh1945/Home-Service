import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ComplaintsPage = () => {
  const { token, user, logoutUser, isAuthenticated, API, API_URL_IMAGE } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openNewComplaint, setOpenNewComplaint] = useState(false);
  const [openComplaintDetail, setOpenComplaintDetail] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [formData, setFormData] = useState({
    bookingId: '',
    message: '',
    imageProof: null,
    previewImage: null
  });
  const [formErrors, setFormErrors] = useState({
    bookingId: '',
    message: ''
  });
  const [reopenReason, setReopenReason] = useState('');

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch complaints
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/complaint/my-complaints`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const complaintsWithFullUrls = response.data.complaints.map(complaint => ({
        ...complaint,
        imageUrl: complaint.imageProof 
          ? `${API_URL_IMAGE}/${complaint.imageProof.replace(/\\/g, '/')}`
          : null
      }));
      setComplaints(complaintsWithFullUrls);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
      setError(err.response?.data?.message || 'Failed to fetch complaints');
      setLoading(false);
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        logoutUser();
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchComplaints();
    }
  }, [isAuthenticated]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        toast.error('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        imageProof: file,
        previewImage: URL.createObjectURL(file)
      }));
    }
  };

  // Remove selected image
  const removeImage = () => {
    if (formData.previewImage) {
      URL.revokeObjectURL(formData.previewImage);
    }
    setFormData(prev => ({
      ...prev,
      imageProof: null,
      previewImage: null
    }));
  };

  // Validate form
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      bookingId: '',
      message: ''
    };

    if (!formData.bookingId.trim()) {
      newErrors.bookingId = 'Booking ID is required';
      valid = false;
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Complaint message is required';
      valid = false;
    } else if (formData.message.trim().length < 20) {
      newErrors.message = 'Message must be at least 20 characters';
      valid = false;
    }

    setFormErrors(newErrors);
    return valid;
  };

  // Submit new complaint
  const submitComplaint = async () => {
    if (!validateForm()) return;

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('bookingId', formData.bookingId);
      formDataToSend.append('message', formData.message);
      if (formData.imageProof) {
        formDataToSend.append('imageProof', formData.imageProof);
      }

      await axios.post(`${API}/complaint`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Complaint submitted successfully!');
      setOpenNewComplaint(false);
      resetForm();
      fetchComplaints();
    } catch (err) {
      console.error('Failed to submit complaint:', err);
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
      if (err.response?.status === 401) {
        logoutUser();
      }
    }
  };

  // View complaint details
  const viewComplaintDetails = async (complaintId) => {
    try {
      const response = await axios.get(`${API}/complaint/${complaintId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const complaintWithFullUrl = {
        ...response.data.complaint,
        imageUrl: response.data.complaint.imageProof 
          ? `${API_URL_IMAGE}/${response.data.complaint.imageProof.replace(/\\/g, '/')}`
          : null
      };
      setSelectedComplaint(complaintWithFullUrl);
      setOpenComplaintDetail(true);
    } catch (err) {
      console.error('Failed to fetch complaint details:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch complaint details');
    }
  };

  // Reopen complaint
  const reopenComplaint = async () => {
    if (!reopenReason.trim()) {
      toast.error('Please provide a reason for reopening');
      return;
    }

    try {
      await axios.put(
        `${API}/complaint/${selectedComplaint._id}/reopen`,
        { reason: reopenReason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success('Complaint reopened successfully!');
      setOpenComplaintDetail(false);
      setReopenReason('');
      fetchComplaints();
    } catch (err) {
      console.error('Failed to reopen complaint:', err);
      toast.error(err.response?.data?.message || 'Failed to reopen complaint');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      bookingId: '',
      message: '',
      imageProof: null,
      previewImage: null
    });
    setFormErrors({
      bookingId: '',
      message: ''
    });
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

  // Status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
          <h1 className="text-3xl font-bold text-secondary">Help & Support</h1>
          <button
            onClick={() => setOpenNewComplaint(true)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center mt-4 md:mt-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Raise Complaint
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary">FAQ & Policies</h3>
            </div>
            <p className="text-gray-600 mb-4">Find answers to common questions about refunds, cancellations, and safety policies.</p>
            <button className="text-primary hover:text-primary/80 font-medium">View FAQs</button>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow p-6">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary">Raise Complaint</h3>
            </div>
            <p className="text-gray-600 mb-4">Report fraud, bad service, or any issues with your booking.</p>
            <button 
              onClick={() => setOpenNewComplaint(true)}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Submit Complaint
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow p-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary">Live Support</h3>
            </div>
            <p className="text-gray-600 mb-4">Need immediate help? Chat or call our support team 24/7.</p>
            <div className="flex space-x-4">
              <button className="text-primary hover:text-primary/80 font-medium">Chat Now</button>
              <button className="text-primary hover:text-primary/80 font-medium">Call Support</button>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-secondary">My Complaint Tickets</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-secondary">No complaints found</h3>
              <p className="mt-1 text-gray-500">You haven't submitted any complaints yet.</p>
              <div className="mt-6">
                <button
                  onClick={() => setOpenNewComplaint(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Submit Your First Complaint
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {complaints.map((complaint) => (
                <div key={complaint._id} className="p-6 hover:bg-gray-50/50 transition-colors duration-150">
                  <div className="flex flex-col md:flex-row md:justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-secondary">Complaint #{complaint._id.substring(0, 8)}</h3>
                      <p className="text-sm text-gray-500 mt-1">Booking: {complaint.booking}</p>
                    </div>
                    <div className="flex items-center mt-2 md:mt-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                        {complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-600">
                    {complaint.message.length > 100
                      ? `${complaint.message.substring(0, 100)}...`
                      : complaint.message}
                  </p>
                  <div className="mt-4 flex flex-col md:flex-row md:justify-between md:items-center">
                    <span className="text-sm text-gray-500">{formatDate(complaint.createdAt)}</span>
                    <button
                      onClick={() => viewComplaintDetails(complaint._id)}
                      className="text-primary hover:text-primary/80 font-medium flex items-center mt-2 md:mt-0"
                    >
                      View Details
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Complaint Modal */}
        {openNewComplaint && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-secondary">Submit New Complaint</h3>
                <button
                  onClick={() => {
                    setOpenNewComplaint(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label htmlFor="bookingId" className="block text-sm font-medium text-secondary mb-1">
                    Booking ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="bookingId"
                    name="bookingId"
                    value={formData.bookingId}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${formErrors.bookingId ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="Enter your booking ID"
                  />
                  {formErrors.bookingId && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.bookingId}</p>
                  )}
                </div>

                <div className="mb-6">
                  <label htmlFor="message" className="block text-sm font-medium text-secondary mb-1">
                    Complaint Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="4"
                    value={formData.message}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${formErrors.message ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="Describe your complaint in detail (minimum 20 characters)"
                  ></textarea>
                  {formErrors.message && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.message}</p>
                  )}
                  {!formErrors.message && (
                    <p className="mt-1 text-sm text-gray-500">Minimum 20 characters required</p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Image Proof (Optional)
                  </label>
                  {!formData.previewImage ? (
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              onChange={handleImageUpload}
                              accept="image/*"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={formData.previewImage}
                        alt="Preview"
                        className="max-w-full h-auto max-h-64 rounded-md"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50/80 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setOpenNewComplaint(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={submitComplaint}
                  disabled={!formData.bookingId || !formData.message}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${!formData.bookingId || !formData.message ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                >
                  Submit Complaint
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complaint Detail Modal */}
        {openComplaintDetail && selectedComplaint && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl max-w-3xl w-full max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-secondary">Complaint Details</h3>
                <button
                  onClick={() => setOpenComplaintDetail(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-md font-medium text-secondary mb-3">Complaint Information</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-medium">ID:</span> {selectedComplaint._id}</p>
                      <p className="text-sm flex items-center">
                        <span className="font-medium">Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedComplaint.status)}`}>
                          {selectedComplaint.status.charAt(0).toUpperCase() + selectedComplaint.status.slice(1)}
                        </span>
                      </p>
                      <p className="text-sm"><span className="font-medium">Submitted:</span> {formatDate(selectedComplaint.createdAt)}</p>
                      {selectedComplaint.resolvedAt && (
                        <p className="text-sm"><span className="font-medium">Resolved:</span> {formatDate(selectedComplaint.resolvedAt)}</p>
                      )}
                      <p className="text-sm"><span className="font-medium">Booking ID:</span> {selectedComplaint.booking}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-secondary mb-3">Provider Information</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-medium">Name:</span> {selectedComplaint.provider?.name || 'N/A'}</p>
                      <p className="text-sm"><span className="font-medium">Contact:</span> {selectedComplaint.provider?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-md font-medium text-secondary mb-3">Complaint Message</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-700">{selectedComplaint.message}</p>
                  </div>
                </div>

                {selectedComplaint.imageUrl && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-secondary mb-3">Image Proof</h4>
                    <div className="flex justify-center">
                      <img
                        src={selectedComplaint.imageProof}
                        alt="Complaint proof"
                        className="max-w-full h-auto max-h-64 rounded-md"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedComplaint.responseByAdmin && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-secondary mb-3">Admin Response</h4>
                    <div className="bg-blue-50 p-4 rounded-md">
                      <p className="text-gray-700">{selectedComplaint.responseByAdmin}</p>
                    </div>
                  </div>
                )}

                {selectedComplaint.status === 'resolved' && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-secondary mb-3">Reopen Complaint</h4>
                    <textarea
                      rows="3"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder="Please explain why you're reopening this complaint"
                    ></textarea>
                    <p className="mt-1 text-sm text-gray-500">Your complaint will be reopened for review</p>
                  </div>
                )}
              </div>
              <div className="bg-gray-50/80 px-6 py-4 flex flex-col md:flex-row md:justify-between space-y-3 md:space-y-0">
                {selectedComplaint.status === 'resolved' && (
                  <button
                    onClick={reopenComplaint}
                    disabled={!reopenReason.trim()}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${!reopenReason.trim() ? 'bg-yellow-300 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500`}
                  >
                    Reopen Complaint
                  </button>
                )}
                <button
                  onClick={() => setOpenComplaintDetail(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintsPage;