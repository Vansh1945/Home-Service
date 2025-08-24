import React from 'react';
import { motion } from 'framer-motion';
import { 
    FaBolt, 
    FaTools, 
    FaHome, 
    FaBuilding, 
    FaPlug, 
    FaLightbulb, 
    FaShieldAlt,
    FaStar,
    FaCheck,
    FaPhone,
    FaQuoteLeft,
    FaArrowRight,
    FaClock,
    FaAward,
    FaUsers,
    FaThumbsUp
} from 'react-icons/fa';
import ServiceImg from '../assets/ServiceImg.png';

const ServicesPage = () => {
    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    const services = [
        {
            title: "Ceiling Fan Installation",
            description: "Professional installation of ceiling fans with proper wiring and safety checks. Our certified electricians ensure optimal performance and safety.",
            icon: <FaLightbulb className="text-primary text-xl" />,
            price: "Starting at ₹1,500",
            rating: 4.9,
            features: ["Safety Certified", "1 Year Warranty", "Same Day Service"],
            image: "https://images.unsplash.com/photo-1580476262798-bddd9c4a9bb6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
        },
        {
            title: "Electrical Wiring",
            description: "Complete home or office wiring solutions following modern safety standards. We use premium materials for durable and reliable installations.",
            icon: <FaPlug className="text-primary text-xl" />,
            price: "Starting at ₹5,000",
            rating: 4.8,
            features: ["ISI Certified Wire", "10 Year Warranty", "Free Inspection"],
            image: "https://images.unsplash.com/photo-1604320660662-44c1a81e0d7a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
        },
        {
            title: "LED Lighting Solutions",
            description: "Custom lighting designs including LED installations and energy-efficient options. Transform your space with our expert lighting designs.",
            icon: <FaLightbulb className="text-primary text-xl" />,
            price: "Starting at ₹2,000",
            rating: 4.9,
            features: ["Energy Efficient", "5 Year Warranty", "Custom Design"],
            image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
        },
        {
            title: "Safety Inspections",
            description: "Comprehensive electrical safety audits for homes and businesses. Identify potential hazards before they become problems.",
            icon: <FaShieldAlt className="text-primary text-xl" />,
            price: "Starting at ₹1,000",
            rating: 5.0,
            features: ["Certified Inspector", "Detailed Report", "Safety Certificate"],
            image: "https://images.unsplash.com/photo-1603796846097-bee99e4a601f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
        },
        {
            title: "Residential Services",
            description: "Complete electrical solutions for homes, apartments, and condominiums. From rewiring to panel upgrades, we handle it all.",
            icon: <FaHome className="text-primary text-xl" />,
            price: "Starting at ₹3,000",
            rating: 4.8,
            features: ["24/7 Support", "Licensed Electricians", "Quality Materials"],
            image: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
        },
        {
            title: "Commercial Services",
            description: "Reliable electrical systems for offices, retail spaces, and industrial buildings. Minimize downtime with our efficient commercial solutions.",
            icon: <FaBuilding className="text-primary text-xl" />,
            price: "Custom Quote",
            rating: 4.9,
            features: ["Industrial Grade", "Minimal Downtime", "Bulk Pricing"],
            image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
        }
    ];

    const stats = [
        { number: "5000+", label: "Happy Customers", icon: <FaUsers /> },
        { number: "15+", label: "Years Experience", icon: <FaAward /> },
        { number: "24/7", label: "Emergency Service", icon: <FaClock /> },
        { number: "99%", label: "Satisfaction Rate", icon: <FaThumbsUp /> }
    ];

    const testimonials = [
        {
            name: "Rajesh Kumar",
            location: "Shimla, HP",
            rating: 5,
            comment: "Excellent service! They rewired my entire house professionally and on time. Highly recommended for electrical work.",
            service: "Complete House Wiring"
        },
        {
            name: "Priya Sharma",
            location: "Chandigarh, Punjab",
            rating: 5,
            comment: "Quick response for emergency repair. The electrician was knowledgeable and fixed the issue efficiently.",
            service: "Emergency Repair"
        },
        {
            name: "Amit Singh",
            location: "Dharamshala, HP",
            rating: 4,
            comment: "Professional LED installation service. Great quality work and reasonable pricing. Will use again.",
            service: "LED Installation"
        }
    ];

    const processSteps = [
        {
            step: "1",
            title: "Book Service",
            description: "Choose your service and book online or call us directly",
            icon: <FaPhone />
        },
        {
            step: "2",
            title: "Schedule Visit",
            description: "We'll schedule a convenient time for inspection and quote",
            icon: <FaClock />
        },
        {
            step: "3",
            title: "Expert Work",
            description: "Our certified electricians complete the work safely",
            icon: <FaTools />
        },
        {
            step: "4",
            title: "Quality Check",
            description: "Final inspection and testing to ensure everything works perfectly",
            icon: <FaCheck />
        }
    ];

    const handleBookNow = (service) => {
        const isLoggedIn = false; // Replace with actual auth check
        if (!isLoggedIn) {
            window.location.href = '/login';
        } else {
            console.log(`Booking ${service}`);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Enhanced Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background Image with Local Asset */}
                <div className="absolute inset-0">
                    <img 
                        src={ServiceImg} 
                        alt="Electrical Services" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-teal-800/80"></div>
                </div>

                {/* Floating Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{ 
                            y: [0, -20, 0],
                            rotate: [0, 5, 0]
                        }}
                        transition={{ 
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute top-20 left-10 w-16 h-16 bg-accent/20 rounded-full blur-xl"
                    />
                    <motion.div
                        animate={{ 
                            y: [0, 30, 0],
                            x: [0, 10, 0]
                        }}
                        transition={{ 
                            duration: 8,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute bottom-32 right-20 w-24 h-24 bg-accent/15 rounded-full blur-2xl"
                    />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* Enhanced Badge */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            className="inline-flex items-center bg-white/15 backdrop-blur-md px-8 py-4 rounded-full border border-white/30 mb-8 shadow-lg"
                        >
                            <FaBolt className="text-accent mr-3 text-lg" />
                            <span className="font-semibold text-white text-lg">Professional Electrical Services</span>
                        </motion.div>



                        {/* Enhanced Title */}
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 text-white leading-tight">
                            Expert <span className="text-accent">Electrical</span>
                            <br />
                            <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                                Solutions
                            </span>
                        </h1>

                        <p className="text-xl sm:text-2xl text-gray-200 max-w-4xl mx-auto mb-12 leading-relaxed">
                            Certified electricians providing reliable, safe, and efficient electrical services 
                            for homes and businesses across Himachal Pradesh & Punjab
                        </p>

                        {/* Enhanced CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-accent hover:bg-orange-600 text-white font-bold py-4 px-10 rounded-xl shadow-2xl hover:shadow-accent/25 transition-all duration-300 flex items-center text-lg group"
                            >
                                <FaBolt className="mr-3 group-hover:animate-pulse" />
                                Book Service Now
                                <FaArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                            
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold py-4 px-10 border-2 border-white/30 hover:border-white/50 rounded-xl transition-all duration-300 flex items-center text-lg"
                            >
                                <FaPhone className="mr-3" />
                                Get Free Quote
                            </motion.button>
                        </div>

                        {/* Trust Indicators */}
                        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                            {stats.map((stat, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + index * 0.1 }}
                                    className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center"
                                >
                                    <div className="text-accent text-2xl mb-2 flex justify-center">
                                        {stat.icon}
                                    </div>
                                    <div className="text-2xl font-bold text-white mb-1">{stat.number}</div>
                                    <div className="text-gray-200 text-sm">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Enhanced Services Grid */}
            <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-6">
                            Our <span className="text-accent">Services</span>
                        </h2>
                        <p className="text-xl text-secondary max-w-3xl mx-auto leading-relaxed">
                            Professional electrical solutions tailored to meet your specific needs with quality, 
                            reliability, and competitive pricing
                        </p>
                    </motion.div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service, index) => (
                        <motion.div
                            key={index}
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            whileHover={{ 
                                y: -15,
                                scale: 1.02,
                                transition: { duration: 0.3 }
                            }}
                            className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-2xl group relative"
                        >
                            {/* Service Image */}
                            <div className="relative h-64 overflow-hidden">
                                <img
                                    src={service.image}
                                    alt={service.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                
                                {/* Price Badge */}
                                <div className="absolute top-4 left-4 bg-accent text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                                    {service.price}
                                </div>
                                
                                {/* Rating */}
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full flex items-center shadow-lg">
                                    <FaStar className="text-yellow-400 mr-1" />
                                    <span className="font-bold text-sm">{service.rating}</span>
                                </div>
                                
                                {/* Icon */}
                                <div className="absolute bottom-4 right-4 bg-primary text-white p-4 rounded-full shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-accent">
                                    {service.icon}
                                </div>
                            </div>

                            {/* Service Content */}
                            <div className="p-8">
                                <h3 className="text-2xl font-bold text-secondary mb-4 group-hover:text-primary transition-colors duration-300">
                                    {service.title}
                                </h3>
                                <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                                
                                {/* Features */}
                                <div className="mb-6">
                                    <h4 className="font-semibold text-secondary mb-3">Key Features:</h4>
                                    <ul className="space-y-2">
                                        {service.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-center text-sm text-gray-600">
                                                <FaCheck className="text-primary mr-2 text-xs" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Book Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleBookNow(service.title)}
                                    className="w-full bg-gradient-to-r from-primary to-teal-600 hover:from-accent hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl group"
                                >
                                    <FaTools className="mr-2 group-hover:animate-pulse" />
                                    Book This Service
                                    <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-6">
                            How It <span className="text-accent">Works</span>
                        </h2>
                        <p className="text-xl text-secondary max-w-3xl mx-auto">
                            Simple steps to get your electrical work done professionally and efficiently
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {processSteps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="text-center relative"
                            >
                                {/* Step Number */}
                                <div className="relative mb-8">
                                    <div className="w-20 h-20 bg-gradient-to-r from-primary to-teal-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                        <span className="text-2xl font-bold text-white">{step.step}</span>
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white shadow-lg">
                                        {step.icon}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-secondary mb-4">{step.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{step.description}</p>

                                {/* Connector Line */}
                                {index < processSteps.length - 1 && (
                                    <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent transform -translate-y-1/2"></div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-6">
                            What Our <span className="text-accent">Customers Say</span>
                        </h2>
                        <p className="text-xl text-secondary max-w-3xl mx-auto">
                            Real feedback from satisfied customers across Himachal Pradesh and Punjab
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-lg border border-gray-100 relative"
                            >
                                <FaQuoteLeft className="text-primary text-2xl mb-4 opacity-50" />
                                
                                <div className="flex items-center mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <FaStar key={i} className="text-yellow-400 mr-1" />
                                    ))}
                                </div>

                                <p className="text-gray-700 mb-6 leading-relaxed italic">
                                    "{testimonial.comment}"
                                </p>

                                <div className="border-t border-gray-200 pt-4">
                                    <div className="font-bold text-secondary">{testimonial.name}</div>
                                    <div className="text-sm text-gray-500 mb-2">{testimonial.location}</div>
                                    <div className="text-sm text-primary font-medium">{testimonial.service}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Enhanced CTA Section */}
            <section className="py-24 bg-gradient-to-r from-primary via-teal-600 to-teal-700 text-white relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-accent rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-400 rounded-full filter blur-3xl"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold mb-8">
                            Ready to Get Started?
                        </h2>
                        <p className="text-xl text-teal-100 max-w-4xl mx-auto mb-12 leading-relaxed">
                            Join thousands of satisfied customers who trust us with their electrical needs. 
                            Get a free quote today and experience the difference of professional service.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-accent hover:bg-orange-600 text-white font-bold py-5 px-12 rounded-xl shadow-2xl hover:shadow-accent/25 transition-all duration-300 inline-flex items-center text-lg group"
                            >
                                <FaBolt className="mr-3 group-hover:animate-pulse" />
                                Get Free Quote Now
                                <FaArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                            
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold py-5 px-12 border-2 border-white/30 hover:border-white/50 rounded-xl transition-all duration-300 inline-flex items-center text-lg"
                            >
                                <FaPhone className="mr-3" />
                                Call: +91-XXXXX-XXXXX
                            </motion.button>
                        </div>

                        {/* Emergency Notice */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-12 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 inline-block"
                        >
                            <div className="flex items-center justify-center text-accent mb-2">
                                <FaClock className="mr-2" />
                                <span className="font-bold">24/7 Emergency Service Available</span>
                            </div>
                            <p className="text-teal-100 text-sm">
                                Electrical emergencies don't wait - neither do we!
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default ServicesPage;
