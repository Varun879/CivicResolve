import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { fetchProfile, updateProfile, requestEmailOtp, verifyEmailOtp } from '../api/users';
import { apiClient } from '../api/client';

interface ProfileModalProps {
  show: boolean;
  onClose: () => void;
}

export default function ProfileModal({ show, onClose }: ProfileModalProps) {
  const [profileView, setProfileView] = useState<'details' | 'update_email' | 'verify_otp' | 'update_phone' | 'verify_phone_otp'>('details');
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '' });
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'success'>('idle');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  useEffect(() => {
    if (show) {
      setProfileView('details');
      fetchProfile()
        .then(prof => setProfileData({ name: prof.name || '', email: prof.email || '', phone: prof.phone || '' }))
        .catch(err => console.error("Failed to fetch profile in modal:", err));
    } else {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <header className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <h2 className="font-headline-sm text-primary">
            {profileView === 'details' ? 'User Profile & Authentication' : 
             profileView === 'update_email' ? 'Update Email Address' : 
             profileView === 'verify_otp' ? 'Verify Email OTP' :
             profileView === 'update_phone' ? 'Update Phone Number' : 'Verify Phone OTP'}
          </h2>
          <button onClick={() => { onClose(); setProfileView('details'); }} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface">close</button>
        </header>
        
        {profileView === 'details' && (
          <>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-primary">Name</label>
                <input 
                  type="text" 
                  value={profileData.name} 
                  onChange={e => setProfileData({...profileData, name: e.target.value})}
                  className="bg-surface-container border border-outline-variant rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  placeholder="Your Full Name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-primary">Email</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={profileData.email} 
                    disabled
                    className="bg-surface-container/50 border border-outline-variant rounded-lg p-3 focus:outline-none text-sm flex-1 opacity-70"
                  />
                  <button 
                    onClick={() => { setNewEmail(''); setProfileView('update_email'); }}
                    className="px-4 py-2 bg-surface-container-high border border-outline-variant rounded-lg font-label-md text-primary hover:bg-surface-variant transition-colors whitespace-nowrap"
                  >
                    Update
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-primary">Phone Number</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={profileData.phone} 
                    disabled
                    className="bg-surface-container/50 border border-outline-variant rounded-lg p-3 focus:outline-none text-sm flex-1 opacity-70"
                    placeholder="Your Phone Number"
                  />
                  <button 
                    onClick={() => { setNewPhone(''); setProfileView('update_phone'); }}
                    className="px-4 py-2 bg-surface-container-high border border-outline-variant rounded-lg font-label-md text-primary hover:bg-surface-variant transition-colors whitespace-nowrap"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
            <footer className="p-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-low flex-wrap gap-3">
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    if (window.confirm("⚠️ Are you sure you want to permanently delete your account and all reported data? This action cannot be undone.")) {
                      try {
                        await apiClient.delete('/users/me');
                        logout();
                        navigate('/login');
                      } catch (e) {
                        alert("Failed to delete account");
                      }
                    }
                  }}
                  className="px-3 py-2 bg-error-container text-on-error-container rounded-lg font-label-sm font-bold hover:opacity-90 transition-all flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  Delete Account
                </button>
                <button 
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to purge all dummy/test accounts from the system?")) {
                      try {
                        const res = await apiClient.delete('/users/test-accounts');
                        alert(`Purged ${res.data.count || 0} dummy test accounts!`);
                        window.location.reload();
                      } catch (e) {
                        alert("Failed to purge test accounts");
                      }
                    }
                  }}
                  className="px-3 py-2 bg-surface-container-highest text-on-surface rounded-lg font-label-sm font-bold hover:bg-surface-variant transition-all flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">mop</span>
                  Purge Test Accounts
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => onClose()} className="px-4 py-2 rounded-lg font-label-md text-primary hover:bg-primary/10">Cancel</button>
                <button onClick={async () => {
                  try {
                    await updateProfile({ name: profileData.name, phone: profileData.phone });
                    onClose();
                  } catch(e) {
                    alert('Error updating profile');
                  }
                }} className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 shadow-sm">Save Changes</button>
              </div>
            </footer>
          </>
        )}

        {profileView === 'update_email' && (
          <>
            <div className="p-6 flex flex-col gap-4">
              <p className="font-body-sm text-on-surface-variant">Enter your new email address. We will send a 6-digit OTP to verify it.</p>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-primary">New Email Address</label>
                <input 
                  type="email" 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)}
                  className="bg-surface-container border border-outline-variant rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  placeholder="new.email@example.com"
                />
              </div>
            </div>
            <footer className="p-4 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-low">
              <button onClick={() => setProfileView('details')} className="px-4 py-2 rounded-lg font-label-md text-primary hover:bg-primary/10">Back</button>
              <button onClick={async () => {
                if (!newEmail) return alert('Enter a new email');
                setEmailLoading(true);
                try {
                  await requestEmailOtp(newEmail);
                  setOtpValues(Array(6).fill(''));
                  setVerifyStatus('idle');
                  setProfileView('verify_otp');
                } catch(e: any) {
                  alert(e.response?.data || 'Error requesting OTP');
                } finally {
                  setEmailLoading(false);
                }
              }} disabled={emailLoading} className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 shadow-sm disabled:opacity-50">
                {emailLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </footer>
          </>
        )}

        {profileView === 'verify_otp' && (
          <div className="flex flex-col items-center justify-center p-8 bg-surface-container-lowest text-center animate-in fade-in zoom-in duration-300">
            {verifyStatus === 'idle' && (
              <>
                <div className="w-16 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-surface-container-high rounded-xl border-2 border-surface-container-highest overflow-hidden">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-6 border-2 border-tertiary rounded-md flex items-center justify-center">
                      <div className="w-1 h-1 bg-tertiary rounded-full"></div>
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      <div className="w-1.5 h-1.5 bg-tertiary rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-tertiary rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-tertiary rounded-full"></div>
                    </div>
                  </div>
                </div>
                <h2 className="font-headline-md text-primary mb-2">Let's verify your email</h2>
                <p className="font-body-sm text-on-surface-variant mb-8 max-w-xs mx-auto">
                  We've sent a 6-digit code to your email. It'll auto-verify once entered.
                </p>
                <div className="flex gap-2 mb-8 justify-center">
                  {otpValues.map((v, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      maxLength={1}
                      value={v}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const newVals = [...otpValues];
                        newVals[i] = val;
                        setOtpValues(newVals);
                        
                        if (val && i < 5) {
                          otpRefs.current[i + 1]?.focus();
                        }
                        
                        if (newVals.every(x => x !== '')) {
                          setVerifyStatus('verifying');
                          verifyEmailOtp(newEmail, newVals.join(''))
                            .then(res => {
                              setVerifyStatus('success');
                              login({ id: user?.id || '', email: res.username, role: res.role }, res.token);
                              setProfileData({ ...profileData, email: newEmail });
                              setTimeout(() => {
                                setProfileView('details');
                                setVerifyStatus('idle');
                              }, 2000);
                            })
                            .catch(err => {
                              alert(err.response?.data || 'Invalid OTP');
                              setVerifyStatus('idle');
                              setOtpValues(Array(6).fill(''));
                              otpRefs.current[0]?.focus();
                            });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !v && i > 0) {
                          otpRefs.current[i - 1]?.focus();
                        }
                      }}
                      className="w-12 h-14 bg-surface-container border-2 border-surface-container-highest rounded-xl text-center text-xl font-bold text-primary focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-colors"
                    />
                  ))}
                </div>
                <button onClick={() => setProfileView('update_email')} className="font-label-md text-on-surface-variant hover:text-primary transition-colors">
                  Didn't receive the code? <span className="text-primary font-bold">Back</span>
                </button>
              </>
            )}
            
            {verifyStatus === 'verifying' && (
              <>
                <div className="w-16 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-surface-container-high rounded-xl border-2 border-tertiary overflow-hidden shadow-[0_0_15px_rgba(0,153,255,0.3)]">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-6 border-2 border-tertiary rounded-md flex items-center justify-center">
                      <div className="w-1 h-1 bg-tertiary rounded-full"></div>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 text-center">
                      <span className="font-label-sm text-tertiary animate-pulse">Verifying...</span>
                    </div>
                  </div>
                </div>
                <h2 className="font-headline-md text-primary mb-2">Verifying code...</h2>
                <p className="font-body-sm text-on-surface-variant max-w-xs mx-auto">
                  Please wait while we confirm your email.
                </p>
              </>
            )}

            {verifyStatus === 'success' && (
              <>
                <div className="w-16 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-secondary-container/20 rounded-xl border-2 border-secondary-container overflow-hidden shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-6 border-2 border-secondary-container rounded-md flex items-center justify-center">
                      <div className="w-1 h-1 bg-secondary-container rounded-full"></div>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 text-center flex justify-center">
                      <span className="material-symbols-outlined text-secondary-container">check_circle</span>
                    </div>
                  </div>
                </div>
                <h2 className="font-headline-md text-secondary-container mb-2">Email Verified!</h2>
                <p className="font-body-sm text-secondary-container max-w-xs mx-auto">
                  Your email has been successfully verified.
                </p>
              </>
            )}
          </div>
        )}

        {profileView === 'update_phone' && (
          <>
            <div className="p-6 flex flex-col gap-4">
              <p className="font-body-sm text-on-surface-variant">Enter your new phone number (include country code, e.g., +1234567890). We will send a 6-digit OTP to verify it via SMS.</p>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-primary">New Phone Number</label>
                <input 
                  type="tel" 
                  value={newPhone} 
                  onChange={e => setNewPhone(e.target.value)}
                  className="bg-surface-container border border-outline-variant rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  placeholder="+1234567890"
                />
              </div>
              <div id="recaptcha-container" className="mt-2 flex justify-center"></div>
            </div>
            <footer className="p-4 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-low">
              <button onClick={() => setProfileView('details')} className="px-4 py-2 rounded-lg font-label-md text-primary hover:bg-primary/10">Back</button>
              <button onClick={async () => {
                if (!newPhone) return alert('Enter a new phone number');
                const formattedPhone = newPhone.trim();
                if (!/^\+[1-9]\d{9,14}$/.test(formattedPhone)) {
                  return alert('Please enter a valid phone number with country code (e.g., +917995621337)');
                }
                setEmailLoading(true);
                try {
                  console.log("[PhoneAuth] Initializing verification for:", formattedPhone);
                  if (recaptchaVerifierRef.current) {
                    recaptchaVerifierRef.current.clear();
                    recaptchaVerifierRef.current = null;
                  }
                  const containerEl = document.getElementById('recaptcha-container');
                  if (!containerEl) {
                    throw new Error("reCAPTCHA container DOM node not found.");
                  }
                  recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible',
                    callback: (response: any) => {
                      console.log("[PhoneAuth] reCAPTCHA verified successfully:", response);
                    },
                    'expired-callback': () => {
                      console.warn("[PhoneAuth] reCAPTCHA token expired. Clearing verifier.");
                      recaptchaVerifierRef.current?.clear();
                      recaptchaVerifierRef.current = null;
                    }
                  });
                  await recaptchaVerifierRef.current.render();
                  console.log("[PhoneAuth] reCAPTCHA widget rendered.");
                  const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
                  console.log("[PhoneAuth] SMS OTP dispatched successfully.", confirmation);
                  setConfirmationResult(confirmation);
                  setOtpValues(Array(6).fill(''));
                  setVerifyStatus('idle');
                  setProfileView('verify_phone_otp');
                } catch(e: any) {
                  console.error("[PhoneAuth] Firebase SMS error:", e);
                  if (recaptchaVerifierRef.current) {
                    recaptchaVerifierRef.current.clear();
                    recaptchaVerifierRef.current = null;
                  }
                  alert(`Authentication Error: ${e.message || 'Error requesting OTP'}`);
                } finally {
                  setEmailLoading(false);
                }
              }} disabled={emailLoading} className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 shadow-sm disabled:opacity-50">
                {emailLoading ? 'Sending SMS...' : 'Send SMS OTP'}
              </button>
            </footer>
          </>
        )}

        {profileView === 'verify_phone_otp' && (
          <div className="flex flex-col items-center justify-center p-8 bg-surface-container-lowest text-center animate-in fade-in zoom-in duration-300">
            {verifyStatus === 'idle' && (
              <>
                <div className="w-16 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-surface-container-high rounded-xl border-2 border-surface-container-highest overflow-hidden">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-6 border-2 border-tertiary rounded-md flex items-center justify-center">
                      <div className="w-1 h-1 bg-tertiary rounded-full"></div>
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      <div className="w-1.5 h-1.5 bg-tertiary rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-tertiary rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-tertiary rounded-full"></div>
                    </div>
                  </div>
                </div>
                <h2 className="font-headline-md text-primary mb-2">Verify Phone Number</h2>
                <p className="font-body-sm text-on-surface-variant mb-8 max-w-xs mx-auto">
                  We've sent an SMS verification code to <span className="font-bold">{newPhone}</span>.
                </p>
                <div className="flex gap-2 mb-8 justify-center">
                  {otpValues.map((v, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      maxLength={1}
                      value={v}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const newVals = [...otpValues];
                        newVals[i] = val;
                        setOtpValues(newVals);
                        
                        if (val && i < 5) {
                          otpRefs.current[i + 1]?.focus();
                        }
                        
                        if (newVals.every(x => x !== '')) {
                          setVerifyStatus('verifying');
                          const otpString = newVals.join('');
                          console.log("[PhoneAuth] Confirming OTP:", otpString);
                          if (confirmationResult) {
                            confirmationResult.confirm(otpString)
                              .then(async (userCredential) => {
                                console.log("[PhoneAuth] Firebase OTP confirmed for user:", userCredential.user.uid);
                                try {
                                  await updateProfile({ phone: newPhone });
                                  console.log("[PhoneAuth] Backend updated with phone:", newPhone);
                                  setVerifyStatus('success');
                                  setProfileData({ ...profileData, phone: newPhone });
                                  setTimeout(() => {
                                    setProfileView('details');
                                    setVerifyStatus('idle');
                                  }, 2000);
                                } catch (beErr: any) {
                                  console.error("[PhoneAuth] Backend phone update failed:", beErr);
                                  alert("Phone verified in Firebase, but failed to update profile in backend.");
                                  setVerifyStatus('idle');
                                }
                              })
                              .catch((err) => {
                                console.error("[PhoneAuth] OTP confirm error:", err);
                                alert(`Invalid SMS OTP: ${err.message || 'Verification failed'}`);
                                setVerifyStatus('idle');
                                setOtpValues(Array(6).fill(''));
                                otpRefs.current[0]?.focus();
                              });
                          } else {
                            alert("No verification session found. Please request a new OTP.");
                            setVerifyStatus('idle');
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !v && i > 0) {
                          otpRefs.current[i - 1]?.focus();
                        }
                      }}
                      className="w-12 h-14 bg-surface-container border-2 border-surface-container-highest rounded-xl text-center text-xl font-bold text-primary focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-colors"
                    />
                  ))}
                </div>
                <button onClick={() => setProfileView('update_phone')} className="font-label-md text-on-surface-variant hover:text-primary transition-colors">
                  Didn't receive the SMS? <span className="text-primary font-bold">Back</span>
                </button>
              </>
            )}
            
            {verifyStatus === 'verifying' && (
              <>
                <div className="w-16 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-surface-container-high rounded-xl border-2 border-tertiary overflow-hidden shadow-[0_0_15px_rgba(0,153,255,0.3)]">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-6 border-2 border-tertiary rounded-md flex items-center justify-center">
                      <div className="w-1 h-1 bg-tertiary rounded-full"></div>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 text-center">
                      <span className="font-label-sm text-tertiary animate-pulse">Verifying...</span>
                    </div>
                  </div>
                </div>
                <h2 className="font-headline-md text-primary mb-2">Verifying SMS code...</h2>
                <p className="font-body-sm text-on-surface-variant max-w-xs mx-auto">
                  Please wait while we confirm your phone number.
                </p>
              </>
            )}

            {verifyStatus === 'success' && (
              <>
                <div className="w-16 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-secondary-container/20 rounded-xl border-2 border-secondary-container overflow-hidden shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-6 border-2 border-secondary-container rounded-md flex items-center justify-center">
                      <div className="w-1 h-1 bg-secondary-container rounded-full"></div>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 text-center flex justify-center">
                      <span className="material-symbols-outlined text-secondary-container">check_circle</span>
                    </div>
                  </div>
                </div>
                <h2 className="font-headline-md text-secondary-container mb-2">Phone Verified!</h2>
                <p className="font-body-sm text-secondary-container max-w-xs mx-auto">
                  Your phone number has been successfully verified.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
