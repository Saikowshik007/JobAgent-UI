// src/components/Footer.js
import React from "react";

function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-2">
          <p className="text-sm text-gray-300">
            Designed and Developed by{" "}
            <span className="font-semibold text-white">Sai Kowshik Ananthula</span>
          </p>
          <p className="text-sm text-gray-300">
            Software Dev @ <span className="font-semibold text-blue-400">IBM</span>
          </p>
          <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-300">Contact:</p>
              <a
                href="mailto:askowshik@outlook.com"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                askowshik@outlook.com
              </a>
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-300">Portfolio:</p>
              <a
                href="https://saikowshik007.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                saikowshik007.github.io
              </a>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} JobAgent. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;