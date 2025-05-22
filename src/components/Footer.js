import React, { useEffect, useState } from "react";

function Footer() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <footer
      className={`transition-opacity duration-1000 ${
        isVisible ? "opacity-100" : "opacity-0"
      } bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-4 mt-auto shadow-inner`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-1 text-sm">
          <p className="text-gray-300 font-medium">
            Designed by <span className="text-white font-semibold">Sai Kowshik Ananthula</span>
          </p>
          <p className="text-gray-400">Software Dev @ <span className="text-blue-400 font-medium">IBM</span></p>

          <div className="flex flex-wrap justify-center items-center gap-3 mt-1 text-sm">
            <a
              href="mailto:askowshik@outlook.com"
              className="text-blue-400 hover:text-blue-300 transition-all duration-200"
            >
              ✉️ askowshik@outlook.com
            </a>
            <a
              href="https://saikowshik007.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-all duration-200"
            >
              🌐 saikowshik007.github.io
            </a>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-700 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} JobAgent. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
