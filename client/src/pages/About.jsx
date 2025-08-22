import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  MapPin, 
  Award, 
  Shield, 
  Phone,
  Mountain,
  Home as HomeIcon
} from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* About Section */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center bg-primary/10 px-6 py-3 rounded-full border border-primary/20 mb-6">
              <Zap className="w-5 h-5 text-primary mr-2" />
              <span className="text-primary font-medium">About Us</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-6">
              Your Trusted Electrical Partner
            </h1>
            <p className="text-lg sm:text-xl text-secondary/80 max-w-3xl mx-auto">
              Bringing reliable electrical solutions to homes and businesses across the beautiful regions of Himachal Pradesh and Punjab
            </p>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Content Section */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Business Introduction */}
              <div className="space-y-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-primary">
                  Dedicated Electrical Excellence
                </h2>
                <p className="text-secondary leading-relaxed">
                  As a single-owner electrical service business, I take personal pride in every project I undertake. 
                  Based in the scenic landscapes of Himachal Pradesh and serving the vibrant communities of Punjab, 
                  I bring years of expertise and a commitment to quality that reflects the strong work ethic and 
                  reliability that our mountain and plains communities are known for.
                </p>
              </div>

              {/* Services Description */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-primary flex items-center">
                  <HomeIcon className="w-5 h-5 mr-2" />
                  Comprehensive Electrical Services
                </h3>
                <p className="text-secondary leading-relaxed">
                  From complete house wiring that ensures your family's safety to professional electrical repairs 
                  and modern installations, I provide personalized service with attention to detail. Whether it's 
                  a traditional home in the hills of Himachal or a modern residence in Punjab's bustling cities, 
                  every project receives my full dedication to quality and customer satisfaction.
                </p>
              </div>

              {/* Key Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {[
                  {
                    icon: Award,
                    title: "Licensed & Certified",
                    description: "Fully qualified with years of experience"
                  },
                  {
                    icon: Shield,
                    title: "Safety First",
                    description: "Prioritizing your family's safety always"
                  },
                  {
                    icon: MapPin,
                    title: "Local Expertise",
                    description: "Understanding regional electrical needs"
                  },
                  {
                    icon: Mountain,
                    title: "Traditional Values",
                    description: "Honest work with modern solutions"
                  }
                ].map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                      className="flex items-start space-x-3 p-4 rounded-lg bg-primary/5 border border-primary/10"
                    >
                      <div className="p-2 rounded-lg bg-primary text-background">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary text-sm">{feature.title}</h4>
                        <p className="text-secondary/70 text-sm">{feature.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Contact Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="pt-6"
              >
                <Link
                  to="/contact"
                  className="inline-flex items-center bg-accent hover:bg-accent/90 text-background font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Contact Us
                </Link>
              </motion.div>
            </motion.div>

            {/* Image Section */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                {/* Main Image */}
                <img
                  src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Professional electrical work in Himachal Pradesh and Punjab"
                  className="w-full h-[500px] sm:h-[600px] object-cover"
                />
                
                {/* Overlay with gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
                
                {/* Bottom overlay content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-background">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">Himachal Pradesh & Punjab</span>
                  </div>
                  <p className="text-background/90 text-sm">
                    Professional electrical services rooted in tradition, powered by expertise
                  </p>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
            </motion.div>
          </div>

          {/* Additional Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1 }}
            className="mt-16 sm:mt-20 text-center"
          >
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-8 sm:p-12 border border-primary/10">
              <h3 className="text-2xl sm:text-3xl font-bold text-primary mb-4">
                Why Choose Our Services?
              </h3>
              <p className="text-secondary/80 max-w-4xl mx-auto leading-relaxed">
                With deep roots in the communities I serve, I understand the unique electrical needs of homes in our region. 
                From the challenging mountain terrain of Himachal Pradesh to the diverse residential and commercial spaces 
                in Punjab, I bring personalized attention and quality workmanship that larger companies simply cannot match. 
                Your satisfaction and safety are my top priorities, backed by years of experience and a commitment to excellence 
                that honors the trusted traditions of our communities.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
