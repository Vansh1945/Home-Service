import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Zap, 
  Send,
  MessageSquare,
  User,
  Mountain,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form submitted:', formData);
    alert('Thank you for your message! We will get back to you soon.');
    // Reset form
    setFormData({
      name: '',
      email: '',
      phone: '',
      message: ''
    });
  };

  const contactMethods = [
    {
      icon: Phone,
      title: "Call Us",
      description: "Speak directly with our electrical experts",
      details: ["+91-XXXXX-XXXXX", "+91-XXXXX-XXXXX"],
      color: "from-primary to-primary/80",
      available: "24/7 Emergency"
    },
    {
      icon: Mail,
      title: "Email Us",
      description: "Send us your queries and requirements",
      details: ["contact@electricalservice.com", "support@electricalservice.com"],
      color: "from-accent to-accent/80",
      available: "Response within 2 hours"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      description: "Our service areas across the region",
      details: ["Himachal Pradesh", "Punjab"],
      color: "from-primary/70 to-accent/70",
      available: "On-site consultations"
    }
  ];

  const serviceAreas = [
    {
      region: "Himachal Pradesh",
      cities: ["Shimla", "Dharamshala", "Manali", "Kullu", "Solan"],
      icon: Mountain,
      description: "Specialized mountain region electrical services"
    },
    {
      region: "Punjab",
      cities: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
      icon: Shield,
      description: "Comprehensive urban and rural electrical solutions"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5"></div>
        
        {/* Floating decorative elements */}
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
            className="absolute bottom-32 right-20 w-24 h-24 bg-primary/20 rounded-full blur-2xl"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center bg-primary/10 px-6 py-3 rounded-full border border-primary/20 mb-6">
              <MessageSquare className="w-5 h-5 text-primary mr-2" />
              <span className="text-primary font-medium">Contact Us</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-6">
              Get in Touch with Our 
              <span className="block text-accent">Electrical Experts</span>
            </h1>
            <p className="text-lg sm:text-xl text-secondary/80 max-w-3xl mx-auto leading-relaxed">
              Ready to solve your electrical needs? Our certified professionals across Himachal Pradesh and Punjab 
              are here to provide reliable, safe, and efficient electrical solutions for your home or business.
            </p>
          </motion.div>

          {/* Quick Contact Methods */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          >
            {contactMethods.map((method, index) => {
              const IconComponent = method.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 group cursor-pointer"
                >
                  <div className={`h-2 bg-gradient-to-r ${method.color} rounded-t-2xl -mx-6 -mt-6 mb-6`}></div>
                  <div className="text-center">
                    <div className="bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-4 mx-auto">
                      <IconComponent className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors duration-300">
                      {method.title}
                    </h3>
                    <p className="text-secondary/70 text-sm mb-4">{method.description}</p>
                    <div className="space-y-1">
                      {method.details.map((detail, idx) => (
                        <p key={idx} className="text-secondary font-medium text-sm">{detail}</p>
                      ))}
                    </div>
                    <div className="mt-4 px-3 py-1 bg-accent/10 rounded-full">
                      <span className="text-accent text-xs font-medium">{method.available}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-10 border border-gray-100 relative overflow-hidden">
                {/* Decorative gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center mb-8">
                    <div className="bg-primary/10 p-3 rounded-xl mr-4">
                      <Send className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-primary">Send us a Message</h2>
                      <p className="text-secondary/70">We'll get back to you within 2 hours</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Field */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      viewport={{ once: true }}
                    >
                      <label htmlFor="name" className="block text-sm font-semibold text-secondary mb-3 flex items-center">
                        <User className="w-4 h-4 mr-2 text-primary" />
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-secondary placeholder-gray-400 hover:border-primary/50"
                        placeholder="Enter your full name"
                      />
                    </motion.div>

                    {/* Email Field */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      viewport={{ once: true }}
                    >
                      <label htmlFor="email" className="block text-sm font-semibold text-secondary mb-3 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-primary" />
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-secondary placeholder-gray-400 hover:border-primary/50"
                        placeholder="Enter your email address"
                      />
                    </motion.div>

                    {/* Phone Field */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      viewport={{ once: true }}
                    >
                      <label htmlFor="phone" className="block text-sm font-semibold text-secondary mb-3 flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-primary" />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-secondary placeholder-gray-400 hover:border-primary/50"
                        placeholder="Enter your phone number"
                      />
                    </motion.div>

                    {/* Message Field */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      viewport={{ once: true }}
                    >
                      <label htmlFor="message" className="block text-sm font-semibold text-secondary mb-3 flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-primary" />
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows="5"
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 text-secondary placeholder-gray-400 resize-vertical hover:border-primary/50"
                        placeholder="Tell us about your electrical service needs, project details, or any questions you have..."
                      ></textarea>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center group"
                    >
                      <Send className="w-5 h-5 mr-3 group-hover:translate-x-1 transition-transform duration-300" />
                      Send Message
                      <Zap className="w-5 h-5 ml-3 group-hover:animate-pulse" />
                    </motion.button>
                  </form>

                  {/* Trust indicators */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    viewport={{ once: true }}
                    className="mt-8 flex items-center justify-center space-x-6 text-sm text-secondary/70"
                  >
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-primary mr-2" />
                      <span>Quick Response</span>
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 text-primary mr-2" />
                      <span>Secure & Private</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Contact Information & Service Areas */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {/* Contact Details Card */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent"></div>
                
                <div className="flex items-center mb-6">
                  <div className="bg-primary/10 p-3 rounded-xl mr-4">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">Contact Information</h2>
                </div>
                
                <div className="space-y-6">
                  {/* Phone */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start space-x-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors duration-300"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-secondary mb-1">Phone Numbers</h3>
                      <p className="text-primary font-medium">+91-XXXXX-XXXXX</p>
                      <p className="text-primary font-medium">+91-XXXXX-XXXXX</p>
                      <p className="text-accent text-sm font-medium mt-1">24/7 Emergency Available</p>
                    </div>
                  </motion.div>

                  {/* Email */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="flex items-start space-x-4 p-4 rounded-xl bg-accent/5 hover:bg-accent/10 transition-colors duration-300"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-secondary mb-1">Email Addresses</h3>
                      <p className="text-secondary">contact@electricalservice.com</p>
                      <p className="text-secondary">support@electricalservice.com</p>
                      <p className="text-accent text-sm font-medium mt-1">Response within 2 hours</p>
                    </div>
                  </motion.div>

                  {/* Business Hours */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    viewport={{ once: true }}
                    className="p-4 rounded-xl bg-primary/5"
                  >
                    <div className="flex items-center mb-4">
                      <Clock className="w-5 h-5 text-primary mr-2" />
                      <h3 className="text-lg font-semibold text-secondary">Business Hours</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-secondary font-medium">Monday - Saturday</span>
                        <span className="text-primary font-medium">8:00 AM - 6:00 PM</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-secondary font-medium">Sunday</span>
                        <span className="text-accent font-medium">9:00 AM - 5:00 PM</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>


              {/* Emergency Contact Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="bg-gradient-to-r from-accent to-accent/90 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center mb-4">
                    <AlertCircle className="w-8 h-8 mr-3" />
                    <h3 className="text-2xl font-bold">Emergency Services</h3>
                  </div>
                  <p className="text-white/90 mb-4 leading-relaxed">
                    Electrical emergencies don't wait for business hours. Our certified electricians are available 
                    24/7 for urgent electrical issues across Himachal Pradesh and Punjab.
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">Emergency Hotline</p>
                      <p className="text-2xl font-bold">+91-XXXXX-XXXXX</p>
                    </div>
                    <div className="bg-white/20 p-4 rounded-xl">
                      <Zap className="w-8 h-8" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 lg:py-20 bg-gradient-to-r from-primary via-primary/90 to-accent/80 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-accent rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8 leading-relaxed">
              Don't let electrical issues disrupt your daily life. Contact our expert team today for reliable, 
              professional electrical services across Himachal Pradesh and Punjab.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="bg-accent hover:bg-accent/90 text-white font-bold py-4 px-8 rounded-xl shadow-2xl hover:shadow-accent/25 transition-all duration-300 inline-flex items-center group"
              >
                <Phone className="w-5 h-5 mr-3" />
                Call Now: +91-XXXXX-XXXXX
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold py-4 px-8 border-2 border-white/30 hover:border-white/50 rounded-xl transition-all duration-300 inline-flex items-center"
              >
                <Mail className="w-5 h-5 mr-3" />
                Get Free Quote
              </motion.button>
            </div>

            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              viewport={{ once: true }}
              className="mt-8 inline-flex items-center bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
            >
              <Shield className="w-5 h-5 text-white mr-3" />
              <span className="text-white font-medium">Licensed & Insured Professionals</span>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
