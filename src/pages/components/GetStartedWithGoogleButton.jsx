import React from "react";
import GoogleIcon from "./Google.png";

function GetStartedWithGoogleButton({ onClick }) {
  return (
    <button className="btn glass google-btn" onClick={onClick}>
      <img src={GoogleIcon} alt="Google logo" style={{width:'1.4rem',height:'1.4rem',marginRight:'0.5rem',verticalAlign:'middle',borderRadius:'0.2rem',background:'transparent'}} />
      <span style={{fontWeight:600,letterSpacing:'0.01em'}}>Get Started with Google</span>
    </button>
  );
}

export default GetStartedWithGoogleButton;
