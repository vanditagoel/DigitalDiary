import React from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';
import { supabase } from '../supabaseClient';

import GetStartedWithGoogleButton from "./components/GetStartedWithGoogleButton";

function Landing() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState("");

  React.useEffect(() => {
    // Check if already authenticated and password is set
    const auth = localStorage.getItem('isAuthenticated');
    const pwd = localStorage.getItem('userPassword');
    const email = localStorage.getItem('userEmail');
    if (auth && pwd && email) {
      setIsAuthenticated(true);
      setUserEmail(email);
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
      localStorage.setItem('userEmail', data.email);
      navigate('/home');
    },
    onError: () => {
      alert('Google authentication failed.');
    },
  });

  return (
    <>
      <header className="header">
        <div className="logo">Loona</div>
        <div className="button-group">
          <button className="btn" onClick={login}>Log In</button>
        </div>
      </header>
      <main className="main">
        <h1 className="headline">Your Digital Diary</h1>
        <p className="subheadline">
          In the quiet act of writing, the soul reveals itself. Each entry is not just recorded, but remembered — as if Raskolnikov himself once questioned it.
        </p>
        <GetStartedWithGoogleButton onClick={login} />
      </main>
    </>
  );
}

export default Landing;
