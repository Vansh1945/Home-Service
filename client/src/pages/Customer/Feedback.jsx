import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Star as StarIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  PhotoCamera
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';

const FeedbackManagement = () => {
  const { token, user, API, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { feedbackId } = useParams();

  // State management
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    providerRating: 5,
    providerComment: '',
    serviceRating: 5,
    serviceComment: ''
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingsForFeedback, setBookingsForFeedback] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openBookingDialog, setOpenBookingDialog] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // Fetch customer's feedbacks
  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/feedback/my-feedbacks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutUser();
          return;
        }
        throw new Error('Failed to fetch feedbacks');
      }

      const data = await response.json();
      setFeedbacks(data.data || []);
    } catch (err) {
      setError(err.message);
      showSnackbar(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch single feedback (when viewing/editing)
  const fetchFeedback = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/feedback/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutUser();
          return;
        }
        throw new Error('Failed to fetch feedback');
      }

      const data = await response.json();
      setEditingFeedback(data.data);
      
      // Pre-fill form for editing
      setFormData({
        providerRating: data.data.providerFeedback.rating,
        providerComment: data.data.providerFeedback.comment || '',
        serviceRating: data.data.serviceFeedback.rating,
        serviceComment: data.data.serviceFeedback.comment || ''
      });
    } catch (err) {
      setError(err.message);
      showSnackbar(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings eligible for feedback (completed bookings without feedback)
  const fetchEligibleBookings = async () => {
    try {
      const response = await fetch(`${API}/booking/customer?status=completed`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch eligible bookings');
      }

      const data = await response.json();
      
      // Get booking IDs that already have feedback
      const feedbackBookingIds = feedbacks.map(f => f.booking._id);
      
      // Filter out bookings that already have feedback
      const eligibleBookings = data.data.filter(
        booking => !feedbackBookingIds.includes(booking._id)
      );
      
      setBookingsForFeedback(eligibleBookings || []);
    } catch (err) {
      console.error('Error fetching eligible bookings:', err);
      setBookingsForFeedback([]);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle rating changes
  const handleRatingChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit new feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    if (!selectedBooking) {
      showSnackbar('Please select a booking first', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const formPayload = {
        bookingId: selectedBooking._id,
        providerRating: formData.providerRating,
        providerComment: formData.providerComment,
        serviceRating: formData.serviceRating,
        serviceComment: formData.serviceComment
      };

      const response = await fetch(`${API}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit feedback');
      }

      showSnackbar('Feedback submitted successfully!', 'success');
      setOpenDialog(false);
      setSelectedBooking(null);
      setFormData({
        providerRating: 5,
        providerComment: '',
        serviceRating: 5,
        serviceComment: ''
      });
      fetchFeedbacks();
    } catch (err) {
      showSnackbar(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing feedback
  const handleUpdateFeedback = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formPayload = {
        providerRating: formData.providerRating,
        providerComment: formData.providerComment,
        serviceRating: formData.serviceRating,
        serviceComment: formData.serviceComment
      };

      const response = await fetch(`${API}/feedback/edit/${editingFeedback._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update feedback');
      }

      showSnackbar('Feedback updated successfully!', 'success');
      setOpenEditModal(false);
      fetchFeedbacks();
    } catch (err) {
      showSnackbar(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit modal
  const handleOpenEditModal = (feedback) => {
    setEditingFeedback(feedback);
    setFormData({
      providerRating: feedback.providerFeedback.rating,
      providerComment: feedback.providerFeedback.comment || '',
      serviceRating: feedback.serviceFeedback.rating,
      serviceComment: feedback.serviceFeedback.comment || ''
    });
    setOpenEditModal(true);
  };

  // Check if feedback can be edited (within 7 days)
  const canEditFeedback = (feedback) => {
    const feedbackDate = new Date(feedback.createdAt);
    const sevenDaysAgo = subDays(new Date(), 7);
    return feedbackDate > sevenDaysAgo;
  };

  // Show snackbar notification
  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Initialize component
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchFeedbacks();
  }, [user]);

  // Fetch eligible bookings whenever feedbacks change
  useEffect(() => {
    if (feedbacks.length >= 0) {
      fetchEligibleBookings();
    }
  }, [feedbacks]);

  // Handle booking selection
  const handleBookingSelect = (booking) => {
    setSelectedBooking(booking);
    setOpenBookingDialog(false);
    setOpenDialog(true);
  };

  // Feedback form component
  const FeedbackForm = ({ isEdit = false }) => (
    <form onSubmit={isEdit ? handleUpdateFeedback : handleSubmitFeedback} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Service Feedback Section */}
        <div>
          <h3 className="text-lg font-semibold text-secondary mb-4 flex items-center">
            <WorkIcon className="mr-2 text-primary" />
            Rate the Service
          </h3>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-medium text-secondary mb-2">
                How satisfied are you with the service?
              </p>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange('serviceRating', star)}
                    className="focus:outline-none"
                  >
                    <StarIcon
                      className={`h-8 w-8 ${star <= formData.serviceRating ? 'text-yellow-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-medium text-secondary">
                  {formData.serviceRating} out of 5
                </span>
              </div>
            </div>
            
            <div>
              <label htmlFor="serviceComment" className="block text-sm font-medium text-secondary mb-2">
                Share your experience (optional)
              </label>
              <textarea
                id="serviceComment"
                name="serviceComment"
                value={formData.serviceComment}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Tell us what you liked or didn't like about the service..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.serviceComment.length}/500 characters
              </p>
            </div>
          </div>
        </div>

        {/* Provider Feedback Section */}
        <div>
          <h3 className="text-lg font-semibold text-secondary mb-4 flex items-center">
            <PersonIcon className="mr-2 text-primary" />
            Rate the Service Provider
          </h3>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-medium text-secondary mb-2">
                How would you rate the provider's service?
              </p>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange('providerRating', star)}
                    className="focus:outline-none"
                  >
                    <StarIcon
                      className={`h-8 w-8 ${star <= formData.providerRating ? 'text-yellow-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-medium text-secondary">
                  {formData.providerRating} out of 5
                </span>
              </div>
            </div>
            
            <div>
              <label htmlFor="providerComment" className="block text-sm font-medium text-secondary mb-2">
                Tell us about the provider (optional)
              </label>
              <textarea
                id="providerComment"
                name="providerComment"
                value={formData.providerComment}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Was the provider professional, punctual, and helpful?"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.providerComment.length}/500 characters
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => isEdit ? setOpenEditModal(false) : setOpenDialog(false)}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-secondary bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : isEdit ? 'Update Review' : 'Submit Review'}
          </button>
        </div>
      </div>
    </form>
  );

  // Feedback card component
  const FeedbackCard = ({ feedback }) => (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 mb-4 transition-all hover:shadow-lg">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-secondary">
            {feedback.serviceFeedback?.service?.title || 'Service'}
          </h3>
          <div className="flex items-center mt-1 text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span>{format(new Date(feedback.booking?.date || feedback.createdAt), 'MMM dd, yyyy')}</span>
          </div>
        </div>
        <div className="flex space-x-2 mt-2 md:mt-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {format(new Date(feedback.createdAt), 'MMM dd, yyyy')}
          </span>
          {canEditFeedback(feedback) && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Editable
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 my-4"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Rating */}
        <div>
          <h4 className="text-md font-semibold text-secondary mb-2">
            Service Review
          </h4>
          <div className="flex items-center mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`h-5 w-5 ${star <= (feedback.serviceFeedback?.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm font-medium text-secondary">
              {feedback.serviceFeedback?.rating?.toFixed(1) || 'N/A'}
            </span>
          </div>
          
          {feedback.serviceFeedback?.comment && (
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md mt-2">
              "{feedback.serviceFeedback.comment}"
            </p>
          )}
        </div>

        {/* Provider Rating */}
        <div>
          <h4 className="text-md font-semibold text-secondary mb-2">
            Provider Review
          </h4>
          <div className="flex items-center mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`h-5 w-5 ${star <= (feedback.providerFeedback?.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm font-medium text-secondary">
              {feedback.providerFeedback?.rating?.toFixed(1) || 'N/A'}
            </span>
          </div>
          
          {feedback.providerFeedback?.comment && (
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md mt-2">
              "{feedback.providerFeedback.comment}"
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {canEditFeedback(feedback) && (
        <div className="flex justify-end mt-4">
          <button
            onClick={() => handleOpenEditModal(feedback)}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            <EditIcon className="h-4 w-4 mr-1" />
            Edit
          </button>
        </div>
      )}
    </div>
  );

  // Booking selection dialog
  const BookingSelectionDialog = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${openBookingDialog ? 'block' : 'hidden'}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-secondary">
            Select Booking to Review
          </h3>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          {bookingsForFeedback.length === 0 ? (
            <div className="text-center py-4">
              <h4 className="text-md font-semibold text-secondary mb-2">
                No Bookings Available for Review
              </h4>
              <p className="text-sm text-gray-600">
                You've either reviewed all your completed bookings or don't have any bookings ready for review yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingsForFeedback.map(booking => (
                <div 
                  key={booking._id}
                  onClick={() => handleBookingSelect(booking)}
                  className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {booking.services?.[0]?.service?.title?.charAt(0) || 'S'}
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-semibold text-secondary">
                        {booking.services?.[0]?.service?.title || 'Service'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {format(new Date(booking.date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Provider: {booking.provider?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => setOpenBookingDialog(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-secondary bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Feedback submission dialog
  const FeedbackSubmissionDialog = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${openDialog ? 'block' : 'hidden'}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            {selectedBooking && (
              <button 
                onClick={() => {
                  setOpenDialog(false);
                  setOpenBookingDialog(true);
                }}
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowBackIcon />
              </button>
            )}
            <h3 className="text-lg font-semibold text-secondary">
              {selectedBooking ? `Review for ${selectedBooking.services?.[0]?.service?.title}` : 'Submit Feedback'}
            </h3>
          </div>
          {selectedBooking && (
            <p className="text-sm text-gray-600 mt-1">
              Booking Date: {format(new Date(selectedBooking.date), 'MMM dd, yyyy')}
            </p>
          )}
        </div>
        <div className="p-6">
          <FeedbackForm />
        </div>
      </div>
    </div>
  );

  // Edit feedback modal
  const EditFeedbackModal = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${openEditModal ? 'block' : 'hidden'}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-secondary">
            Edit Your Review
          </h3>
          <button
            onClick={() => setOpenEditModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            You can update your review within 7 days of submission.
          </p>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border border-gray-200">
            <FeedbackForm isEdit />
          </div>
        </div>
      </div>
    </div>
  );

  // Snackbar notification
  const SnackbarNotification = () => (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-opacity duration-300 ${snackbarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`px-4 py-3 rounded-md shadow-md ${
        snackbarSeverity === 'error' ? 'bg-red-100 text-red-800' : 
        snackbarSeverity === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
        'bg-green-100 text-green-800'
      }`}>
        <div className="flex items-center">
          <span className="mr-2">
            {snackbarSeverity === 'error' ? '❌' : 
             snackbarSeverity === 'warning' ? '⚠️' : '✅'}
          </span>
          <span>{snackbarMessage}</span>
          <button
            onClick={handleSnackbarClose}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary">
            My Reviews
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your service and provider reviews
          </p>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab(0)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 0
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Reviews
            </button>
            <button
              onClick={() => setActiveTab(1)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 1
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Editable
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        ) : (
          <>
            {activeTab === 0 && feedbacks.length === 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-8 text-center">
                <h3 className="text-lg font-semibold text-secondary mb-2">
                  No Reviews Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  You haven't reviewed any of your completed bookings. Share your experience to help others.
                </p>
                <button
                  onClick={() => setOpenBookingDialog(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
                >
                  <EditIcon className="h-4 w-4 mr-1" />
                  Write Your First Review
                </button>
              </div>
            )}

            {activeTab === 1 && feedbacks.filter(f => canEditFeedback(f)).length === 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-8 text-center">
                <h3 className="text-lg font-semibold text-secondary mb-2">
                  No Editable Reviews
                </h3>
                <p className="text-gray-600">
                  You don't have any reviews that can be edited. Reviews can only be edited within 7 days of submission.
                </p>
              </div>
            )}

            {(activeTab === 0 && feedbacks.length > 0) && (
              <div>
                <h3 className="text-lg font-semibold text-secondary mb-4">
                  All Reviews ({feedbacks.length})
                </h3>
                {feedbacks.map(feedback => (
                  <FeedbackCard key={feedback._id} feedback={feedback} />
                ))}
              </div>
            )}

            {(activeTab === 1 && feedbacks.filter(f => canEditFeedback(f)).length > 0) && (
              <div>
                <h3 className="text-lg font-semibold text-secondary mb-4">
                  Editable Reviews ({feedbacks.filter(f => canEditFeedback(f)).length})
                </h3>
                {feedbacks
                  .filter(f => canEditFeedback(f))
                  .map(feedback => (
                    <FeedbackCard key={feedback._id} feedback={feedback} />
                  ))}
              </div>
            )}
          </>
        )}

        <BookingSelectionDialog />
        <FeedbackSubmissionDialog />
        <EditFeedbackModal />
        <SnackbarNotification />

        {/* Floating action button for mobile */}
        <button
          onClick={() => setOpenBookingDialog(true)}
          className="fixed bottom-8 right-8 md:hidden w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <AddIcon className="h-6 w-6" />
        </button>

        {/* Desktop button */}
        <button
          onClick={() => setOpenBookingDialog(true)}
          className="fixed bottom-8 right-8 hidden md:inline-flex items-center px-4 py-3 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <EditIcon className="h-5 w-5 mr-1" />
          Write Review
        </button>
      </div>
    </div>
  );
};

export default FeedbackManagement;