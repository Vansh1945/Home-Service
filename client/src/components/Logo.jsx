import React from 'react';
import { FaBolt } from 'react-icons/fa';

const Logo = ({ size = 'text-2xl', withIcon = true, isDark = false }) => {
  return (
    <div className={`flex items-center ${withIcon ? 'space-x-2' : ''}`}>
      {withIcon && (
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary shadow-lg">
          <FaBolt className="h-5 w-5 text-accent" />
        </div>
      )}
      <span className={`font-bold ${size} ${isDark ? 'text-white' : 'text-secondary'}`}>
        SAFEVOLT <span className="text-accent">SOLUTIONS</span>
      </span>
    </div>
  );
};

export default Logo;
