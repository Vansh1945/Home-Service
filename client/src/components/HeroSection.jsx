import React from "react";
import { FaBolt, FaPhone } from "react-icons/fa";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80')`
        }}
      >
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <header className="space-y-6 md:space-y-8">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white">
            <span className="block">Power Your Home &</span>
            <span className="block text-primary">Business with Reliable</span>
            <span className="block text-accent">Electrical Services</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-200 max-w-4xl mx-auto leading-relaxed px-4">
            Expert wiring, repair, and maintenance for homes & industries in Himachal & Punjab.
          </p>

          {/* Call-to-Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mt-8 md:mt-12 px-4">
            <button 
              className="w-full sm:w-auto bg-primary hover:bg-accent text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3 text-lg"
              aria-label="Book electrical service"
            >
              <FaBolt className="text-xl" />
              Book a Service
            </button>
            
            <button 
              className="w-full sm:w-auto bg-transparent hover:bg-secondary/80 text-white font-bold py-4 px-8 border-2 border-secondary hover:border-accent rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3 text-lg"
              aria-label="Contact us for electrical services"
            >
              <FaPhone className="text-xl" />
              Contact Us
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 md:mt-16">
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <FaBolt className="text-accent text-sm" />
                <span className="text-sm md:text-base font-medium">24/7 Emergency Service</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <FaBolt className="text-accent text-sm" />
                <span className="text-sm md:text-base font-medium">Certified Electricians</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <FaBolt className="text-accent text-sm" />
                <span className="text-sm md:text-base font-medium">Licensed & Insured</span>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
