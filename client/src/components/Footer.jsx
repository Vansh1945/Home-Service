import React from 'react';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-secondary text-white pt-12 pb-6 sm:pt-16 sm:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-1">
            <div className="flex items-center">
              <Logo withIcon={true} size="text-xl sm:text-2xl" isDark={true} />
            </div>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              Providing reliable electrical solutions with certified expertise and cutting-edge technology for homes and businesses.
            </p>
            <div className="flex space-x-3 sm:space-x-4">
              {[
                { Icon: FaFacebook, href: "#", label: "Facebook" },
                { Icon: FaTwitter, href: "#", label: "Twitter" },
                { Icon: FaInstagram, href: "#", label: "Instagram" },
                { Icon: FaLinkedin, href: "#", label: "LinkedIn" }
              ].map(({ Icon, href, label }, index) => (
                <a
                  key={index}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-primary hover:bg-accent rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
                >
                  <Icon className="text-white text-base sm:text-lg" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-accent mb-4 sm:mb-6">Quick Links</h3>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { name: 'Home', href: '/' },
                { name: 'Services', href: '/services' },
                { name: 'About Us', href: '/about' },
                { name: 'Careers', href: '/careers' }
              ].map((item, index) => (
                <li key={index}>
                  <a 
                    href={item.href} 
                    className="text-gray-300 hover:text-accent transition-colors duration-300 flex items-center group text-sm sm:text-base"
                  >
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full mr-2 sm:mr-3 opacity-70 group-hover:opacity-100 transition-opacity duration-300"></span>
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-accent mb-4 sm:mb-6">Our Services</h3>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { name: 'Electrical Wiring', href: '/services/wiring' },
                { name: 'Lighting Solutions', href: '/services/lighting' },
                { name: 'Safety Inspections', href: '/services/inspections' },
                { name: 'Emergency Repairs', href: '/services/emergency' }
              ].map((item, index) => (
                <li key={index}>
                  <a 
                    href={item.href} 
                    className="text-gray-300 hover:text-accent transition-colors duration-300 flex items-center group text-sm sm:text-base"
                  >
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full mr-2 sm:mr-3 opacity-70 group-hover:opacity-100 transition-opacity duration-300"></span>
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-accent mb-4 sm:mb-6">Contact Us</h3>
            <ul className="space-y-3 sm:space-y-4 text-gray-300">
              <li className="flex items-start group">
                <FaMapMarkerAlt className="text-accent mt-1 mr-2 sm:mr-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-sm sm:text-base leading-relaxed">123 Electric Ave, Power City, PC 12345</span>
              </li>
              <li className="flex items-center group">
                <FaPhone className="text-accent mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300" />
                <a href="tel:+15551234567" className="text-sm sm:text-base hover:text-accent transition-colors duration-300">
                  +1 (555) 123-4567
                </a>
              </li>
              <li className="flex items-center group">
                <FaEnvelope className="text-accent mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300" />
                <a href="mailto:contact@safevoltsolutions.com" className="text-sm sm:text-base hover:text-accent transition-colors duration-300 break-all">
                  contact@safevoltsolutions.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-secondary/30 my-8 sm:my-12" />

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-gray-400 text-xs sm:text-sm space-y-4 sm:space-y-0">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} SafeVolt Solutions. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center sm:justify-end space-x-4 sm:space-x-6">
            <a href="/privacy" className="hover:text-accent transition-colors duration-300">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-accent transition-colors duration-300">
              Terms of Service
            </a>
            <a href="/sitemap" className="hover:text-accent transition-colors duration-300">
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
