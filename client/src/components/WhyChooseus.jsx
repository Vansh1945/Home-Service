import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  DollarSign, 
  Shield,
  Star,
  Users,
  TrendingUp,
  CheckCircle2,
  Heart,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

const WhyChooseUs = () => {
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [hoveredCard, setHoveredCard] = useState(null);
  const [countUp, setCountUp] = useState({ 
    projects: 0, 
    satisfaction: 0,
    service: 0,
    experience: 0
  });
  const sectionRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Feature cards data (only 3 cards)
  const features = [
    {
      icon: Award,
      title: "Certified Experts",
      description: "All our electricians are licensed, background-checked, and trained to the highest industry standards.",
      gradient: "from-primary to-primary/80",
      glowColor: "shadow-primary/30"
    },
    {
      icon: DollarSign,
      title: "Affordable Pricing",
      description: "No hidden charges. We offer competitive rates with transparent pricing for all services.",
      gradient: "from-accent to-accent/80",
      glowColor: "shadow-accent/30"
    },
    {
      icon: Shield,
      title: "Safety First",
      description: "We follow strict safety protocols to ensure risk-free electrical installations and repairs.",
      gradient: "from-primary/80 to-primary",
      glowColor: "shadow-primary/30"
    }
  ];

  // Stats data (4 stats)
  const stats = [
    { key: 'projects', target: 500, suffix: '+', label: 'Projects Completed', icon: CheckCircle2 },
    { key: 'satisfaction', target: 99, suffix: '%', label: 'Customer Satisfaction', icon: Heart },
    { key: 'service', target: 24, suffix: '/7', label: 'Emergency Service', icon: Clock },
    { key: 'experience', target: 20, suffix: '+', label: 'Years Experience', icon: Award }
  ];

  // Intersection Observer for card animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardIndex = parseInt(entry.target.dataset.index);
            setTimeout(() => {
              setVisibleCards(prev => new Set([...prev, cardIndex]));
            }, cardIndex * 150);
          }
        });
      },
      { threshold: 0.2 }
    );

    const cards = sectionRef.current?.querySelectorAll('[data-index]');
    cards?.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  // Counter animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            
            stats.forEach((stat) => {
              let current = 0;
              const increment = stat.target / 100;
              const timer = setInterval(() => {
                current += increment;
                if (current >= stat.target) {
                  current = stat.target;
                  clearInterval(timer);
                }
                setCountUp(prev => ({
                  ...prev,
                  [stat.key]: Math.floor(current)
                }));
              }, 40);
            });
          }
        });
      },
      { threshold: 0.8 }
    );

    const statsSection = document.querySelector('[data-stats]');
    if (statsSection) observer.observe(statsSection);

    return () => observer.disconnect();
  }, [hasAnimated, stats]);

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/20 rounded-full blur-xl"></div>
      </div>

      <div ref={sectionRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <div className="inline-flex items-center bg-background px-4 sm:px-6 py-3 rounded-full shadow-sm border border-primary/20 mb-6">
            <Star className="w-5 h-5 text-accent mr-2" />
            <span className="text-primary font-medium">Why Choose Us</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-secondary mb-4 px-4">
            Why Choose <span className="text-accent">Raj Electrical?</span>
          </h2>
          <p className="text-lg sm:text-xl text-secondary/80 max-w-3xl mx-auto px-4">
            We provide top-tier electrical services with unmatched reliability, safety, and customer care.
          </p>
        </motion.div>

        {/* Feature Cards Grid - 3 equal size cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            const isVisible = visibleCards.has(index);
            const isHovered = hoveredCard === index;
            
            return (
              <motion.div
                key={index}
                data-index={index}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                initial={{ opacity: 0, y: 30 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className={`group relative ${isHovered ? 'z-10' : ''}`}
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`}></div>
                
                {/* Card with fixed height */}
                <div className={`h-full p-1 bg-gradient-to-r ${feature.gradient} rounded-2xl shadow-lg ${isHovered ? feature.glowColor + ' shadow-xl' : ''} transition-all duration-300`}>
                  <div className="bg-white rounded-xl p-8 h-full flex flex-col items-center text-center relative overflow-hidden">
                    {/* Icon */}
                    <div className={`p-4 rounded-full bg-gradient-to-r ${feature.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-bold text-secondary mb-2">{feature.title}</h3>
                    <p className="text-secondary/70 flex-grow leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats Section - 4 stats */}
        <motion.div
          data-stats
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-12 sm:mt-16 mx-4 bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 sm:p-8 text-white shadow-xl"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-center">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              const currentValue = stat.key === 'service' ? 24 : countUp[stat.key] || 0;
              
              return (
                <motion.div 
                  key={index}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:rotate-6 transition-transform duration-300">
                    <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-background" />
                  </div>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-accent mb-1 sm:mb-2">
                    {currentValue}{stat.suffix}
                  </p>
                  <p className="text-primary/20 text-xs sm:text-sm font-medium">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Call to Action */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="inline-flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
            >
              <Users className="mr-2 w-5 h-5" /> Choose Excellence Today
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="border-2 border-yellow-400 text-yellow-500 hover:bg-yellow-400 hover:text-white font-bold py-4 px-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center"
            >
              <TrendingUp className="mr-2 w-5 h-5" /> Free Consultation
            </motion.button>
          </div>
        </motion.div> */}
      </div>
    </section>
  );
};

export default WhyChooseUs;