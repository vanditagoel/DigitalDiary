import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import bcrypt from "bcryptjs";
import { FiMoreVertical } from "react-icons/fi";

function Home() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState([]); // List of journal entries
  const [title, setTitle] = useState(""); // New journal title
  const [entry, setEntry] = useState(""); // New journal entry text
  const [loading, setLoading] = useState(false); // Loading state for async actions
  const [error, setError] = useState(""); // Error message
  const [userEmail, setUserEmail] = useState(""); // Authenticated user's email
  const [expandedJournalId, setExpandedJournalId] = useState(null); // Which journal is expanded
  const [showAddForm, setShowAddForm] = useState(false); // Show/hide add entry form
  // Password modal state
  const [passwordModal, setPasswordModal] = useState(true); // Show/hide password modal
  const [setPasswordMode, setSetPasswordMode] = useState(false); // True if user needs to set password
  const [passwordInput, setPasswordInput] = useState(""); // Password input value
  const [passwordError, setPasswordError] = useState(""); // Password error message
  // Add state for menu and edit/delete
  const [menuOpenId, setMenuOpenId] = useState(null); // Which journal's menu is open
  const [editId, setEditId] = useState(null); // Which journal is being edited
  const [editTitle, setEditTitle] = useState(""); // Edit form title
  const [editEntry, setEditEntry] = useState(""); // Edit form entry
  const [deleteId, setDeleteId] = useState(null); // Which journal is being deleted
  // Search bar state
  const [showSearch, setShowSearch] = useState(false); // Show/hide search bar
  const [searchTerm, setSearchTerm] = useState(""); // Search input value

  // On mount, check Supabase Auth session and password setup
  useEffect(() => {
    (async () => {
      // Check Supabase Auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user || !session.user.email) {
        navigate("/"); // Redirect to landing if not logged in
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
        setSetPasswordMode(true); // Prompt to set password
        setPasswordModal(true);
      } else {
        setSetPasswordMode(false); // Prompt to enter password
        setPasswordModal(true);
      }
    })();
  }, [navigate]);

  // Fetch all journals for the user
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

  // Add a new journal entry
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

  // Log out the user
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Set a new password for the journal
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

  // Enter password to unlock journals
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

  // Filtered journals based on search
  const filteredJournals = journals.filter(journal => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    // Check title, entry, or date
    return (
      journal.title.toLowerCase().includes(lower) ||
      journal.entry.toLowerCase().includes(lower) ||
      new Date(journal.created_at).toLocaleDateString().includes(lower)
    );
  });

  // Render UI
  return (
    <div className='main'>
      {/* Header with logo and logout button */}
      <header className="header">
        <div className="logo">Loona</div>
        <div className="button-group">
          <button className="btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>
      <h1 className="headline">Hi, Love.</h1>
      {/* Password modal for setting or entering password */}
      {passwordModal && (
        <div className="glass-modal-overlay" style={{zIndex: 2000}}>
          <div className="glass-modal">
            {setPasswordMode ? (
              <>
                {/* Set password mode */}
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
                {/* Enter password mode */}
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
                  {/* <button className="btn" onClick={async()=>{
                    if (!userEmail) { alert('No user email found.'); return; }
                    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo: window.location.origin + '/reset-password' });
                    if (error) alert('Failed to send reset email. Make sure your Supabase project has email auth enabled and SMTP is configured.');
                    else alert('Password reset email sent! Check your inbox and spam folder.');
                  }}>Reset</button> */}
                  <button className="btn" onClick={()=>alert('oopsiedaisies! reset password is not functional yet. Come later <3')}>Reset</button>
                </div>
                {passwordError && <div style={{color:'#ff6f6f',fontSize:'1rem',marginTop:'0.5rem'}}>{passwordError}</div>}
              </>
            )}
          </div>
        </div>
      )}
      {/* Main journal UI after password unlock */}
      {!passwordModal && (
        <>
          {/* Search bar and Add Entry button */}
          <div style={{position:'relative',maxWidth:'540px',margin:'0 auto',display:'flex',flexDirection:'column',alignItems:'center'}}>
            {/* Animated search bar */}
            <div
              style={{
                width: showSearch ? '100%' : 0,
                maxWidth: showSearch ? '420px' : 0,
                opacity: showSearch ? 1 : 0,
                height: showSearch ? '48px' : 0,
                overflow: 'hidden',
                transition: 'all 0.35s cubic-bezier(.77,0,.18,1)',
                marginBottom: showSearch ? '1.2rem' : 0,
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(35,42,52,0.85)',
                borderRadius: '0.7rem',
                boxShadow: showSearch ? '0 2px 8px #0004' : 'none',
                border: showSearch ? '1px solid #393e4f' : 'none',
                padding: showSearch ? '0.5rem 1rem' : 0,
                zIndex: 2,
              }}
            >
              <input
                type="text"
                placeholder="Search by keyword or date..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffe082',
                  fontSize: '1.08rem',
                  transition: 'width 0.3s',
                }}
                autoFocus={showSearch}
              />
              {searchTerm && (
                <button
                  style={{background:'none',border:'none',color:'#ffe082',cursor:'pointer',marginLeft:'0.5rem',fontSize:'1.2rem'}}
                  onClick={()=>setSearchTerm("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            {/* Add Entry button and search icon */}
            <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'0.7rem',marginTop:'2.5rem',position:'relative'}}>
              {!showAddForm && (
                <button className="btn" style={{fontSize:'1.15rem', padding:'0.8rem 2.2rem'}} onClick={()=>setShowAddForm(true)}>Add Entry</button>
              )}
              {/* Search icon */}
              <button
                className="btn"
                style={{background:'none',border:'none',boxShadow:'none',padding:'0.7rem',marginLeft:'0.2rem',display:'flex',alignItems:'center',justifyContent:'center'}}
                onClick={()=>setShowSearch(v=>!v)}
                aria-label="Search entries"
              >
                <svg width="24" height="24" fill="none" stroke="#ffe082" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            </div>
          </div>
          {/* Add Entry form */}
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
          {/* Loading and error messages */}
          {loading && <p>Loading...</p>}
          {error && <p style={{color: "#ff6f6f"}}>{error}</p>}
          {/* Journal entries list */}
          <div className="journal-list" style={{maxWidth:'540px', width:'100%', margin:'0 auto'}}>
            {filteredJournals.length === 0 && <p>No journal entries yet.</p>}
            {filteredJournals.map(journal => (
              <div key={journal.id} className={'glass-modal'} style={{background: "rgba(35,42,52,0.85)", margin: "1rem 0", padding: "1rem", borderRadius: "0.7rem", boxShadow: "0 2px 8px #0004", width:'100%', position:'relative'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',width:'90%'}} onClick={() => setExpandedJournalId(expandedJournalId === journal.id ? null : journal.id)}>
                    <h3 style={{color: "#ffe082", margin:0, fontWeight:300, fontSize:'1.08rem', letterSpacing:'0.01em'}}>{journal.title}</h3>
                    <span style={{fontSize:'0.98rem', color:'#e0cfa9', fontWeight:300, marginTop:'0.1rem'}}>{new Date(journal.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{position:'relative'}}>
                    <button
                      style={{background:'none',border:'none',cursor:'pointer',padding:'0.2rem',borderRadius:'50%'}}
                      onClick={e => {e.stopPropagation(); setMenuOpenId(menuOpenId === journal.id ? null : journal.id);}}>
                      <FiMoreVertical size={22} color="#ffe082" />
                    </button>
                    {menuOpenId === journal.id && (
                      <div style={{position:'absolute',top:'2.2rem',right:0,background:'#232a34ee',borderRadius:'0.5rem',boxShadow:'0 2px 8px #0006',zIndex:10,minWidth:'110px',padding:'0.5rem 0'}}>
                        <button style={{display:'block',width:'100%',background:'none',border:'none',color:'#ffe082',padding:'0.5rem 1rem',textAlign:'left',cursor:'pointer'}} onClick={() => {
                          setEditId(journal.id);
                          setEditTitle(journal.title);
                          setEditEntry(journal.entry);
                          setMenuOpenId(null);
                        }}>Edit</button>
                        <button style={{display:'block',width:'100%',background:'none',border:'none',color:'#ff6f6f',padding:'0.5rem 1rem',textAlign:'left',cursor:'pointer'}} onClick={() => {
                          setDeleteId(journal.id);
                          setMenuOpenId(null);
                        }}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Inline edit form */}
                {editId === journal.id ? (
                  <form onSubmit={async e => {
                    e.preventDefault();
                    setLoading(true);
                    const { error } = await supabase.from("journals").update({ title: editTitle, entry: editEntry }).eq("id", journal.id);
                    if (error) setError("Failed to update journal");
                    else {
                      setJournals(journals.map(j => j.id === journal.id ? { ...j, title: editTitle, entry: editEntry } : j));
                      setEditId(null);
                    }
                    setLoading(false);
                  }} style={{marginTop:'1rem',display:'flex',flexDirection:'column',gap:'0.7rem'}}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      style={{padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #393e4f", width:'100%', fontSize:'1.05rem', background:'#232a34cc', color:'#ffe082'}}
                    />
                    <textarea
                      value={editEntry}
                      onChange={e => setEditEntry(e.target.value)}
                      style={{padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #393e4f", width:'100%', minHeight:'80px', fontSize:'1.03rem', background:'#232a34cc', color:'#ffe082', resize:'vertical'}}
                    />
                    <div style={{display:'flex',gap:'1rem'}}>
                      <button className="btn" type="submit" disabled={loading}>Save</button>
                      <button className="btn" type="button" onClick={()=>setEditId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : expandedJournalId === journal.id && (
                  <div style={{color: "#e0cfa9", marginTop: "1rem", textAlign:'left'}}>{journal.entry}</div>
                )}
              </div>
            ))}
          </div>
          {/* Glassmorph delete confirmation modal */}
          {deleteId && (
            <div className="glass-modal-overlay" style={{zIndex:9999, position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(20,22,30,0.65)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div className="glass-modal" style={{maxWidth:'340px',textAlign:'center',zIndex:10000, position:'relative'}}>
                <h3 style={{color:'#ffe082',marginBottom:'1rem'}}>Delete Entry?</h3>
                <p style={{color:'#e0cfa9',marginBottom:'1.5rem'}}>Are you sure you want to delete this journal entry? This action cannot be undone.</p>
                <div style={{display:'flex',justifyContent:'center',gap:'1.5rem'}}>
                  <button className="btn" style={{background:'#393e4f'}} onClick={()=>setDeleteId(null)}>Cancel</button>
                  <button className="btn" style={{background:'#ff6f6f',color:'#fff'}} onClick={async()=>{
                    setLoading(true);
                    const { error } = await supabase.from("journals").delete().eq("id", deleteId);
                    if (error) setError("Failed to delete journal");
                    else setJournals(journals.filter(j => j.id !== deleteId));
                    setDeleteId(null);
                    setLoading(false);
                  }}>Delete</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;