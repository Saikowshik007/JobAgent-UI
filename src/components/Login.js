// Enhanced Login.js with beautiful animations and modern UI
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Footer from "./Footer";
import {
  Mail, Lock, Eye, EyeOff, Loader2, CheckCircle,
  AlertCircle, ArrowRight, Briefcase, Sparkles,
  Users, Target, TrendingUp
} from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await login(email, password);
      setShowSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error) {
      setError("Failed to log in: " + error.message);
    }

    setLoading(false);
  }

  const features = [
    {
      icon: Target,
      title: "Smart Job Tracking",
      description: "Organize and track all your job applications in one place"
    },
    {
      icon: Sparkles,
      title: "AI-Powered Resumes",
      description: "Generate tailored resumes for each job application"
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Track your application success rate and optimize your strategy"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left Side - Branding & Features */}
          <div className="hidden lg:block space-y-8 animate-slide-in-left">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-xl">
                  <Briefcase className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  JobAgent
                </h1>
              </div>
              <p className="text-xl text-gray-600 mb-8">
                Your AI-powered job application companion
              </p>

              {/* Success Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="text-2xl font-bold text-indigo-600">50K+</div>
                  <div className="text-sm text-gray-600">Applications Tracked</div>
                </div>
                <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="text-2xl font-bold text-purple-600">95%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="text-2xl font-bold text-pink-600">10K+</div>
                  <div className="text-sm text-gray-600">Users</div>
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/40 transition-all duration-300 transform hover:scale-105"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-slide-in-right">
            <div className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl p-8 border border-white/20">
              <div className="text-center mb-8">
                <div className="lg:hidden flex items-center justify-center space-x-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    JobAgent
                  </h2>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
                <p className="text-gray-600">Sign in to continue your job search journey</p>
              </div>

              {/* Success Message */}
              {showSuccess && (
                <div className="mb-6 animate-slide-down">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 animate-bounce" />
                    <div>
                      <p className="text-green-800 font-medium">Login Successful!</p>
                      <p className="text-green-600 text-sm">Redirecting to dashboard...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 animate-slide-down">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-red-800 font-medium">Login Failed</p>
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className={`h-5 w-5 transition-colors duration-200 ${
                        focusedField === 'email' ? 'text-indigo-500' : 'text-gray-400'
                      }`} />
                    </div>
                    <input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className={`
                        appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                        placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500
                        focus:border-indigo-500 transition-all duration-200 transform
                        ${focusedField === 'email' ? 'scale-105 shadow-lg' : 'hover:shadow-md'}
                      `}
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className={`h-5 w-5 transition-colors duration-200 ${
                        focusedField === 'password' ? 'text-indigo-500' : 'text-gray-400'
                      }`} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className={`
                        appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl
                        placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500
                        focus:border-indigo-500 transition-all duration-200 transform
                        ${focusedField === 'password' ? 'scale-105 shadow-lg' : 'hover:shadow-md'}
                      `}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`
                      group relative w-full flex justify-center items-center space-x-2 py-3 px-4
                      border border-transparent text-sm font-medium rounded-xl text-white
                      bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl
                      ${loading ? 'animate-pulse' : ''}
                    `}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </button>
                </div>

                {/* Forgot Password Link */}
                <div className="text-center">
                  <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors duration-200">
                    Forgot your password?
                  </a>
                </div>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <a
                      href="/register"
                      className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-200 hover:underline"
                    >
                      Create one now
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Demo Credentials</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Email:</strong> demo@jobagent.com</p>
                <p><strong>Password:</strong> demo123</p>
                <p className="text-red-600"><strong>Error Test:</strong> error@test.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-white/80 backdrop-blur-sm border-t border-white/20 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>&copy; 2024 JobAgent. All rights reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.8s ease-out;
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.8s ease-out;
        }

        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }

        .bg-grid-pattern {
          background-image: radial-gradient(circle, #000 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}

export default Login;