import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Import local image assets relative to src/pages/
import loginBg from '../assets/web tlequest.png';
import logoImg from '../assets/tlequest-logo3.png';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically load Fredoka web font for a game-style UI
  useEffect(() => {
    const fontId = 'google-font-fredoka';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signIn({ username, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.screen}>
      <div style={styles.contentContainer}>
        
        {/* Official PNG Logo Image - Fluid Scaling */}
        <img 
          src={logoImg} 
          alt="TLEQuest Logo" 
          style={styles.logoImage} 
        />

        {/* Login Card - Fluid Responsive Container */}
        <style>{formCss}</style>
        <form onSubmit={handleSubmit} style={styles.card} className="lf-card">
          {/* Yellow bar at the top */}
          <div style={styles.accentBarTop} />
          {/* Blue border accent bar at the bottom */}
          <div style={styles.accentBarBottom} />

          <h2 style={styles.cardTitle}>Welcome back</h2>
          <p style={styles.cardSub}>Sign in to manage TLEQuest</p>

          {/* Username Field */}
          <div style={styles.fieldContainer}>
            <label style={styles.label} htmlFor="lf-user">USERNAME</label>
            <div style={styles.inputWrapper}>
              <UserIcon style={styles.leftIcon} />
              <input
                id="lf-user"
                className="lf-input"
                style={styles.input}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={styles.fieldContainer}>
            <label style={styles.label} htmlFor="lf-pass">PASSWORD</label>
            <div style={styles.inputWrapper}>
              <LockIcon style={styles.leftIcon} />
              <input
                id="lf-pass"
                className="lf-input"
                style={{ ...styles.input, paddingRight: '52px' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon style={styles.rightIcon} isVisible={showPassword} />
              </button>
            </div>
          </div>

          {error && <p style={styles.error} role="alert">{error}</p>}

          {/* Submit Button */}
          <button type="submit" style={styles.button} className="lf-btn" disabled={isSubmitting}>
            {isSubmitting ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Inline SVGs for Field Icons
function UserIcon({ style }: { style: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="#1F2D33" width="22" height="22">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function LockIcon({ style }: { style: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="#1F2D33" width="22" height="22">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

function EyeIcon({ style, isVisible }: { style: React.CSSProperties; isVisible: boolean }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="#1F2D33" width="22" height="22">
      {isVisible ? (
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      ) : (
        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2z" />
      )}
    </svg>
  );
}

// Global Layout & Fluid Responsive Styling
const styles: Record<string, React.CSSProperties> = {
  screen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `url(${loginBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: "'Fredoka', 'Quicksand', 'Nunito', 'Segoe UI', sans-serif",
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '16px',
  },
  contentContainer: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 'clamp(280px, 85vw, 420px)',
    boxSizing: 'border-box',
    margin: 'auto',
  },
  logoImage: {
    width: 'auto',
    height: 'clamp(140px, 28vh, 260px)', // Slightly optimized height to avoid vertical cramping
    maxWidth: '80vw',
    marginTop: '0px',
    marginBottom: '16px', // ⬅️ Adds proper spacing to prevent overlap with the form card
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.9)) drop-shadow(0 0 18px rgba(255,255,255,0.55)) drop-shadow(0 8px 14px rgba(0,0,0,0.35))',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFDF7',
    borderRadius: '22px',
    padding: 'clamp(22px, 4.5vw, 32px) clamp(18px, 4.5vw, 30px) clamp(20px, 3.5vw, 26px)',
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 20px 50px rgba(31, 45, 51, 0.35), 0 2px 6px rgba(31, 45, 51, 0.12)',
    border: '1px solid #EFE3C2',
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(8px, 1.8vh, 14px)',
  },
  accentBarTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '6px',
    backgroundColor: '#F2B84B',
  },
  accentBarBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '6px',
    backgroundColor: '#1F2D33',
  },
  cardTitle: {
    textAlign: 'center',
    margin: '2px 0 0 0',
    color: '#1F2D33',
    fontSize: 'clamp(22px, 4vw, 28px)',
    fontWeight: 700,
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
  cardSub: {
    textAlign: 'center',
    margin: '-6px 0 4px 0',
    color: '#6A7479',
    fontSize: 'clamp(12px, 2.8vw, 14px)',
    fontWeight: 400,
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
  fieldContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: 'clamp(10px, 2.2vw, 11px)',
    fontWeight: 700,
    color: '#1F2D33',
    letterSpacing: '1.2px',
    marginLeft: '6px',
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  leftIcon: {
    position: 'absolute',
    left: '15px',
    pointerEvents: 'none',
  },
  rightIcon: {
    cursor: 'pointer',
  },
  eyeButton: {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    padding: 'clamp(10px, 2.2vh, 13px) 16px clamp(10px, 2.2vh, 13px) 46px',
    borderRadius: '12px',
    border: '2px solid #EBDDB4',
    backgroundColor: '#FFF6DC',
    fontSize: 'clamp(13px, 2.8vw, 15px)',
    fontWeight: 500,
    color: '#1F2D33',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
  button: {
    width: '100%',
    padding: 'clamp(11px, 2.2vh, 14px)',
    marginTop: '4px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#1F2D33',
    color: '#FFF6DC',
    fontSize: 'clamp(14px, 3.2vw, 16px)',
    fontWeight: 700,
    letterSpacing: '1.5px',
    cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(31, 45, 51, 0.3)',
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
  error: {
    color: '#B3261E',
    background: '#FDECEC',
    border: '1px solid #F5C6C2',
    borderRadius: '10px',
    padding: '8px 10px',
    fontSize: '12px',
    fontWeight: 500,
    margin: 0,
    textAlign: 'center',
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
};

// Hover / focus states
const formCss = `
  .lf-input::placeholder { color: #8C8566; }
  .lf-input { transition: border-color .15s, box-shadow .15s, background-color .15s; }
  .lf-input:focus { border-color: #F2B84B !important; background-color: #FFFFFF !important; box-shadow: 0 0 0 4px rgba(242,184,75,0.3); }
  .lf-btn { transition: transform .1s, background-color .15s, box-shadow .15s; }
  .lf-btn:hover:not(:disabled) { background-color: #2B3F47 !important; }
  .lf-btn:active:not(:disabled) { transform: translateY(1px); box-shadow: 0 4px 10px rgba(31,45,51,0.25) !important; }
  .lf-btn:disabled { opacity: .7; cursor: not-allowed; }
`;