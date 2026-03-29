import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Shield, Eye, EyeOff } from "lucide-react";
import { authApi, UserRole } from "../api";
import { tokenStorage } from "../api";

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: UserRole.RECIPIENT,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!isLogin) {
        await authApi.register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          email: formData.email,
          password: formData.password,
        });
      }

      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
      });

      tokenStorage.setAccessToken(response.accessToken);
      tokenStorage.setRefreshToken(response.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.user));
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md transition-colors duration-250 dark:bg-slate-800">
        <div className="mb-6 flex justify-center">
          <Shield className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>

        <h1 className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-white">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h1>

        {error && (
          <p className="mb-4 text-center text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 pr-10 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as UserRole,
                  })
                }
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              >
                <option value={UserRole.RECIPIENT}>Certificate Holder</option>
                <option value={UserRole.ISSUER}>Certificate Issuer</option>
                <option value={UserRole.VERIFIER}>Certificate Verifier</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
            ) : isLogin ? (
              <>
                <LogIn className="h-4 w-4" />
                Sign In
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Create Account
              </>
            )}
          </button>
        </form>

        {isLogin && (
          <div className="mt-4 text-center">
            {!showForgot ? (
              <button
                onClick={() => setShowForgot(true)}
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                Forgot your password?
              </button>
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-sm text-gray-600">
                  Enter your account email to receive password reset
                  instructions.
                </p>
                {forgotSuccess ? (
                  <div className="text-sm text-green-600">{forgotSuccess}</div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 rounded-md border px-3 py-2"
                    />
                    <button
                      onClick={async () => {
                        setForgotLoading(true);
                        setError(null);
                        try {
                          await authApi.forgotPassword({ email: forgotEmail });
                          setForgotSuccess(
                            "If the email exists, a reset link has been sent.",
                          );
                        } catch (err: unknown) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Failed to request password reset",
                          );
                        } finally {
                          setForgotLoading(false);
                        }
                      }}
                      disabled={forgotLoading}
                      className="rounded-md bg-blue-600 px-3 py-2 text-white"
                    >
                      {forgotLoading ? "Sending..." : "Send"}
                    </button>
                  </div>
                )}
                <div className="mt-2">
                  <button
                    onClick={() => setShowForgot(false)}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin((value) => !value)}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
