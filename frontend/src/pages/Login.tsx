import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, googleLogin, requestSignupOtp } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle } from '../lib/firebase';

export default function Login() {
  const { user, login: setAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role) {
      const rawRole = user.role.replace(/^ROLE_/, '');
      const routeMap: Record<string, string> = {
        'CITIZEN': '/citizen/dashboard',
        'FIELD_OFFICER': '/officer/dashboard',
        'DEPT_HEAD': '/depthead/dashboard',
        'COMMISSIONER': '/commissioner/dashboard',
        'SUPER_ADMIN': '/admin/dashboard',
      };
      if (routeMap[rawRole]) {
        navigate(routeMap[rawRole]);
      }
    }
  }, [user, navigate]);

  const [isSignUp, setIsSignUp] = useState(false);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('CITIZEN');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('TRANSPORT_AND_ROADS');
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  const autoDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
      },
      (error) => {
        alert('Unable to retrieve your location');
        console.error(error);
      }
    );
  };
  
  const [loading, setLoading] = useState(false);
  const [needsRoleForGoogle, setNeedsRoleForGoogle] = useState(false);

  const handleAuthSuccess = (data: any) => {
    // Normalize role: strip Spring Security's ROLE_ prefix
    const rawRole = (data.role || '').replace(/^ROLE_/, '');
    const user = {
      id: data.id || data.email,
      email: data.email,
      role: rawRole
    };
    setAuth(user, data.token);
    
    if (rawRole === 'CITIZEN' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          localStorage.setItem('user_location', JSON.stringify(coords));
          window.dispatchEvent(new CustomEvent('location_updated', { detail: coords }));
        },
        (error) => console.warn("Location permission error:", error.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    const routeMap: Record<string, string> = {
      'CITIZEN': '/citizen/dashboard',
      'FIELD_OFFICER': '/officer/dashboard',
      'DEPT_HEAD': '/depthead/dashboard',
      'COMMISSIONER': '/commissioner/dashboard',
      'SUPER_ADMIN': '/admin/dashboard',
    };
    navigate(routeMap[rawRole] || '/');
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp && !showOtpStep) {
        const res = await requestSignupOtp(email);
        if (res.devOtp) {
          setDevOtpHint(res.devOtp);
        } else {
          setDevOtpHint(null);
        }
        setShowOtpStep(true);
        alert(res.message || `Verification code sent to ${email}`);
      } else if (isSignUp && showOtpStep) {
        if (!otp || otp.length < 6) {
          alert("Please enter a valid 6-digit verification code");
          return;
        }
        const data = await register({ email, password, name, phone, role, location, department, otp });
        handleAuthSuccess(data);
      } else {
        const data = await login(email, password);
        handleAuthSuccess(data);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = typeof err?.response?.data === 'string' 
        ? err.response.data 
        : err?.response?.data?.message || err?.message || 'Authentication failed. Check your credentials.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const response = await googleLogin(idToken);
      
      if (response.needsRole) {
        setGoogleIdToken(idToken);
        setNeedsRoleForGoogle(true);
      } else {
        handleAuthSuccess(response);
      }
    } catch (err) {
      console.error(err);
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Simulating Google Auth since Firebase popup failed locally.');
        setGoogleIdToken('LOCAL_MOCK');
        setNeedsRoleForGoogle(true);
      } else {
        alert('Google Auth failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitGoogleWithRole = async () => {
    setLoading(true);
    try {
      if (googleIdToken === 'LOCAL_MOCK') {
        const data = await register({ 
          email: `google.mock.${Date.now()}@example.com`, 
          password: 'mockpassword123', 
          name: 'Mock Google User', 
          phone: '', 
          role, 
          location, 
          department,
          otp: '123456'
        });
        handleAuthSuccess(data);
      } else {
        const response = await googleLogin(googleIdToken || '', role, location, department);
        handleAuthSuccess(response);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data || 'Failed to complete Google Registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-8">
        <div className="flex justify-center mb-6">
          <img src="/logo.jpg" alt="CivicResolve Logo" className="w-24 h-24 rounded-full object-cover bg-white" />
        </div>
        <h1 className="font-headline-md text-headline-md font-bold mb-6 text-center text-primary">CivicResolve Portal</h1>
        
        {showOtpStep ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
              </div>
              <h2 className="font-headline-md text-xl font-bold text-primary mb-2">Verify Your Email</h2>
              <p className="font-body-sm text-sm text-on-surface-variant">
                We've sent a 6-digit verification code to <strong className="text-on-surface">{email}</strong>. Enter the code below to verify and complete your signup.
              </p>
              {devOtpHint && (
                <div className="mt-3 p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-500 text-left">
                  <strong>Dev Mode Hint:</strong> Your verification code is <span className="font-bold underline">{devOtpHint}</span> (or use code 123456)
                </div>
              )}
            </div>

            <form onSubmit={handleManualAuth} className="space-y-4">
              <div>
                <label className="block font-label-sm text-xs text-on-surface-variant mb-1.5 text-center uppercase tracking-wider font-bold">6-Digit Verification Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-surface-container border-2 border-outline-variant rounded-xl p-3 font-mono text-center text-2xl tracking-[0.5em] text-primary font-bold focus:outline-none focus:border-primary transition-all"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" disabled={loading || otp.length < 6} className="w-full bg-green-600 text-white font-label-md py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4 flex items-center justify-center gap-2 shadow-md cursor-pointer">
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    Verify & Complete Signup
                  </>
                )}
              </button>
            </form>

            <div className="flex justify-between items-center text-xs pt-4 border-t border-outline-variant">
              <button 
                type="button"
                onClick={() => {
                  setShowOtpStep(false);
                  setOtp('');
                }}
                className="text-on-surface-variant hover:text-primary font-semibold flex items-center gap-1 cursor-pointer"
              >
                ← Change Details / Back
              </button>
              <button 
                type="button"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await requestSignupOtp(email);
                    if (res.devOtp) setDevOtpHint(res.devOtp);
                    alert(res.message || "New verification code sent!");
                  } catch (e: any) {
                    alert("Failed to resend code");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="text-primary hover:underline font-bold cursor-pointer"
              >
                Resend Code
              </button>
            </div>
          </div>
        ) : needsRoleForGoogle ? (
          <div className="space-y-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Almost there! We just need to know your role to complete your Google registration.</p>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Select Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
              >
                <option value="CITIZEN">Citizen</option>
                <option value="FIELD_OFFICER">Field Officer</option>
                <option value="DEPT_HEAD">Department Head</option>
                <option value="COMMISSIONER">Commissioner</option>
              </select>
            </div>
            {['FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER'].includes(role) && (
              <>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Location</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="flex-1 bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
                      required
                    />
                    <button type="button" onClick={autoDetectLocation} className="bg-surface-container-high px-3 py-2 rounded-lg text-primary hover:bg-surface-container-highest transition-colors">
                      <span className="material-symbols-outlined text-xl">my_location</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Department</label>
                  <select 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
                    required
                  >
                    <option value="TRANSPORT_AND_ROADS">Transport & Roads</option>
                    <option value="SANITATION">Sanitation</option>
                    <option value="WATER_AND_SEWAGE">Water & Sewage</option>
                    <option value="PARKS_AND_PUBLIC_WORKS">Parks & Public Works</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
              </>
            )}
            <button onClick={submitGoogleWithRole} disabled={loading} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-lg hover:opacity-90 transition-opacity mt-4 flex items-center justify-center cursor-pointer">
              {loading ? 'Completing...' : 'Complete Registration'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex mb-6 border-b border-outline-variant">
              <button 
                onClick={() => {
                  setIsSignUp(false);
                  setShowOtpStep(false);
                  setOtp('');
                }}
                className={`flex-1 pb-2 font-label-md transition-colors cursor-pointer ${!isSignUp ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}
              >
                Login
              </button>
              <button 
                onClick={() => {
                  setIsSignUp(true);
                  setShowOtpStep(false);
                  setOtp('');
                }}
                className={`flex-1 pb-2 font-label-md transition-colors cursor-pointer ${isSignUp ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleManualAuth} className="space-y-4">
              {isSignUp && (
                <>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
                      required={isSignUp}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Phone</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Role</label>
                    <select 
                      value={role} 
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="CITIZEN">Citizen</option>
                      <option value="FIELD_OFFICER">Field Officer</option>
                      <option value="DEPT_HEAD">Department Head</option>
                      <option value="COMMISSIONER">Commissioner</option>
                    </select>
                  </div>
                  {['FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER'].includes(role) && (
                    <>
                      <div>
                        <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Location</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="flex-1 bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
                            required
                          />
                          <button type="button" onClick={autoDetectLocation} className="bg-surface-container-high px-3 py-2 rounded-lg text-primary hover:bg-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-xl">my_location</span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Department</label>
                        <select 
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
                          required
                        >
                          <option value="TRANSPORT_AND_ROADS">Transport & Roads</option>
                          <option value="SANITATION">Sanitation</option>
                          <option value="WATER_AND_SEWAGE">Water & Sewage</option>
                          <option value="PARKS_AND_PUBLIC_WORKS">Parks & Public Works</option>
                          <option value="GENERAL">General</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}
              
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg p-2 font-body-md text-primary focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-lg hover:opacity-90 transition-opacity mt-4 flex items-center justify-center cursor-pointer shadow-sm">
                {loading ? 'Processing...' : (isSignUp ? 'Continue to Verification →' : 'Login')}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center">
              <p className="font-label-sm text-on-surface-variant mb-4">OR</p>
              <button 
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-surface-container-lowest border border-outline-variant text-primary font-label-md py-2 px-4 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
