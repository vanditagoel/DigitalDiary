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
  const [expandedJournalId, setExpandedJournalId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [passwordModal, setPasswordModal] = useState(true);
  const [setPasswordMode, setSetPasswordMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    (async () => {
      // Check Supabase Auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user || !session.user.email) {
        navigate("/");
        return;
      }
      setUserEmail(session.user.email);
      // Check for password row in journal_passwords
      const { data, error } = await supabase
        .from("journal_passwords")
        .select("password_hash")
        .eq("email", session.user.email)
        .single();
      if (!data || error) {
        setSetPasswordMode(true);
        setPasswordModal(true);
      } else {
        setSetPasswordMode(false);
        setPasswordModal(true);
      }
    })();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Password modal logic
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!passwordInput || passwordInput.length < 4) {
      setPasswordError("Password must be at least 4 characters.");
      return;
    }
    const hash = await bcrypt.hash(passwordInput, 10);
    const { error } = await supabase.from("journal_passwords").insert({
      email: userEmail,
      password_hash: hash,
    });
    if (error) {
      setPasswordError("Failed to set password.");
      return;
    }
    setPasswordModal(false);
    setPasswordInput("");
    setPasswordError("");
    fetchJournals(userEmail);
  };

  const handleEnterPassword = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from("journal_passwords")
      .select("password_hash")
      .eq("email", userEmail)
      .single();
    if (error || !data) {
      setPasswordError("Password not set. Please set a password.");
      setSetPasswordMode(true);
      return;
    }
    const match = await bcrypt.compare(passwordInput, data.password_hash);
    if (!match) {
      setPasswordError("Incorrect password.");
      return;
    }
    setPasswordModal(false);
    setPasswordInput("");
    setPasswordError("");
    fetchJournals(userEmail);
  };

  return (
    <div className='main'>
      <header className="header">
        <div className="logo">Loona</div>
        <div className="button-group">
          <button className="btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>
      <h1 className="headline">Hi, Love.</h1>
      {passwordModal && (
        <div className="glass-modal-overlay" style={{zIndex: 2000}}>
          <div className="glass-modal">
            {setPasswordMode ? (
              <>
                <button
                  className="back-arrow-btn"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/");
                  }}
                  aria-label="Back to landing"
                >
                  &#8592;
                </button>
                <h2 style={{marginTop:'0.5rem'}}>Set a Password</h2>
                <p style={{marginBottom:'1rem',color:'#ffe082'}}>For your privacy, set a password to your journal.</p>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Enter a password"
                  style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'1rem',width:'100%',maxWidth:'260px',background:'#232a34cc',color:'#ffe082'}}
                />
                <br />
                <button className="btn" onClick={handleSetPassword}>Set</button>
                {passwordError && <div style={{color:'#ff6f6f',fontSize:'1rem',marginTop:'0.5rem'}}>{passwordError}</div>}
              </>
            ) : (
              <>
                <h2>Enter Password</h2>
                <p style={{marginBottom:'1rem',color:'#ffe082'}}>Enter password to access your Journal entries.</p>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Enter your password"
                  style={{padding:'0.5rem',borderRadius:'0.5rem',border:'1px solid #393e4f',marginBottom:'1rem',width:'100%',maxWidth:'260px',background:'#232a34cc',color:'#ffe082'}}
                />
                <br />
                <div style={{display:'flex',justifyContent:'center',gap:'1rem',marginTop:'1.2rem'}}>
                  <button className="btn" onClick={handleLogout}>Logout</button>
                  <button className="btn" onClick={handleEnterPassword}>Unlock</button>
                  <button className="btn" onClick={async()=>{
                    if (!userEmail) { alert('No user email found.'); return; }
                    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo: window.location.origin + '/reset-password' });
                    if (error) alert('Failed to send reset email. Make sure your Supabase project has email auth enabled and SMTP is configured.');
                    else alert('Password reset email sent! Check your inbox and spam folder.');
                  }}>Reset</button>
                </div>
                {passwordError && <div style={{color:'#ff6f6f',fontSize:'1rem',marginTop:'0.5rem'}}>{passwordError}</div>}
              </>
            )}
          </div>
        </div>
      )}
      {!passwordModal && (
        <>
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
              <div key={journal.id} className={'glass-modal'} style={{background: "rgba(35,42,52,0.85)", margin: "1rem 0", padding: "1rem", borderRadius: "0.7rem", boxShadow: "0 2px 8px #0004", width:'100%'}}>
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
        </>
      )}
    </div>
  );
}

export default Home;