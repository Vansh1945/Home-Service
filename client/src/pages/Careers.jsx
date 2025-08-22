import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaDollarSign, 
  FaClock, 
  FaGraduationCap, 
  FaMapMarkerAlt, 
  FaArrowRight,
  FaTools,
  FaHandshake,
  FaChartLine
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const CareersPage = () => {
  const benefits = [
    {
      title: "Earn Good Income",
      description: "Competitive rates with potential to earn $50-100+ per hour based on your expertise and service quality.",
      icon: <FaDollarSign className="text-2xl" />,
      color: "from-primary to-primary/80"
    },
    {
      title: "Flexible Hours",
      description: "Choose your own schedule and work when it's convenient for you. No minimum hour requirements.",
      icon: <FaClock className="text-2xl" />,
      color: "from-accent/80 to-accent"
    },
    {
      title: "Training & Support",
      description: "Access to ongoing training programs, technical support, and professional development resources.",
      icon: <FaGraduationCap className="text-2xl" />,
      color: "from-primary/70 to-accent/70"
    },
    {
      title: "Work Locally",
      description: "Get matched with customers in your area. Reduce travel time and build local relationships.",
      icon: <FaMapMarkerAlt className="text-2xl" />,
      color: "from-accent/60 to-primary/60"
    }
  ];

  const additionalBenefits = [
    {
      icon: <FaTools className="text-accent text-xl" />,
      title: "Professional Tools",
      description: "Access to discounted professional-grade tools and equipment"
    },
    {
      icon: <FaHandshake className="text-accent text-xl" />,
      title: "Steady Work",
      description: "Consistent job opportunities with verified customers"
    },
    {
      icon: <FaChartLine className="text-accent text-xl" />,
      title: "Growth Opportunities",
      description: "Build your reputation and expand your service offerings"
    }
  ];

  return (
    <div className="bg-background min-h-screen">
      {/* Main Hero Section - Two Column Layout */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary mb-6 leading-tight">
                Join Our Network of 
                <span className="block text-accent">Electrical Service Providers</span>
              </h1>
              
              <p className="text-lg text-secondary mb-8 leading-relaxed">
                Build a thriving career with our platform that connects skilled electrical professionals 
                with customers who need quality service. Enjoy <strong>steady jobs</strong>, 
                <strong> flexible scheduling</strong>, <strong>timely payments</strong>, and 
                <strong> unlimited growth opportunities</strong> in your local market.
              </p>

              <div className="space-y-4 mb-8">
                {additionalBenefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <div className="bg-accent/10 p-2 rounded-full">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">{benefit.title}</h3>
                      <p className="text-secondary text-sm">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block"
              >
                <Link 
                  to="/provider-register"
                  className="bg-accent hover:bg-accent/90 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center group"
                >
                  Apply Now 
                  <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Image/Illustration */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <div className="relative">
                {/* Placeholder for electrician image */}
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 lg:p-12 border border-primary/20">
                  <div className="bg-gradient-to-br from-primary to-accent/80 rounded-xl p-8 text-white text-center">
                    <FaTools className="text-6xl lg:text-8xl mx-auto mb-4 opacity-90" />
                    <h3 className="text-xl lg:text-2xl font-bold mb-2">Professional Electrician</h3>
                    <p className="text-white/90">Join our network of certified professionals</p>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-xl"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Key Benefits Grid Section */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-lg text-secondary max-w-3xl mx-auto">
              We provide everything you need to build a successful electrical service business
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-2xl group cursor-pointer"
              >
                <div className={`h-2 bg-gradient-to-r ${benefit.color}`}></div>
                <div className="p-6 lg:p-8">
                  <div className="bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 mx-auto text-primary">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-primary mb-4 text-center group-hover:text-accent transition-colors duration-300">
                    {benefit.title}
                  </h3>
                  <p className="text-secondary text-center leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 lg:py-20 bg-gradient-to-r from-primary to-primary/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Start Earning?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join hundreds of electrical professionals who have already transformed their careers with our platform. 
              Start your application today and begin earning within days.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  to="/provider-register"
                  className="bg-accent hover:bg-accent/90 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 inline-flex items-center group"
                >
                  Join Today 
                  <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  to="/contact"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl border-2 border-white/30 hover:border-white/50 transition-all duration-300 inline-flex items-center backdrop-blur-sm"
                >
                  Learn More
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="p-6"
            >
              <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">500+</div>
              <div className="text-secondary font-medium">Active Providers</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="p-6"
            >
              <div className="text-4xl lg:text-5xl font-bold text-accent mb-2">$75</div>
              <div className="text-secondary font-medium">Average Hourly Rate</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="p-6"
            >
              <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">98%</div>
              <div className="text-secondary font-medium">Customer Satisfaction</div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CareersPage;
