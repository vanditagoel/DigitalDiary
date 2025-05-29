import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';

function getFormattedDateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const date = now.toLocaleDateString(undefined, options);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} | ${time}`;
}

function Home() {
  const [journals, setJournals] = useState([]);
  const [journalTitle, setJournalTitle] = useState("");
  const [journalEntry, setJournalEntry] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const userPassword = localStorage.getItem('userPassword');
    const email = localStorage.getItem('userEmail');
    // Only show password prompt if user is navigating from Landing and session is unlocked
    const unlocked = sessionStorage.getItem('unlocked');
    if (!isAuthenticated || !userPassword || !email) {
      navigate('/');
      return;
    }
    setUserEmail(email);
    if (!unlocked) {
      // Only show password prompt if coming from Landing page
      const fromLanding = sessionStorage.getItem('fromLanding');
      if (fromLanding === 'true') {
        setShowPasswordPrompt(true);
        sessionStorage.removeItem('fromLanding');
      } else {
        // If not from Landing, stay on Home but do not show password prompt
        fetchJournals(email);
      }
    } else {
      fetchJournals(email);
    }
  }, [navigate]);

  const fetchJournals = async (email) => {
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setJournals(data);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    // Fetch hashed password from auth table for this email
    const { data, error } = await supabase.from('auth').select('password').eq('email', userEmail).single();
    if (error || !data) {
      alert('No password found for this user.');
      return;
    }
    const match = await bcrypt.compare(passwordInput, data.password);
    if (match) {
      setShowPasswordPrompt(false);
      sessionStorage.setItem('unlocked', 'true');
    } else {
      alert('Incorrect password.');
    }
  };

  const handleStart = async () => {
    if (!journalTitle.trim() && !journalEntry.trim()) {
      alert('Please enter a title or entry.');
      return;
    }
    if (!userEmail) {
      alert('User email not found. Please log in again.');
      return;
    }
    const newEntry = {
      title: journalTitle,
      entry: journalEntry,
      email: userEmail,
      created_at: new Date().toISOString(),
    };
    console.log('Inserting journal entry:', newEntry);
    const { data, error } = await supabase.from('journals').insert([newEntry]).select();
    if (error) {
      console.error('Supabase insert error:', error);
      alert('Failed to save entry: ' + error.message);
      return;
    }
    if (data && data[0]) {
      setJournals([data[0], ...journals]);
      setJournalTitle("");
      setJournalEntry("");
    }
  };

  const handleTextChange = async (id, value, field) => {
    setJournals(journals.map(j => j.id === id ? { ...j, [field]: value } : j));
    await supabase.from('journals').update({ [field]: value }).eq('id', id);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userPassword');
    localStorage.removeItem('userEmail');
    sessionStorage.removeItem('unlocked');
    navigate('/');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    // Fetch hashed password from auth table for this email
    const { data, error } = await supabase.from('auth').select('password').eq('email', userEmail).single();
    if (error || !data) {
      alert('No password found for this user.');
      return;
    }
    const match = await bcrypt.compare(oldPassword, data.password);
    if (!match) {
      alert('Old password is incorrect.');
      return;
    }
    if (newPassword.length < 4) {
      alert('New password must be at least 4 characters.');
      return;
    }
    const newHashed = await bcrypt.hash(newPassword, 10);
    localStorage.setItem('userPassword', newHashed);
    // Update password in both users and auth tables
    await supabase.from('users').update({ password: newHashed }).eq('email', userEmail);
    await supabase.from('auth').update({ password: newHashed }).eq('email', userEmail);
    setShowResetPassword(false);
    setOldPassword("");
    setNewPassword("");
    alert('Password reset successfully!');
  };

  if (showPasswordPrompt) {
    return (
      <main className="main">
        <h2>Enter your password to continue</h2>
        <form onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            placeholder="Enter your password"
            style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'1rem'}}
          />
          <br />
          <button className="btn" type="submit">Enter</button>
        </form>
        <button className="btn glass" style={{marginTop:'1rem'}} onClick={async () => {
          setShowForgotPassword(true);
          setForgotMessage("");
          // Use Supabase to send a password reset email to the authenticated user's email
          const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
            redirectTo: window.location.origin + '/reset-password',
          });
          if (error) {
            setForgotMessage('Failed to send reset email.');
          } else {
            setForgotMessage('Password reset email sent! Check your inbox.');
          }
        }}>
          Forgot Password?
        </button>
        {showForgotPassword && (
          <div style={{marginTop:'2rem',background:'#232a34',padding:'1.5rem',borderRadius:'1rem'}}>
            <h3>Forgot Password</h3>
            {forgotMessage && <div style={{marginTop:'1rem',color:'#ffe082'}}>{forgotMessage}</div>}
            <button className="btn glass" style={{marginTop:'1rem'}} onClick={() => setShowForgotPassword(false)}>
              Close
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <>
      <header className="header">
        <div className="logo">Loona</div>
        <div className="button-group">
          <button className="btn" onClick={() => navigate("/")}>Landing</button>
          <button className="btn" onClick={handleLogout}>Logout</button>
          <button className="btn" onClick={() => setShowResetPassword(true)}>Reset Password</button>
        </div>
      </header>
      {showResetPassword && (
        <main className="main">
          <h2>Reset Password</h2>
          <form onSubmit={handleResetPassword}>
            <input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="Enter old password"
              style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'1rem'}}
              required
            />
            <br />
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'1rem'}}
              required
            />
            <br />
            <button className="btn" type="submit">Save New Password</button>
            <button className="btn glass" type="button" onClick={() => setShowResetPassword(false)} style={{marginLeft:'1rem'}}>Cancel</button>
          </form>
        </main>
      )}
      {!showResetPassword && (
        <main className="main">
          <h1 className="headline">Welcome Home</h1>
          <p className="subheadline">Start writing your journal entries below.</p>
          <input
            type="text"
            placeholder="Title"
            value={journalTitle}
            onChange={e => setJournalTitle(e.target.value)}
            style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'1rem',width:'100%',maxWidth:'400px'}}
          />
          <br />
          <textarea
            className="journal-text"
            placeholder="Write your thoughts here..."
            value={journalEntry}
            onChange={e => setJournalEntry(e.target.value)}
            style={{marginBottom:'1rem',width:'100%',maxWidth:'400px',minHeight:'100px'}}
          />
          <br />
          <button className="btn glass" onClick={handleStart}>Save Entry</button>
          <div id="home-journal-list" className="journal-list">
            {journals.map(journal => (
              <div key={journal.id} className="journal-entry glass">
                <div className="timestamp">{new Date(journal.created_at).toLocaleString()}</div>
                <input
                  type="text"
                  value={journal.title}
                  placeholder="Title"
                  onChange={e => handleTextChange(journal.id, e.target.value, 'title')}
                  style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'0.5rem',width:'100%'}}
                />
                <textarea
                  className="journal-text"
                  placeholder="Write your thoughts here..."
                  value={journal.entry}
                  onChange={e => handleTextChange(journal.id, e.target.value, 'entry')}
                  style={{width:'100%',minHeight:'80px'}}
                />
              </div>
            ))}
          </div>
        </main>
      )}
    </>
  );
}

export default Home;
