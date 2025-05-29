import React from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';
import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';

function Landing() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [passwordInput, setPasswordInput] = React.useState("");
  const [userEmail, setUserEmail] = React.useState("");

  React.useEffect(() => {
    // Check if already authenticated and password is set
    const auth = localStorage.getItem('isAuthenticated');
    const pwd = localStorage.getItem('userPassword');
    if (auth && pwd) {
      setIsAuthenticated(true);
      navigate('/home');
    }
  }, [navigate]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // Fetch user info from Google
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });
      const data = await res.json();
      setUserEmail(data.email);
      setIsAuthenticated(true);
      setShowPasswordPrompt(true);
    },
    onError: () => {
      alert('Google authentication failed.');
    },
  });

  const handleSetPassword = async () => {
    if (password.length < 4) {
      alert('Password must be at least 4 characters.');
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userPassword', hashedPassword);
    // Store user in Supabase users and auth tables
    if (userEmail) {
      const { data: userData, error: userError } = await supabase.from('users').upsert({ email: userEmail, password: hashedPassword });
      if (userError) console.error('Supabase users upsert error:', userError);
      else console.log('Supabase users upsert success:', userData);
      const { data: authData, error: authError } = await supabase.from('auth').upsert({ email: userEmail, password: hashedPassword });
      if (authError) console.error('Supabase auth upsert error:', authError);
      else console.log('Supabase auth upsert success:', authData);
      localStorage.setItem('userEmail', userEmail);
    }
    setShowPasswordPrompt(false);
    navigate('/home');
  };

  return (
    <>
      <header className="header">
        <div className="logo">Loona</div>
        <div className="button-group">
          <button className="btn" onClick={login}>Get Started</button>
        </div>
      </header>
      <main className="main">
        <h1 className="headline">Your Digital Diary</h1>
        <p className="subheadline">
          Write, reflect, and organize your thoughts. Each entry is timestamped for your journey.
        </p>
        <button className="btn glass" onClick={login}>Create New Journal</button>
        {showPasswordPrompt && (
          <div style={{background:'#232a34',padding:'2rem',borderRadius:'1rem',marginTop:'2rem',boxShadow:'0 2px 16px #0008'}}>
            <h2>Set a Password</h2>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter a password"
              style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'1rem'}}
            />
            <br />
            <button className="btn" onClick={handleSetPassword}>Save Password</button>
          </div>
        )}
      </main>
    </>
  );
}

export default Landing;
