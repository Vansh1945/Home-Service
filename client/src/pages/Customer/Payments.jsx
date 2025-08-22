import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import axios from 'axios';
import { toast } from 'react-toastify';

const BookingConfirmation = () => {
  const { bookingId } = useParams();
  const { state } = useLocation();
  const { user, token, API } = useAuth();
  const navigate = useNavigate();

  // Debug logs
  useEffect(() => {
    console.log('Booking ID from params:', bookingId);
    console.log('Location state:', state);
  }, [bookingId, state]);

  // State with proper defaults
  const [booking, setBooking] = useState(null);
  const [service, setService] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [error, setError] = useState(null);
  const [transactionProcessing, setPaymentProcessing] = useState(false);
  const [transactionMethod, setPaymentMethod] = useState('online');

  // Fetch booking details
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setError(null);

        // First check if we have data in location state
        if (state?.booking && state?.service) {
          setBooking(state.booking);
          setService(state.service);
          setCoupon(state.coupon || null);
          return;
        }

        // If no state but we have bookingId, fetch from API
        if (bookingId && bookingId !== 'undefined') {
          const response = await axios.get(`${API}/booking/user/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to load booking');
          }

          const bookingData = response.data.data;
          setBooking({
            ...bookingData,
            subtotal: bookingData.amount + (bookingData.discount || 0),
            totalDiscount: bookingData.discount || 0,
            totalAmount: bookingData.amount
          });

          // Fetch service details
          if (bookingData.service) {
            const serviceResponse = await axios.get(
              `${API}/service/services/${bookingData.service}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (serviceResponse.data.success) {
              setService(serviceResponse.data.data);
            }
          }

          // Set coupon if available
          if (bookingData.couponCode) {
            setCoupon({ code: bookingData.couponCode });
          }
        } else {
          throw new Error('Invalid booking reference');
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load booking details');
        toast.error('Failed to load booking details');
      }
    };

    fetchBookingDetails();
  }, [bookingId, token, API, state, navigate]);

  // Handle transaction confirmation
  const handleConfirmPayment = async () => {
    if (!bookingId || bookingId === 'undefined') {
      toast.error('Invalid booking ID');
      return;
    }

    try {
      setPaymentProcessing(true);

      const response = await axios.put(
        `${API}/booking/user/bookings/${bookingId}/confirm-payment`,
        { transactionMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Payment confirmation failed');
      }

      setBooking(prev => ({
        ...prev,
        confirmedBooking: true,
        transactionMethod
      }));

      toast.success('Payment confirmed successfully!');
      navigate('/customer/bookings');
    } catch (err) {
      console.error('Error:', err);
      toast.error(err.response?.data?.message || 'Failed to confirm transaction');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Handle online payment
  const handleOnlinePayment = async () => {
    if (!bookingId || bookingId === 'undefined') {
      toast.error('Invalid booking ID');
      return;
    }

    try {
      setPaymentProcessing(true);

      // Create Razorpay order
      const orderResponse = await axios.post(
        `${API}/transaction/create-order`,
        {
          bookingId,
          amount: Math.round(booking.totalAmount * 100),
          currency: 'INR'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message || 'Failed to create transaction order');
      }

      const { order } = orderResponse.data;

      // Razorpay options
      const options = {
        key: process.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Service Booking",
        description: `Payment for ${service?.title || 'service'}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await axios.post(
              `${API}/transaction/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_transaction_id: response.razorpay_transaction_id,
                razorpay_signature: response.razorpay_signature,
                bookingId
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!verifyResponse.data.success) {
              throw new Error(verifyResponse.data.message || 'Payment verification failed');
            }

            await handleConfirmPayment();
          } catch (err) {
            console.error('Payment verification failed:', err);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: "#3399cc"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Error:', err);
      toast.error(err.response?.data?.message || 'Failed to process transaction');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-xl mb-4">{error}</div>
        <button
          onClick={() => navigate('/customer/bookings')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  // Booking not found state
  if (!booking || !booking._id) {
    return (
      <div className="text-center py-8">
        <div className="text-xl mb-4">Booking not found</div>
        <button
          onClick={() => navigate('/services')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Browse Services
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Booking Confirmation</h1>
          <p className="text-gray-600">Complete your booking by confirming payment</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Booking Summary */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600">Booking ID</p>
                <p className="font-medium">{booking._id}</p>
              </div>

              <div>
                <p className="text-gray-600">Service</p>
                <p className="font-medium">{service?.title || 'Service'}</p>
              </div>

              <div>
                <p className="text-gray-600">Date & Time</p>
                <p className="font-medium">
                  {new Date(booking.date).toLocaleDateString()} at {booking.time || 'Flexible'}
                </p>
              </div>

              <div>
                <p className="text-gray-600">Address</p>
                <p className="font-medium">
                  {booking.address?.street}, {booking.address?.city}, {booking.address?.state} - {booking.address?.postalCode}
                </p>
              </div>

              {booking.notes && (
                <div>
                  <p className="text-gray-600">Special Instructions</p>
                  <p className="font-medium">{booking.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
            <div className="border rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span className="font-medium">₹{booking.subtotal?.toFixed(2) || '0.00'}</span>
              </div>

              {coupon && (
                <div className="flex justify-between mb-2 text-green-600">
                  <span>Discount ({coupon.code}):</span>
                  <span>-₹{booking.totalDiscount?.toFixed(2) || '0.00'}</span>
                </div>
              )}

              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">₹{booking.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>

            {!booking.confirmedBooking ? (
              <>
                <h3 className="font-medium mb-3">Select Payment Method</h3>
                <div className="space-y-3 mb-6">
                  <label className="flex items-center p-3 border rounded-md hover:bg-gray-50">
                    <input
                      type="radio"
                      name="transactionMethod"
                      value="online"
                      checked={transactionMethod === 'online'}
                      onChange={() => setPaymentMethod('online')}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium">Online Payment</span>
                      <p className="text-sm text-gray-600">Pay now using UPI/Card/Wallet</p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-md hover:bg-gray-50">
                    <input
                      type="radio"
                      name="transactionMethod"
                      value="cash"
                      checked={transactionMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium">Cash on Service</span>
                      <p className="text-sm text-gray-600">Pay when the service is completed</p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={transactionMethod === 'online' ? handleOnlinePayment : handleConfirmPayment}
                  disabled={transactionProcessing}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-lg font-medium"
                >
                  {transactionProcessing ? 'Processing...' : `Confirm ${transactionMethod === 'online' ? 'and Pay' : 'Booking'}`}
                </button>
              </>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Booking Confirmed</span>
                </div>
                <p className="mt-2 text-green-600">
                  Payment method: {booking.transactionMethod === 'online' ? 'Online Payment' : 'Cash on Service'}
                </p>
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                >
                  View My Bookings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
