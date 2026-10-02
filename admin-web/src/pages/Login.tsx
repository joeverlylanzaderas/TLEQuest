import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Import local image assets relative to src/pages/
import loginBg from '../assets/login-bg3.png';
import logoImg from '../assets/logo.png';

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
        <form onSubmit={handleSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>TLEQuest Admin</h2>

          {/* Username Field */}
          <div style={styles.fieldContainer}>
            <label style={styles.label}>USERNAME</label>
            <div style={styles.inputWrapper}>
              <UserIcon style={styles.leftIcon} />
              <input
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
            <label style={styles.label}>PASSWORD</label>
            <div style={styles.inputWrapper}>
              <LockIcon style={styles.leftIcon} />
              <input
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
              >
                <EyeIcon style={styles.rightIcon} isVisible={showPassword} />
              </button>
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          {/* Submit Button */}
          <button type="submit" style={styles.button} disabled={isSubmitting}>
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
    <svg style={style} viewBox="0 0 24 24" fill="#2E180B" width="22" height="22">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function LockIcon({ style }: { style: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="#2E180B" width="22" height="22">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

function EyeIcon({ style, isVisible }: { style: React.CSSProperties; isVisible: boolean }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="#2E180B" width="22" height="22">
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
    overflowY: 'auto', // Safely allows scroll if browser height is extremely small
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
    maxWidth: 'clamp(300px, 90vw, 450px)', // Fluid width scaling
    boxSizing: 'border-box',
    margin: 'auto',
  },
  logoImage: {
    width: '100%',
    maxWidth: 'clamp(260px, 85vw, 520px)', // Scales up to 520px on big screens, shrinks cleanly on mobile
    maxHeight: 'clamp(120px, 30vh, 320px)', // Constrains vertical height on small screens
    height: 'auto',
    marginBottom: 'clamp(6px, 1.5vh, 16px)',
    objectFit: 'contain',
    filter: 'drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.45))',
  },
  card: {
    backgroundColor: '#FFFDF5',
    borderRadius: '28px',
    padding: 'clamp(20px, 5vw, 32px)', // Fluid card padding
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
    border: '3px solid #EADEC9',
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(10px, 2vh, 18px)', // Dynamic gap between fields
  },
  cardTitle: {
    textAlign: 'center',
    margin: '0 0 2px 0',
    color: '#2E180B',
    fontSize: 'clamp(20px, 4vw, 26px)', // Fluid title text
    fontWeight: 700,
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
    letterSpacing: '0.5px',
  },
  fieldContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    fontWeight: 700,
    color: '#3D2514',
    letterSpacing: '1px',
    marginLeft: '14px',
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  leftIcon: {
    position: 'absolute',
    left: '16px',
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
    padding: 'clamp(10px, 2.5vh, 14px) 20px clamp(10px, 2.5vh, 14px) 50px',
    borderRadius: '28px',
    border: '2px solid #38200B',
    backgroundColor: '#FDE396',
    fontSize: 'clamp(14px, 3vw, 16px)',
    fontWeight: 600,
    color: '#2E180B',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
  button: {
    width: '100%',
    padding: 'clamp(11px, 2.5vh, 15px)',
    marginTop: '4px',
    borderRadius: '28px',
    border: 'none',
    backgroundColor: '#2E180B',
    color: '#FFF8EA',
    fontSize: 'clamp(15px, 3.5vw, 18px)',
    fontWeight: 700,
    letterSpacing: '1px',
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(46, 24, 11, 0.35)',
    transition: 'transform 0.1s ease, background-color 0.15s ease',
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
  error: {
    color: '#DF1B39',
    fontSize: '12px',
    fontWeight: 600,
    margin: 0,
    textAlign: 'center',
    fontFamily: "'Fredoka', 'Quicksand', sans-serif",
  },
};