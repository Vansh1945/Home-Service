import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Rating,
  Badge,
  Tabs,
  Tab,
  Snackbar,
  Fab,
  Modal
} from '@mui/material';
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
import { styled } from '@mui/material/styles';

// Custom styled components
const StyledRating = styled(Rating)({
  '& .MuiRating-iconFilled': {
    color: '#facc15',
  },
  '& .MuiRating-iconHover': {
    color: '#eab308',
  },
});

const PrimaryButton = styled(Button)({
  backgroundColor: '#2563eb',
  color: 'white',
  fontWeight: 600,
  padding: '8px 24px',
  borderRadius: '12px',
  textTransform: 'none',
  '&:hover': {
    backgroundColor: '#1e40af',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  '&:disabled': {
    backgroundColor: '#bfdbfe'
  }
});

const FeedbackCardWrapper = styled(Card)({
  border: 'none',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.12)'
  }
});

const ImagePreview = styled('img')({
  width: '100%',
  height: '150px',
  objectFit: 'cover',
  borderRadius: '8px',
  marginBottom: '8px',
  cursor: 'pointer'
});

const FeedbackManagement = () => {
  const { token, user, API, showToast, isAuthenticated, logoutUser } = useAuth();
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
    serviceComment: '',
    beforeServiceImages: [],
    afterServiceImages: []
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
  const [imagePreview, setImagePreview] = useState(null);

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
        serviceComment: data.data.serviceFeedback.comment || '',
        beforeServiceImages: data.data.beforeServiceImages || [],
        afterServiceImages: data.data.afterServiceImages || []
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

  // Handle image upload
  const handleImageUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // In a real app, you would upload these to a storage service
    // For demo purposes, we'll just create object URLs
    const imageUrls = files.map(file => URL.createObjectURL(file));

    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], ...imageUrls]
    }));
  };

  // Remove image
  const handleRemoveImage = (type, index) => {
    setFormData(prev => {
      const updatedImages = [...prev[type]];
      updatedImages.splice(index, 1);
      return {
        ...prev,
        [type]: updatedImages
      };
    });
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
        serviceComment: formData.serviceComment,
        beforeServiceImages: formData.beforeServiceImages,
        afterServiceImages: formData.afterServiceImages
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
        serviceComment: '',
        beforeServiceImages: [],
        afterServiceImages: []
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
        serviceComment: formData.serviceComment,
        beforeServiceImages: formData.beforeServiceImages,
        afterServiceImages: formData.afterServiceImages
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
      serviceComment: feedback.serviceFeedback.comment || '',
      beforeServiceImages: feedback.beforeServiceImages || [],
      afterServiceImages: feedback.afterServiceImages || []
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
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchFeedbacks();
  }, [isAuthenticated]);

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
    <Box component="form" onSubmit={isEdit ? handleUpdateFeedback : handleSubmitFeedback}>
      <Grid container spacing={3}>
        {/* Service Feedback Section */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1e3a8a' }}>
            <WorkIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#2563eb' }} />
            Rate the Service
          </Typography>
          <Paper sx={{ p: 3, backgroundColor: '#ffffff', borderRadius: '12px' }}>
            <Box mb={3}>
              <Typography component="legend" variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
                How satisfied are you with the service?
              </Typography>
              <StyledRating
                name="serviceRating"
                value={Number(formData.serviceRating) || 5}
                precision={0.5}
                onChange={(event, newValue) => handleRatingChange('serviceRating', newValue || 5)}
                icon={<StarIcon fontSize="inherit" />}
                emptyIcon={<StarIcon fontSize="inherit" style={{ opacity: 0.3 }} />}
                size="large"
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {formData.serviceRating} out of 5 stars
              </Typography>
            </Box>
            
            <TextField
              fullWidth
              label="Share your experience (optional)"
              name="serviceComment"
              value={formData.serviceComment}
              onChange={handleInputChange}
              multiline
              rows={3}
              variant="outlined"
              placeholder="Tell us what you liked or didn't like about the service..."
              inputProps={{ maxLength: 500 }}
              helperText={`${formData.serviceComment.length}/500 characters`}
              sx={{ mb: 2 }}
            />

            {/* Before Service Images */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                Upload "Before Service" Photos (Max 5)
              </Typography>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="before-service-upload"
                type="file"
                multiple
                onChange={(e) => handleImageUpload(e, 'beforeServiceImages')}
                disabled={formData.beforeServiceImages.length >= 5}
              />
              <label htmlFor="before-service-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCamera />}
                  disabled={formData.beforeServiceImages.length >= 5}
                >
                  Add Before Photos
                </Button>
              </label>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Upload photos showing the condition before service was performed
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {formData.beforeServiceImages.map((img, index) => (
                  <Grid item xs={6} sm={4} md={3} key={index}>
                    <Box position="relative">
                      <ImagePreview 
                        src={img} 
                        alt={`Before service ${index + 1}`}
                        onClick={() => setImagePreview(img)}
                      />
                      <IconButton
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: 0,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.7)'
                          }
                        }}
                        onClick={() => handleRemoveImage('beforeServiceImages', index)}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* After Service Images */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                Upload "After Service" Photos (Max 5)
              </Typography>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="after-service-upload"
                type="file"
                multiple
                onChange={(e) => handleImageUpload(e, 'afterServiceImages')}
                disabled={formData.afterServiceImages.length >= 5}
              />
              <label htmlFor="after-service-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCamera />}
                  disabled={formData.afterServiceImages.length >= 5}
                >
                  Add After Photos
                </Button>
              </label>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Upload photos showing the condition after service was completed
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {formData.afterServiceImages.map((img, index) => (
                  <Grid item xs={6} sm={4} md={3} key={index}>
                    <Box position="relative">
                      <ImagePreview 
                        src={img} 
                        alt={`After service ${index + 1}`}
                        onClick={() => setImagePreview(img)}
                      />
                      <IconButton
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: 0,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.7)'
                          }
                        }}
                        onClick={() => handleRemoveImage('afterServiceImages', index)}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Provider Feedback Section */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1e3a8a' }}>
            <PersonIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#2563eb' }} />
            Rate the Service Provider
          </Typography>
          <Paper sx={{ p: 3, backgroundColor: '#ffffff', borderRadius: '12px' }}>
            <Box mb={3}>
              <Typography component="legend" variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
                How would you rate the provider's service?
              </Typography>
              <StyledRating
                name="providerRating"
                value={Number(formData.providerRating) || 5}
                precision={0.5}
                onChange={(event, newValue) => handleRatingChange('providerRating', newValue || 5)}
                icon={<StarIcon fontSize="inherit" />}
                emptyIcon={<StarIcon fontSize="inherit" style={{ opacity: 0.3 }} />}
                size="large"
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {formData.providerRating} out of 5 stars
              </Typography>
            </Box>
            
            <TextField
              fullWidth
              label="Tell us about the provider (optional)"
              name="providerComment"
              value={formData.providerComment}
              onChange={handleInputChange}
              multiline
              rows={3}
              variant="outlined"
              placeholder="Was the provider professional, punctual, and helpful?"
              inputProps={{ maxLength: 500 }}
              helperText={`${formData.providerComment.length}/500 characters`}
            />
          </Paper>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => isEdit ? setOpenEditModal(false) : setOpenDialog(false)}
              disabled={isSubmitting}
              sx={{ borderRadius: '12px' }}
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSubmitting ? 'Submitting...' : isEdit ? 'Update Review' : 'Submit Review'}
            </PrimaryButton>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  // Feedback card component
  const FeedbackCard = ({ feedback }) => (
    <FeedbackCardWrapper sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {feedback.serviceFeedback?.service?.title || 'Service'}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarIcon sx={{ fontSize: '1rem' }} />
              <Typography variant="body2">
                {format(new Date(feedback.booking?.date || feedback.createdAt), 'MMM dd, yyyy')}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Chip
              label={format(new Date(feedback.createdAt), 'MMM dd, yyyy')}
              size="small"
              variant="outlined"
            />
            {canEditFeedback(feedback) && (
              <Chip
                label="Editable"
                size="small"
                color="success"
              />
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          {/* Service Rating */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Service Review
            </Typography>
            <Box display="flex" alignItems="center" mb={1}>
              <StyledRating
                value={feedback.serviceFeedback?.rating || 0}
                precision={0.5}
                readOnly
                icon={<StarIcon fontSize="inherit" />}
                emptyIcon={<StarIcon fontSize="inherit" style={{ opacity: 0.3 }} />}
              />
              <Typography variant="body1" sx={{ ml: 1, fontWeight: 500 }}>
                {feedback.serviceFeedback?.rating?.toFixed(1) || 'N/A'}
              </Typography>
            </Box>
            
            {feedback.serviceFeedback?.comment && (
              <Typography variant="body2" sx={{ mt: 1, backgroundColor: '#f5f5f5', p: 2, borderRadius: '8px' }}>
                "{feedback.serviceFeedback.comment}"
              </Typography>
            )}

            {/* Service Images */}
            {(feedback.beforeServiceImages?.length > 0 || feedback.afterServiceImages?.length > 0) && (
              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                  Service Photos
                </Typography>
                
                {feedback.beforeServiceImages?.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                      Before Service
                    </Typography>
                    <Grid container spacing={1}>
                      {feedback.beforeServiceImages.map((img, index) => (
                        <Grid item xs={4} key={`before-${index}`}>
                          <ImagePreview 
                            src={img} 
                            alt={`Before service ${index + 1}`}
                            onClick={() => setImagePreview(img)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                
                {feedback.afterServiceImages?.length > 0 && (
                  <Box>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                      After Service
                    </Typography>
                    <Grid container spacing={1}>
                      {feedback.afterServiceImages.map((img, index) => (
                        <Grid item xs={4} key={`after-${index}`}>
                          <ImagePreview 
                            src={img} 
                            alt={`After service ${index + 1}`}
                            onClick={() => setImagePreview(img)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            )}
          </Grid>

          {/* Provider Rating */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Provider Review
            </Typography>
            <Box display="flex" alignItems="center" mb={1}>
              <StyledRating
                value={feedback.providerFeedback?.rating || 0}
                precision={0.5}
                readOnly
                icon={<StarIcon fontSize="inherit" />}
                emptyIcon={<StarIcon fontSize="inherit" style={{ opacity: 0.3 }} />}
              />
              <Typography variant="body1" sx={{ ml: 1, fontWeight: 500 }}>
                {feedback.providerFeedback?.rating?.toFixed(1) || 'N/A'}
              </Typography>
            </Box>
            
            {feedback.providerFeedback?.comment && (
              <Typography variant="body2" sx={{ mt: 1, backgroundColor: '#f5f5f5', p: 2, borderRadius: '8px' }}>
                "{feedback.providerFeedback.comment}"
              </Typography>
            )}
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box mt={3} display="flex" justifyContent="flex-end" gap={1}>
          {canEditFeedback(feedback) && (
            <PrimaryButton
              size="medium"
              startIcon={<EditIcon />}
              onClick={() => handleOpenEditModal(feedback)}
            >
              Edit
            </PrimaryButton>
          )}
        </Box>
      </CardContent>
    </FeedbackCardWrapper>
  );

  // Booking selection dialog
  const BookingSelectionDialog = () => (
    <Dialog open={openBookingDialog} onClose={() => setOpenBookingDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Select Booking to Review
      </DialogTitle>
      <DialogContent>
        {bookingsForFeedback.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Bookings Available for Review
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              You've either reviewed all your completed bookings or don't have any bookings ready for review yet.
            </Typography>
          </Box>
        ) : (
          <List>
            {bookingsForFeedback.map(booking => (
              <Card 
                key={booking._id}
                onClick={() => handleBookingSelect(booking)}
                sx={{ mb: 2, cursor: 'pointer' }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                      src={booking.services?.[0]?.service?.image || ''}
                      sx={{ width: 56, height: 56 }}
                    >
                      {booking.services?.[0]?.service?.title?.charAt(0) || 'S'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {booking.services?.[0]?.service?.title || 'Service'}
                      </Typography>
                      <Typography variant="body2">
                        {format(new Date(booking.date), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="body2">
                        Provider: {booking.provider?.name || 'Unknown'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenBookingDialog(false)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Feedback submission dialog
  const FeedbackSubmissionDialog = () => (
    <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        <Box display="flex" alignItems="center">
          {selectedBooking && (
            <IconButton edge="start" onClick={() => {
              setOpenDialog(false);
              setOpenBookingDialog(true);
            }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          {selectedBooking ? `Review for ${selectedBooking.services?.[0]?.service?.title}` : 'Submit Feedback'}
        </Box>
        {selectedBooking && (
          <Typography variant="body2">
            Booking Date: {format(new Date(selectedBooking.date), 'MMM dd, yyyy')}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <FeedbackForm />
      </DialogContent>
    </Dialog>
  );

  // Edit feedback modal
  const EditFeedbackModal = () => (
    <Modal
      open={openEditModal}
      onClose={() => setOpenEditModal(false)}
      aria-labelledby="edit-feedback-modal"
      aria-describedby="edit-feedback-form"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        maxWidth: 900,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: '16px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography id="edit-feedback-modal" variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Edit Your Review
          </Typography>
          <IconButton onClick={() => setOpenEditModal(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          You can update your review within 7 days of submission.
        </Typography>
        
        <Paper sx={{ p: 4, borderRadius: '12px' }}>
          <FeedbackForm isEdit />
        </Paper>
      </Box>
    </Modal>
  );

  // Image preview modal
  const ImagePreviewModal = () => (
    <Dialog
      open={!!imagePreview}
      onClose={() => setImagePreview(null)}
      maxWidth="md"
    >
      <DialogContent>
        <img 
          src={imagePreview} 
          alt="Preview" 
          style={{ 
            width: '100%', 
            height: 'auto',
            maxHeight: '80vh',
            objectFit: 'contain'
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setImagePreview(null)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          My Reviews
        </Typography>
        <Typography variant="body1">
          Manage your service and provider reviews
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="All Reviews" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab label="Editable" sx={{ textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <>
          {activeTab === 0 && feedbacks.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No Reviews Yet
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                You haven't reviewed any of your completed bookings. Share your experience to help others.
              </Typography>
              <PrimaryButton 
                onClick={() => setOpenBookingDialog(true)}
                startIcon={<EditIcon />}
              >
                Write Your First Review
              </PrimaryButton>
            </Paper>
          )}

          {activeTab === 1 && feedbacks.filter(f => canEditFeedback(f)).length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No Editable Reviews
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                You don't have any reviews that can be edited. Reviews can only be edited within 7 days of submission.
              </Typography>
            </Paper>
          )}

          {(activeTab === 0 && feedbacks.length > 0) && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                All Reviews ({feedbacks.length})
              </Typography>
              {feedbacks.map(feedback => (
                <FeedbackCard key={feedback._id} feedback={feedback} />
              ))}
            </Box>
          )}

          {(activeTab === 1 && feedbacks.filter(f => canEditFeedback(f)).length > 0) && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Editable Reviews ({feedbacks.filter(f => canEditFeedback(f)).length})
              </Typography>
              {feedbacks
                .filter(f => canEditFeedback(f))
                .map(feedback => (
                  <FeedbackCard key={feedback._id} feedback={feedback} />
                ))}
            </Box>
          )}
        </>
      )}

      <BookingSelectionDialog />
      <FeedbackSubmissionDialog />
      <EditFeedbackModal />
      <ImagePreviewModal />

      <Fab
        color="primary"
        aria-label="add review"
        sx={{ position: 'fixed', bottom: 32, right: 32, display: { xs: 'flex', md: 'none' } }}
        onClick={() => setOpenBookingDialog(true)}
      >
        <AddIcon />
      </Fab>

      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <PrimaryButton
          startIcon={<EditIcon />}
          onClick={() => setOpenBookingDialog(true)}
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
        >
          Write Review
        </PrimaryButton>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FeedbackManagement;