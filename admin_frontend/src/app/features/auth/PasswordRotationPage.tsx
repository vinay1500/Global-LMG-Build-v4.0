import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, KeyRound, Scale } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiRequestError } from '../../lib/api/client';
import { useAdminSession } from '../../providers/AdminSessionProvider';
import { SessionBootstrapPage } from './SessionBootstrapPage';

export const PasswordRotationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    changePassword,
    isAuthenticated,
    isReady,
    mustRotatePassword,
  } = useAdminSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  useEffect(() => {
    if (isReady && isAuthenticated && !mustRotatePassword) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, isReady, mustRotatePassword, navigate]);

  if (!isReady) {
    return <SessionBootstrapPage />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from }} to="/login" />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation must match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({ currentPassword, newPassword });
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to update password right now.');
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
              Change Password
            </h1>
          </div>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3 text-sm text-[#5A7C96]">
          <KeyRound className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C19A5B]" />
          <p>Your temporary admin password must be replaced before you can use the console.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-[#2C2B29]">Current password</span>
            <input
              className="mt-2 w-full rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3 text-sm outline-none focus:border-[#C19A5B]"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#2C2B29]">New password</span>
            <input
              className="mt-2 w-full rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3 text-sm outline-none focus:border-[#C19A5B]"
              minLength={12}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              type="password"
              value={newPassword}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#2C2B29]">Confirm new password</span>
            <input
              className="mt-2 w-full rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3 text-sm outline-none focus:border-[#C19A5B]"
              minLength={12}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
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
            {isSubmitting ? 'Updating...' : 'Update Password'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
