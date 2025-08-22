import React from 'react';
import HeroSection from '../components/HeroSection';
import WhyChooseUs from '../components/WhyChooseus';
import { motion } from 'framer-motion';

const Home = () => {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <HeroSection />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* Smooth Transition Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="relative py-16 bg-gradient-to-b from-white to-gray-50"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
      </motion.div>
    </div>
  );
};

export default Home;
