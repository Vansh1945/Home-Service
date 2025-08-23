import React, { useState, useEffect } from 'react';
import { 
  FaUserPlus, 
  FaSignInAlt, 
  FaTimes, 
  FaBars,
  FaHome,
  FaInfoCircle,
  FaCogs,
  FaBriefcase,
  FaEnvelope
} from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Navigation links data with icons
  const navLinks = [
    { text: "Home", path: "/", icon: <FaHome className="mr-2" /> },
    { text: "About", path: "/about", icon: <FaInfoCircle className="mr-2" /> },
    { text: "Services", path: "/services", icon: <FaCogs className="mr-2" /> },
    { text: "Careers", path: "/careers", icon: <FaBriefcase className="mr-2" /> },
    { text: "Contact", path: "/contact", icon: <FaEnvelope className="mr-2" /> }
  ];

  return (
    <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-gray-100' 
        : 'bg-background shadow-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 lg:h-18 items-center">
          {/* Left side - Logo & Desktop Nav */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="transition-transform duration-200 hover:scale-105">
                <Logo size="text-xl lg:text-2xl" />
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:block ml-8 xl:ml-12">
              <div className="flex space-x-1">
                {navLinks.map((link) => (
                  <NavItem 
                    key={link.text} 
                    {...link} 
                    isActive={location.pathname === link.path}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Auth Buttons (Desktop) */}
          <div className="hidden lg:flex items-center space-x-3">
            <ActionButton 
              icon={<FaUserPlus className="mr-2 text-sm" />} 
              text="Register" 
              variant="secondary"
              path="/register"
            />
            <ActionButton 
              icon={<FaSignInAlt className="mr-2 text-sm" />} 
              text="Become Provider" 
              variant="primary"
              path="/register-provider"
            />
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              aria-label="Toggle menu"
            >
              {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden transition-all duration-300 ease-in-out ${
        isOpen 
          ? 'max-h-screen opacity-100 visible' 
          : 'max-h-0 opacity-0 invisible'
      } bg-background border-t border-gray-100 shadow-lg`}>
        <div className="px-4 py-6 space-y-4">
          {/* Mobile Navigation Links */}
          <div className="space-y-2">
            {navLinks.map((link) => (
              <MobileNavItem 
                key={link.text} 
                {...link} 
                isActive={location.pathname === link.path}
                onClick={() => setIsOpen(false)} 
              />
            ))}
          </div>
          
          {/* Mobile Action Buttons */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <ActionButton 
              icon={<FaUserPlus className="mr-2 text-sm" />} 
              text="Register" 
              variant="secondary"
              fullWidth
              path="/register"
              onClick={() => setIsOpen(false)}
            />
            <ActionButton 
              icon={<FaSignInAlt className="mr-2 text-sm" />} 
              text="Become Provider" 
              variant="primary"
              fullWidth
              path="/provider-register"
              onClick={() => setIsOpen(false)}
            />
          </div>
        </div>
      </div>
    </nav>
    
  );
};

// Reusable Components
const NavItem = ({ text, path, icon, isActive }) => (
  <Link
    to={path}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center group ${
      isActive 
        ? 'text-primary bg-primary/10' 
        : 'text-secondary hover:text-primary hover:bg-gray-50'
    }`}
  >
    <span className={`transition-colors duration-200 ${
      isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
    }`}>
      {icon}
    </span>
    {text}
  </Link>
);

const MobileNavItem = ({ text, path, icon, isActive, onClick }) => (
  <Link
    to={path}
    onClick={onClick}
    className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
      isActive 
        ? 'text-primary bg-primary/10 border-l-4 border-primary' 
        : 'text-secondary hover:text-primary hover:bg-gray-50'
    }`}
  >
    <span className={`transition-colors duration-200 ${
      isActive ? 'text-primary' : 'text-gray-400'
    }`}>
      {icon}
    </span>
    {text}
  </Link>
);

const ActionButton = ({ icon, text, variant = 'primary', fullWidth = false, path, onClick }) => {
  const baseClasses = "px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-accent text-white hover:bg-accent/90 focus:ring-accent/50 shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
    secondary: "bg-gray-100 text-secondary hover:bg-gray-200 focus:ring-gray-300 border border-gray-200"
  };

  return (
    <Link
      to={path}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {icon}
      {text}
    </Link>

  );
};

export default Navbar;
