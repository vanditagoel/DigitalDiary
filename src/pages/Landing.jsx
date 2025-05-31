import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../supabaseClient';

import GetStartedWithGoogleButton from "./components/GetStartedWithGoogleButton";

function Landing() {
  const navigate = useNavigate();

  React.useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        navigate('/home');
      }
    })();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      alert('Google authentication failed.');
    }
    // On success, Supabase will handle redirect and session
  };

  return (
    <>
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
        <GetStartedWithGoogleButton onClick={handleGoogleLogin} />
      </main>
    </>
  );
}

export default Landing;
