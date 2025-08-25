import { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { toast } from 'react-toastify';

const UserProfile = () => {
    const { user, token, API, logoutUser } = useAuth();
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            postalCode: ''
        },
        profilePicUrl: '',
        firstBookingUsed: false,
        totalBookings: 0,
        totalSpent: 0,
        customDiscount: 0
    });
    const [isEditing, setIsEditing] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API}/customer/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch profile');

            const data = await response.json();
            setProfile({
                ...data.user,
                address: data.user.address || {
                    street: '',
                    city: '',
                    state: '',
                    postalCode: ''
                }
            });
        } catch (error) {
            console.error('Profile fetch error:', error);
            toast.error(error.message);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            address: { ...prev.address, [name]: value }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API}/customer/profile-update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: profile.name,
                    phone: profile.phone,
                    address: profile.address
                })
            });

            if (!response.ok) throw new Error('Failed to update profile');

            const data = await response.json();
            toast.success('Profile updated successfully!');
            setIsEditing(false);
            setProfile(prev => ({
                ...prev,
                ...data.user,
                address: data.user.address || prev.address
            }));
        } catch (error) {
            console.error('Profile update error:', error);
            toast.error(error.message);
        }
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleImageUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.warning('Please select a file first');
            return;
        }

        const formData = new FormData();
        formData.append('profilePic', selectedFile);

        try {
            const response = await fetch(`${API}/customer/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to upload image');
            }

            toast.success('Profile picture updated!');
            setProfile(prev => ({
                ...prev,
                profilePicUrl: data.profilePicUrl
            }));
            setSelectedFile(null);
        } catch (error) {
            console.error('Image upload error:', error);
            toast.error(error.message);
        }
    };

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-transparent">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-secondary">My Profile</h1>
                    <p className="mt-2 text-gray-600">Manage your account information and preferences</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Profile Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md overflow-hidden">
                            <div className="bg-primary px-6 py-4 text-center">
                                <h2 className="text-xl font-semibold text-white">Profile Overview</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-4">
                                        <img
                                            src={profile.profilePicUrl || 'https://via.placeholder.com/150'}
                                            alt="Profile"
                                            className="w-32 h-32 rounded-full border-4 border-primary/30 object-cover"
                                        />
                                        {isEditing && (
                                            <div className="absolute bottom-0 right-0 bg-accent rounded-full p-2 cursor-pointer">
                                                <label htmlFor="profile-pic-upload" className="cursor-pointer">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                                    </svg>
                                                    <input
                                                        id="profile-pic-upload"
                                                        type="file"
                                                        onChange={handleFileChange}
                                                        accept="image/*"
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-secondary">{profile.name}</h3>
                                    <p className="text-primary">{profile.email}</p>
                                    <p className="text-gray-600 mt-1">{profile.phone}</p>

                                    {isEditing && selectedFile && (
                                        <button
                                            onClick={handleImageUpload}
                                            className="mt-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-accent hover:bg-accent/90"
                                        >
                                            Save Photo
                                        </button>
                                    )}
                                </div>

                                <div className="mt-6 border-t border-gray-200 pt-4">
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">ACCOUNT STATUS</h4>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600">First Booking Used:</span>
                                        <span className={`text-sm font-medium ${profile.firstBookingUsed ? 'text-green-600' : 'text-yellow-500'}`}>
                                            {profile.firstBookingUsed ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600">Total Bookings:</span>
                                        <span className="text-sm font-medium text-primary">{profile.totalBookings}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600">Total Spent:</span>
                                        <span className="text-sm font-medium text-primary">${profile.totalSpent.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Custom Discount:</span>
                                        <span className="text-sm font-medium text-yellow-500">{profile.customDiscount}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Profile Details */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md overflow-hidden">
                            <div className="bg-primary px-6 py-4 flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-white">Personal Information</h2>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium ${isEditing ? 'bg-white text-primary' : 'bg-accent text-white hover:bg-accent/90'}`}
                                >
                                    {isEditing ? 'Cancel' : 'Edit Profile'}
                                </button>
                            </div>

                            <div className="p-6">
                                {isEditing ? (
                                    <form onSubmit={handleSubmit}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={profile.name}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={profile.email}
                                                    readOnly
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-secondary mb-1">Phone</label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={profile.phone}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                                    required
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <h3 className="text-lg font-medium text-secondary mb-3">Address Information</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-secondary mb-1">Street</label>
                                                        <input
                                                            type="text"
                                                            name="street"
                                                            value={profile.address.street}
                                                            onChange={handleAddressChange}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-secondary mb-1">City</label>
                                                        <input
                                                            type="text"
                                                            name="city"
                                                            value={profile.address.city}
                                                            onChange={handleAddressChange}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-secondary mb-1">State</label>
                                                        <input
                                                            type="text"
                                                            name="state"
                                                            value={profile.address.state}
                                                            onChange={handleAddressChange}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-secondary mb-1">Postal Code</label>
                                                        <input
                                                            type="text"
                                                            name="postalCode"
                                                            value={profile.address.postalCode}
                                                            onChange={handleAddressChange}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex justify-end space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(false)}
                                                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-secondary bg-white hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                                                <p className="mt-1 text-sm text-secondary">{profile.name}</p>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                                                <p className="mt-1 text-sm text-secondary">{profile.email}</p>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                                                <p className="mt-1 text-sm text-secondary">{profile.phone || 'Not provided'}</p>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-200">
                                            <h3 className="text-lg font-medium text-secondary mb-4">Address Information</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-500">Street</h3>
                                                    <p className="mt-1 text-sm text-secondary">{profile.address.street || 'Not provided'}</p>
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-500">City</h3>
                                                    <p className="mt-1 text-sm text-secondary">{profile.address.city || 'Not provided'}</p>
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-500">State</h3>
                                                    <p className="mt-1 text-sm text-secondary">{profile.address.state || 'Not provided'}</p>
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-500">Postal Code</h3>
                                                    <p className="mt-1 text-sm text-secondary">{profile.address.postalCode || 'Not provided'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-200 flex justify-end">
                                            <button
                                                onClick={logoutUser}
                                                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent/90"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;