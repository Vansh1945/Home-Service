const axios = require('axios');

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

exports.reverseGeocode = async (lat, lng) => {
    try {
        if (!googleMapsApiKey) {
            throw new Error('Google Maps API key is missing');
        }

        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleMapsApiKey}`
        );

        console.log('Geocoding API Response:', response.data); // Add logging

        if (response.data.status !== 'OK') {
            throw new Error(`Geocoding failed: ${response.data.status} - ${response.data.error_message || 'No error message'}`);
        }

        if (!response.data.results || response.data.results.length === 0) {
            throw new Error('No address results found for these coordinates');
        }

        return response.data.results[0];
    } catch (error) {
        console.error('Geocoding error details:', {
            error: error.message,
            stack: error.stack,
            coordinates: { lat, lng }
        });
        throw error;
    }
};

exports.extractAddressComponents = (result) => {
    const addressComponents = result.address_components;
    let street = '';
    let city = '';
    let state = '';
    let postalCode = '';

    addressComponents.forEach(component => {
        if (component.types.includes('street_number') || component.types.includes('route')) {
            street += component.long_name + ' ';
        }
        if (component.types.includes('locality')) {
            city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
            state = component.long_name;
        }
        if (component.types.includes('postal_code')) {
            postalCode = component.short_name;
        }
    });

    return {
        street: street.trim(),
        city,
        state,
        postalCode,
        formattedAddress: result.formatted_address
    };
};