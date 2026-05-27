"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../hooks/useI18n";

export default function LoginPage() {
  const {
    login,
    user,
    companies,
    error,
    loading,
    clearError,
    updateCredentials,
    recoverEmail,
  } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    newEmail?: string;
    newPassword?: string;
  }>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryName, setRecoveryName] = useState("");
  const [recoveredEmail, setRecoveredEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    clearError();
  }, []);

  // If user is already logged in, redirect them
  useEffect(() => {
    if (user) {
      if (companies.length > 0) {
        router.push("/dashboard");
      } else {
        router.push("/company-setup");
      }
    }
  }, [user, companies, router]);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email) {
      errors.email = t("error.required");
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = t("error.invalid_email");
    }

    if (!password) {
      errors.password = t("error.required");
    } else if (password.length < 6) {
      errors.password = t("error.password_length");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateUpdate = () => {
    const errors: { newEmail?: string; newPassword?: string } = {};
    if (newEmail && !/\S+@\S+\.\S+/.test(newEmail)) {
      errors.newEmail = t("error.invalid_email");
    }
    if (newPassword && newPassword.length < 6) {
      errors.newPassword = t("error.password_length");
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRecovering) {
      if (!recoveryName.trim()) {
        setFieldErrors({ email: "Please enter your registered name" });
        return;
      }
      const emailFound = await recoverEmail(recoveryName);
      if (emailFound) {
        setRecoveredEmail(emailFound);
        setEmail(emailFound);
        // Show the email and allow them to login
        setTimeout(() => setIsRecovering(false), 3000);
      }
      return;
    }

    if (isUpdating) {
      if (!validateUpdate()) return;
      const success = await updateCredentials(
        email,
        newEmail || undefined,
        newPassword || undefined,
      );
      if (success) {
        setUpdateSuccess(true);
        // Login with new credentials or old if not updated
        setTimeout(async () => {
          await login(newEmail || email, newPassword || password);
        }, 1500);
      }
      return;
    }

    if (!validate()) return;

    const success = await login(email, password);
    if (success) {
      // Redirection logic is handled by the useEffect above
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden text-slate-100 font-sans">
      {/* Dynamic Background Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-900/30 blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-900/20 blur-[120px] pointer-events-none animate-pulse"></div>

      {/* Language Toggle in Header */}
      <div className="absolute top-6 right-6 z-10 flex items-center bg-slate-900/80 border border-slate-800 rounded-full p-1 shadow-2xl backdrop-blur-md">
        <button
          onClick={() => setLanguage("en")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
            language === "en"
              ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage("hi")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
            language === "hi"
              ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          हिंदी
        </button>
      </div>

      {/* Login Form Card */}
      <div className="w-full max-w-md p-8 m-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-[0_0_50px_-12px_rgba(141,198,63,0.15)] backdrop-blur-xl z-10 transition-all duration-500 hover:border-brand-500/30">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 mb-4 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="FinNBiz Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {t("brand.name")}
          </h1>
          <p className="text-sm text-brand-400 font-medium mt-2">
            {t("brand.tagline")}
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isRecovering
              ? "Find Your Account"
              : isUpdating
                ? t("auth.login.update_title")
                : t("auth.login.title")}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRecovering
              ? "Enter your registered name to find your email"
              : isUpdating
                ? t("auth.login.update_subtitle")
                : t("auth.login.subtitle")}
          </p>
        </div>

        {updateSuccess && (
          <div className="p-3 mb-6 bg-green-950/40 border border-green-800/60 text-green-300 text-xs rounded-lg flex items-center gap-2">
            <span>{t("auth.login.update_success")}</span>
          </div>
        )}

        {recoveredEmail && (
          <div className="p-3 mb-6 bg-green-950/40 border border-green-800/60 text-green-300 text-xs rounded-lg flex flex-col gap-1">
            <span className="font-semibold text-white">Account Found!</span>
            <span>
              Your Email:{" "}
              <strong className="text-brand-300 select-all">
                {recoveredEmail}
              </strong>
            </span>
          </div>
        )}

        {error && !updateSuccess && !recoveredEmail && (
          <div className="p-3 mb-6 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg flex flex-col gap-3 animate-shake">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
              <span>
                {error === "user_not_found"
                  ? t("error.user_not_found")
                  : t("error.login_failed")}
              </span>
            </div>
            
            <div className="flex gap-4 border-t border-red-800/30 pt-2 pl-7 font-semibold">
              {error === "user_not_found" ? (
                <>
                  <Link
                    href="/register"
                    className="text-red-400 hover:text-red-300 underline decoration-dotted transition-colors"
                  >
                    Create an account
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setIsRecovering(true); clearError(); }}
                    className="text-red-400 hover:text-red-300 underline decoration-dotted transition-colors text-left"
                  >
                    Forgot Email?
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsUpdating(true); clearError(); }}
                  className="text-red-400 hover:text-red-300 underline decoration-dotted transition-colors text-left"
                >
                  Forgot Password?
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRecovering ? (
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Registered Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recoveryName}
                  onChange={(e) => setRecoveryName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className={`w-full px-4 py-3 bg-black/50 border rounded-xl text-sm placeholder-slate-600 text-slate-100 outline-none transition-all duration-300 ${
                    fieldErrors.email
                      ? "border-red-500/80 focus:ring-1 focus:ring-red-500"
                      : "border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-red-400">{fieldErrors.email}</p>
              )}
            </div>
          ) : (
            <>
              {/* Email Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t("field.email")}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("field.email.placeholder")}
                    className={`w-full px-4 py-3 bg-black/50 border rounded-xl text-sm placeholder-slate-600 text-slate-100 outline-none transition-all duration-300 ${
                      fieldErrors.email
                        ? "border-red-500/80 focus:ring-1 focus:ring-red-500"
                        : "border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] text-red-400">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t("field.password")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("field.password.placeholder")}
                    className={`w-full px-4 py-3 pr-10 bg-black/50 border rounded-xl text-sm placeholder-slate-600 text-slate-100 outline-none transition-all duration-300 ${
                      fieldErrors.password
                        ? "border-red-500/80 focus:ring-1 focus:ring-red-500"
                        : "border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-red-400">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {isUpdating && (
                <>
                  <div className="space-y-1 mt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      New {t("field.email")} (Optional)
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Leave blank to keep same"
                      className={`w-full px-4 py-3 bg-black/50 border rounded-xl text-sm placeholder-slate-600 text-slate-100 outline-none transition-all duration-300 ${
                        fieldErrors.newEmail
                          ? "border-red-500/80 focus:ring-1 focus:ring-red-500"
                          : "border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                      }`}
                    />
                    {fieldErrors.newEmail && (
                      <p className="text-[11px] text-red-400">
                        {fieldErrors.newEmail}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      New {t("field.password")} (Optional)
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep same"
                      className={`w-full px-4 py-3 bg-black/50 border rounded-xl text-sm placeholder-slate-600 text-slate-100 outline-none transition-all duration-300 ${
                        fieldErrors.newPassword
                          ? "border-red-500/80 focus:ring-1 focus:ring-red-500"
                          : "border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                      }`}
                    />
                    {fieldErrors.newPassword && (
                      <p className="text-[11px] text-red-400">
                        {fieldErrors.newPassword}
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-400 text-black font-extrabold rounded-xl text-sm transition-all duration-300 shadow-[0_0_20px_-5px_rgba(141,198,63,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <React.Fragment>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Loading...</span>
              </React.Fragment>
            ) : (
              <span>
                {isRecovering
                  ? "Find Account"
                  : isUpdating
                    ? t("auth.login.update_btn")
                    : t("auth.login.btn")}
              </span>
            )}
          </button>

          {(isUpdating || isRecovering) && (
            <button
              type="button"
              onClick={() => {
                setIsUpdating(false);
                setIsRecovering(false);
                setRecoveredEmail(null);
                setRecoveryName("");
              }}
              className="w-full py-2 bg-transparent text-slate-400 hover:text-slate-200 font-semibold rounded-xl text-xs transition-all duration-300"
            >
              Back to Login
            </button>
          )}
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 font-medium">
          <span>{t("auth.login.no_account")} </span>
          <Link
            href="/register"
            className="text-brand-400 hover:text-brand-300 font-bold underline decoration-dotted transition-colors"
          >
            {t("auth.login.register_link")}
          </Link>
        </div>
      </div>
    </div>
  );
}
