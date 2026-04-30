import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Scale } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { ApiRequestError } from '../../lib/api/client';
import { useAdminSession } from '../../providers/AdminSessionProvider';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, mustRotatePassword, signIn } = useAdminSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(mustRotatePassword ? '/change-password' : from, {
        replace: true,
        state: { from },
      });
    }
  }, [from, isAuthenticated, mustRotatePassword, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await signIn({ identifier, password, rememberMe });
      navigate(result.status === 'password_rotation_required' ? '/change-password' : from, {
        replace: true,
        state: { from },
      });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to sign in right now.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#2C2B29] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-[#E6E4DD] rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#2C2B29] rounded-lg flex items-center justify-center">
            <Scale className="w-5 h-5 text-[#C19A5B]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#8C8981] font-semibold">Global LMG</p>
            <h1
              className="text-2xl text-[#2C2B29]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Admin Sign In
            </h1>
          </div>
        </div>

        <p className="text-sm text-[#8C8981] mb-6">
          Use your Global LMG admin credentials to continue.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-[#2C2B29]">Email or phone</span>
            <input
              className="mt-2 w-full rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3 text-sm outline-none focus:border-[#C19A5B]"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="you@example.com"
              required
              type="text"
              value={identifier}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#2C2B29]">Password</span>
            <div className="relative mt-2">
              <input
                className="w-full rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3 pr-12 text-sm outline-none focus:border-[#C19A5B]"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#8C8981] transition hover:bg-[#E6E4DD] hover:text-[#2C2B29]"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="flex items-center gap-2 text-sm text-[#5A7C96]">
            <input
              checked={rememberMe}
              className="rounded border-[#E6E4DD]"
              onChange={(event) => setRememberMe(event.target.checked)}
              type="checkbox"
            />
            Keep me signed in on this device
          </label>

          {errorMessage ? (
            <div className="rounded-lg border border-[#F5C2C7] bg-[#FDE8EC] px-4 py-3 text-sm text-[#d4183d] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <button
            className="w-full rounded-lg bg-[#2C2B29] text-white py-3 text-sm font-medium hover:bg-[#4A4946] transition flex items-center justify-center gap-2 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
