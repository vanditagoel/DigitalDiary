import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import bcrypt from "bcryptjs";

function Home() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState([]);
  const [title, setTitle] = useState("");
  const [entry, setEntry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [expandedJournalId, setExpandedJournalId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    // Only run this logic if we're on the Home page
    if (window.location.pathname !== '/home') return;
    const email = localStorage.getItem("userEmail");
    if (!email) {
      navigate("/");
      return;
    }
    setUserEmail(email);
    fetchJournals(email);
    // Password modal logic: only show on first load if not authenticated
    const isAuth = localStorage.getItem('isAuthenticated');
    const pwd = localStorage.getItem('userPassword');
    if (!isAuth) {
      if (!pwd) {
        // Check Supabase for existing password for this user
        supabase.from('auth').select('password').eq('email', email).single().then(({ data, error }) => {
          if (data && data.password) {
            localStorage.setItem('userPassword', data.password);
            setShowSetPassword(false);
            setShowPasswordPrompt(true);
          } else {
            setShowSetPassword(true);
            setShowPasswordPrompt(false);
          }
        });
      } else {
        setShowSetPassword(false);
        setShowPasswordPrompt(true);
      }
    }
  }, [navigate]);

  const fetchJournals = async (email) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("journals")
      .select("id, title, entry, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false });
    if (error) setError("Failed to fetch journals");
    else setJournals(data || []);
    setLoading(false);
  };

  const handleAddJournal = async (e) => {
    e.preventDefault();
    if (!title || !entry) return;
    setLoading(true);
    const { error } = await supabase.from("journals").insert({
      title,
      entry,
      email: userEmail,
      created_at: new Date().toISOString(),
    });
    if (error) setError("Failed to add journal");
    setTitle("");
    setEntry("");
    fetchJournals(userEmail);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userPassword");
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  const handleSetPassword = async () => {
    if (password.length < 4) {
      alert('Password must be at least 4 characters.');
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userPassword', hashedPassword);
    if (userEmail) {
      await supabase.from('users').upsert({ email: userEmail, password: hashedPassword });
      await supabase.from('auth').upsert({ email: userEmail, password: hashedPassword });
      // Register user in Supabase Auth for password reset support
      await supabase.auth.signUp({ email: userEmail, password });
      localStorage.setItem('userEmail', userEmail);
    }
    setShowSetPassword(false);
    setShowPasswordPrompt(false);
    setPassword("");
  };

  const handlePasswordLogin = async () => {
    const storedPwd = localStorage.getItem('userPassword');
    if (!password) {
      alert('Please enter your password.');
      return;
    }
    if (storedPwd && await bcrypt.compare(password, storedPwd)) {
      localStorage.setItem('isAuthenticated', 'true');
      setShowPasswordPrompt(false);
    } else {
      alert('Incorrect password.');
    }
  };

  // Only show glassmorph effect/modal in Home page, not on Landing
  const isAuthenticated = localStorage.getItem('isAuthenticated');

  return (
    <div className={isAuthenticated ? 'main' : 'main glass-bg'}>
      <header className="header">
        <div className="logo">Loona</div>
        <div className="button-group">
          <button className="btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>
      <h1 className="headline">Hi, Love.</h1>
      {(!isAuthenticated && (showSetPassword || showPasswordPrompt)) && (
        <div className="glass-modal-overlay" style={{zIndex: 2000}}>
          <div className="glass-modal">
            {showSetPassword && (
              <>
                <button
                  className="back-arrow-btn"
                  onClick={() => navigate("/")}
                  aria-label="Back to landing"
                >
                  &#8592;
                </button>
                <h2 style={{marginTop:'0.5rem'}}>Set a Password</h2>
                <p style={{marginBottom:'1rem',color:'#ffe082'}}>For your privacy, set a password to unlock your journal.</p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter a password"
                  style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'1rem',width:'100%',maxWidth:'260px',background:'#232a34cc',color:'#ffe082'}}
                />
                <br />
                <button className="btn" onClick={handleSetPassword}>Set</button>
              </>
            )}
            {showPasswordPrompt && !showSetPassword && (
              <>
                <h2>Enter Password</h2>
                <p style={{marginBottom:'1rem',color:'#ffe082'}}>Enter password to access your Journal entries.</p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'1rem',width:'100%',maxWidth:'260px',background:'#232a34cc',color:'#ffe082'}}
                />
                <br />
                <div style={{display:'flex',justifyContent:'center',gap:'1rem',marginTop:'1.2rem'}}>
                  <button className="btn" onClick={handleLogout}>Logout</button>
                  <button className="btn" onClick={handlePasswordLogin}>Unlock</button>
                  <button className="btn" onClick={async()=>{
                    if (!userEmail) { alert('No user email found.'); return; }
                    // Use Supabase v2 resetPasswordForEmail
                    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo: window.location.origin + '/reset-password' });
                    if (error) alert('Failed to send reset email. Make sure your Supabase project has email auth enabled and SMTP is configured.');
                    else alert('Password reset email sent! Check your inbox and spam folder.');
                  }}>Reset</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {!showAddForm && (
        <button className="btn" style={{marginTop:'2.5rem', fontSize:'1.15rem', padding:'0.8rem 2.2rem'}} onClick={()=>setShowAddForm(true)}>Add Entry</button>
      )}
      {showAddForm && (
        <form onSubmit={handleAddJournal} style={{margin:'2.5rem auto', maxWidth:'540px', width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:'1.2rem'}}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{padding: "0.7rem", borderRadius: "0.5rem", border: "1px solid #393e4f", width:'100%', maxWidth:'420px', fontSize:'1.1rem', background:'#232a34cc', color:'#ffe082'}}
            autoFocus
          />
          <textarea
            placeholder="Write your entry..."
            value={entry}
            onChange={e => setEntry(e.target.value)}
            style={{padding: "0.7rem", borderRadius: "0.5rem", border: "1px solid #393e4f", width:'100%', maxWidth:'420px', minHeight:'120px', fontSize:'1.08rem', background:'#232a34cc', color:'#ffe082', resize:'vertical', boxSizing:'border-box'}}
            rows={Math.max(5, entry.split('\n').length)}
          />
          <div style={{display:'flex',gap:'1.2rem',marginTop:'0.5rem'}}>
            <button className="btn" type="submit" disabled={loading}>Save</button>
            <button className="btn" type="button" onClick={()=>{setShowAddForm(false);setTitle("");setEntry("");}}>Cancel</button>
          </div>
        </form>
      )}
      {loading && <p>Loading...</p>}
      {error && <p style={{color: "#ff6f6f"}}>{error}</p>}
      <div className="journal-list" style={{maxWidth:'540px', width:'100%', margin:'0 auto'}}>
        {journals.length === 0 && <p>No journal entries yet.</p>}
        {journals.map(journal => (
          <div key={journal.id} className={isAuthenticated ? '' : 'glass-modal'} style={{background: "rgba(35,42,52,0.85)", margin: "1rem 0", padding: "1rem", borderRadius: "0.7rem", boxShadow: "0 2px 8px #0004", width:'100%'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}} onClick={() => setExpandedJournalId(expandedJournalId === journal.id ? null : journal.id)}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',width:'90%'}}>
                <h3 style={{color: "#ffe082", margin:0, fontWeight:300, fontSize:'1.08rem', letterSpacing:'0.01em'}}>{journal.title}</h3>
                <span style={{fontSize:'0.98rem', color:'#e0cfa9', fontWeight:300, marginTop:'0.1rem'}}>{new Date(journal.created_at).toLocaleDateString()}</span>
              </div>
              <span style={{fontSize:'0.95rem',color:'#ffe082',transition:'transform 0.2s',fontWeight:200,transform: expandedJournalId === journal.id ? 'rotate(90deg)' : 'rotate(0deg)'}}>&#9654;</span>
            </div>
            {expandedJournalId === journal.id && (
              <div style={{color: "#e0cfa9", marginTop: "1rem", textAlign:'left'}}>{journal.entry}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
