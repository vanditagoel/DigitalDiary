import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../supabaseClient';

import GetStartedWithGoogleButton from "./components/GetStartedWithGoogleButton";

function Landing() {
  // React Router navigation
  const navigate = useNavigate();

  // On mount, check if user is already authenticated and redirect to /home
  React.useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        navigate('/home');
      }
    })();
  }, [navigate]);

  // Handle Google OAuth login
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      alert('Google authentication failed.');
    }
    // On success, Supabase will handle redirect and session
  };

  // Render landing page UI
  return (
    <>
      {/* Header with logo and login button */}
      <header className="header">
        <div className="logo">Loona</div>
        <div className="button-group">
          <button className="btn" onClick={handleGoogleLogin}>Log In</button>
        </div>
      </header>
      <main className="main">
        <h1 className="headline">Your Digital Diary</h1>
        <p className="subheadline">
          In the quiet act of writing, the soul reveals itself. Each entry is not just recorded, but remembered — as if Raskolnikov himself once questioned it.
        </p>
        {/* Google login button component */}
        <GetStartedWithGoogleButton onClick={handleGoogleLogin} />
      </main>
    </>
  );
}

export default Landing;
