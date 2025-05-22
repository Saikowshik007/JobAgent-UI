// src/components/Footer.js
import React, { useEffect, useState } from "react";

function Footer() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation
    const timeout = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <footer
      className={`transition-opacity duration-1000 ${
        isVisible ? "opacity-100" : "opacity-0"
      } bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-10 mt-auto shadow-inner`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-3">
          <h2 className="text-lg sm:text-xl font-bold tracking-wide text-white">
            Designed & Built by Sai Kowshik Ananthula
          </h2>
          <p className="text-sm text-gray-400">Software Developer @ IBM</p>

          <div className="flex flex-wrap justify-center items-center gap-4 mt-4">
            <a
              href="mailto:askowshik@outlook.com"
              className="text-sm text-blue-400 hover:scale-105 hover:text-blue-300 transition-all duration-300"
            >
              ✉️ askowshik@outlook.com
            </a>
            <a
              href="https://saikowshik007.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:scale-105 hover:text-blue-300 transition-all duration-300"
            >
              🌐 saikowshik007.github.io
            </a>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} JobAgent. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
