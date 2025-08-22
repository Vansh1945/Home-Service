import React, { useState, useEffect } from 'react';
import { Star, Calendar, User, MessageSquare, TrendingUp, Filter, Search, AlertCircle } from 'lucide-react';
import { useAuth } from '../../store/auth';

const ProviderFeedback = () => {
  const { API, token, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('feedback');
  const [filterRating, setFilterRating] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // State for feedback data
  const [feedbackData, setFeedbackData] = useState([]);
  const [ratingsStats, setRatingsStats] = useState({
    overallRating: 0,
    totalReviews: 0,
    ratingBreakdown: {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    },
    monthlyTrend: []
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // API Functions
  const fetchProviderFeedbacks = async () => {
    try {
      setError(null);
      const response = await fetch(`${API}/feedback/provider/my-feedbacks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        const formattedFeedbacks = data.data.map(feedback => ({
          id: feedback._id,
          customerName: feedback.customer?.name || 'Anonymous',
          customerAvatar: feedback.customer?.profilePicUrl,
          bookingId: feedback.booking?._id || 'N/A',
          service: feedback.serviceFeedback?.service?.title || 'Service',
          date: new Date(feedback.createdAt).toLocaleDateString('en-IN'),
          rating: feedback.providerFeedback?.rating || 0,
          feedback: feedback.providerFeedback?.comment || 'No comment provided',
          serviceRating: feedback.serviceFeedback?.rating || 0,
          serviceComment: feedback.serviceFeedback?.comment || '',
          isEdited: feedback.providerFeedback?.isEdited || false,
          bookingDate: feedback.booking?.date ? new Date(feedback.booking.date).toLocaleDateString('en-IN') : 'N/A'
        }));
        setFeedbackData(formattedFeedbacks);
        calculateStats(formattedFeedbacks);
      } else {
        throw new Error(data.message || 'Failed to fetch feedbacks');
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      setError(error.message);
      showToast('Failed to load feedbacks', 'error');
    }
  };

  const fetchProviderRating = async () => {
    try {
      const response = await fetch(`${API}/feedback/provider/average-rating`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        return {
          averageRating: data.data.averageRating || 0,
          ratingCount: data.data.ratingCount || 0
        };
      } else {
        throw new Error(data.message || 'Failed to fetch rating');
      }
    } catch (error) {
      console.error('Error fetching rating:', error);
      return { averageRating: 0, ratingCount: 0 };
    }
  };

  // Calculate statistics from feedback data
  const calculateStats = async (feedbacks) => {
    const ratingData = await fetchProviderRating();
    
    // Calculate rating breakdown
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbacks.forEach(feedback => {
      if (feedback.rating >= 1 && feedback.rating <= 5) {
        breakdown[feedback.rating]++;
      }
    });

    // Calculate monthly trend (last 7 months)
    const monthlyTrend = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      
      const monthFeedbacks = feedbacks.filter(feedback => {
        const feedbackDate = new Date(feedback.date);
        return feedbackDate.getMonth() === date.getMonth() && 
               feedbackDate.getFullYear() === date.getFullYear();
      });
      
      const avgRating = monthFeedbacks.length > 0 
        ? monthFeedbacks.reduce((sum, f) => sum + f.rating, 0) / monthFeedbacks.length 
        : 0;
      
      monthlyTrend.push({
        month: monthName,
        rating: parseFloat(avgRating.toFixed(1))
      });
    }

    setRatingsStats({
      overallRating: ratingData.averageRating,
      totalReviews: ratingData.ratingCount,
      ratingBreakdown: breakdown,
      monthlyTrend
    });
  };

  // Load data on component mount
  useEffect(() => {
    if (token) {
      fetchProviderFeedbacks();
    }
  }, [token]);

  // Filter and pagination logic
  const filteredFeedback = feedbackData.filter(item => {
    const matchesRating = filterRating === 'all' || item.rating === parseInt(filterRating);
    const matchesSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.bookingId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRating && matchesSearch;
  });

  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
  const paginatedFeedback = filteredFeedback.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const StarRating = ({ rating, size = 'w-5 h-5' }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  // Error component
  const ErrorMessage = () => (
    <div className="flex justify-center items-center py-12">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchProviderFeedbacks}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const FeedbackView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Customer Feedback</h2>
          <p className="text-sm text-gray-600">Total: {filteredFeedback.length} feedback(s)</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, service, or booking ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterRating}
            onChange={(e) => {
              setFilterRating(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Feedback Cards */}
      <div className="space-y-4">
        {paginatedFeedback.map((feedback) => (
          <div key={feedback.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  {feedback.customerAvatar ? (
                    <img
                      src={feedback.customerAvatar}
                      alt={feedback.customerName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{feedback.customerName}</h4>
                    <p className="text-sm text-gray-500">Booking ID: {feedback.bookingId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <StarRating rating={feedback.rating} />
                  <p className="text-sm text-gray-500 mt-1">{formatDate(feedback.date)}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Service: {feedback.service}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Booking Date: {feedback.bookingDate}</span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="w-4 h-4 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-gray-700 text-sm leading-relaxed">{feedback.feedback}</p>
                    {feedback.serviceComment && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Service Feedback:</p>
                        <div className="flex items-center space-x-2">
                          <StarRating rating={feedback.serviceRating} size="w-3 h-3" />
                          <span className="text-sm text-gray-600">{feedback.serviceComment}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <div className="flex space-x-1">
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {filteredFeedback.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No feedback found matching your criteria.</p>
        </div>
      )}
    </div>
  );

  const RatingsTracker = () => (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">{ratingsStats.overallRating}</div>
          <StarRating rating={Math.round(ratingsStats.overallRating)} size="w-6 h-6" />
          <p className="text-gray-500 mt-2">Overall Rating</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{ratingsStats.totalReviews}</div>
          <p className="text-gray-500">Total Reviews</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {ratingsStats.totalReviews > 0 ? Math.round((ratingsStats.ratingBreakdown[5] / ratingsStats.totalReviews) * 100) : 0}%
          </div>
          <p className="text-gray-500">5-Star Reviews</p>
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Rating Breakdown</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingsStats.ratingBreakdown[rating];
            const percentage = ratingsStats.totalReviews > 0 ? (count / ratingsStats.totalReviews) * 100 : 0;
            return (
              <div key={rating} className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 w-16">
                  <span className="text-sm font-medium">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Monthly Rating Trend
        </h3>
        <div className="grid grid-cols-7 gap-4">
          {ratingsStats.monthlyTrend.map((month, index) => (
            <div key={index} className="text-center">
              <div className="text-sm text-gray-500 mb-2">{month.month}</div>
              <div className="bg-blue-100 rounded-lg p-3">
                <div className="text-lg font-semibold text-blue-600">{month.rating}</div>
                <StarRating rating={Math.round(month.rating)} size="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Recent Performance</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm">Average Rating</span>
                <div className="flex items-center space-x-2">
                  <StarRating rating={Math.round(ratingsStats.overallRating)} size="w-3 h-3" />
                  <span className="text-sm font-medium">{ratingsStats.overallRating}</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm">Total Feedback</span>
                <span className="text-sm font-medium">{ratingsStats.totalReviews}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Rating Distribution</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm">5-Star Reviews</span>
                <span className="text-sm text-green-600">{ratingsStats.ratingBreakdown[5]} reviews</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm">4-Star Reviews</span>
                <span className="text-sm text-blue-600">{ratingsStats.ratingBreakdown[4]} reviews</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <ErrorMessage />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Provider Feedback Dashboard</h1>
          <p className="text-gray-600">Monitor your performance and customer feedback</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('feedback')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'feedback'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Feedback View</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('ratings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ratings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Ratings Tracker</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'feedback' ? <FeedbackView /> : <RatingsTracker />}
      </div>
    </div>
  );
};

export default ProviderFeedback;
