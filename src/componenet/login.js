import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";
import logo from '../image/mutkehostel.png'
import { requestSaasLoginEmailCode, resendSaasLoginEmailCode, verifySaasLoginEmailCode } from "../saasApi";
import '../stylecss/LoginRegister.css';

const FormPage = () => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Register
  const navigate = useNavigate();

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginChallengeId, setLoginChallengeId] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginMaskedEmail, setLoginMaskedEmail] = useState('');
  const [loginMessage, setLoginMessage] = useState('');

  // Register State
  const [username, setUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');

  // Handle Login
 const handleLogin = async (e) => {
  e.preventDefault();

  try {
    setLoginMessage("");

    const data = await requestSaasLoginEmailCode(loginEmail.trim());
    setLoginChallengeId(data.challengeId);
    setLoginMaskedEmail(data.email || "your registered email");
    setLoginCode('');
  } catch (error) {
    console.error("Login failed:", error);

    setLoginMessage(
      error.response?.data?.message ||
        "Unable to send the OTP. Please check your email address."
    );
  }
};

 const handleVerifyLoginCode = async (e) => {
  e.preventDefault();
  if (!/^\d{6}$/.test(loginCode)) {
    setLoginMessage("Enter the 6-digit code sent to your email.");
    return;
  }
  try {
    setLoginMessage("");
    const data = await verifySaasLoginEmailCode(loginChallengeId, loginCode);
    const role = data?.user?.role;
    navigate(role === "superadmin" ? "/superadmin" : "/admin");
  } catch (error) {
    setLoginMessage(error.response?.data?.message || "Unable to verify the OTP. Please try again.");
  }
 };

 const handleResendLoginCode = async () => {
  try {
    setLoginMessage("");
    const data = await resendSaasLoginEmailCode(loginChallengeId);
    setLoginMaskedEmail(data.email || loginMaskedEmail);
    setLoginCode("");
  } catch (error) {
    setLoginMessage(error.response?.data?.message || "Unable to resend the OTP. Please try again.");
  }
 };

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('    http://localhost:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: registerEmail, password: registerPassword }),
      });

      const data = await response.json();
      if (response.ok) {
        setRegisterMessage('Registration successful! Please log in.');
        setIsLogin(true); // Redirect to login
      } else {
        setRegisterMessage(data.message || 'Registration failed.');
      }
    } catch (error) {
      setRegisterMessage('An error occurred. Please try again.');
    }
  };
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-12 mt-0 d-flex">
        <img src={logo} alt="logo" style={{ height: '80px' }} />
         
        </div>
      </div>

      <div className="container">
  <center>
    
    <div className="auth-box" style={{ maxWidth: '600px', marginTop: '50px' }}>
      {isLogin ? (
        <>
          <h1
            style={{
              color: '#2c3e50',
              fontSize: '53px',
              marginBottom: '30px',
              fontWeight: '800',
            }}
          >
            Hos<span style={{color:'#de698c'}}>tel</span> Paym<span style={{color:'#de698c'}}>ent</span> <span style={{color:'#de698c'}}>Man</span>agement <span style={{color:'#de698c'}}>Sys</span>tem
          </h1>
          <form
            onSubmit={loginChallengeId ? handleVerifyLoginCode : handleLogin}
            className="w-75"
            style={{
              border: '2px solid #2c3e50',
              padding: '20px',
              borderRadius: '8px',
            }}
          >
            <div className="form-group text-start">
              <label>{loginChallengeId ? "Email OTP:" : "Email address:"}</label>
              <div className="input-group">
              <input
                type={loginChallengeId ? "text" : "email"}
                className="form-control"
                placeholder={loginChallengeId ? `OTP sent to ${loginMaskedEmail}` : "Enter registered email"}
                value={loginChallengeId ? loginCode : loginEmail}
                onChange={(e) => loginChallengeId
                  ? setLoginCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  : setLoginEmail(e.target.value)}
                inputMode={loginChallengeId ? "numeric" : undefined}
                maxLength={loginChallengeId ? 6 : undefined}
                required
              />
               <span className="input-group-text">
                  <FaUser /> {/* Username Icon */}
                </span>
            </div>
            </div>
            <button type="submit" className="back-btn btn">
              {loginChallengeId ? "Verify OTP" : "Send OTP"}
            </button>
            {loginMessage && <p className="text-danger">{loginMessage}</p>}
            {loginChallengeId && <div className="mt-3 d-flex gap-3 justify-content-center">
              <button type="button" className="btn btn-link p-0" onClick={handleResendLoginCode}>Resend OTP</button>
              <button type="button" className="btn btn-link p-0" onClick={() => { setLoginChallengeId(''); setLoginCode(''); setLoginMessage(''); }}>Use another email</button>
            </div>}
          </form>
        </>
      ) : (
        <>
        <h1
            style={{
              color: '#2c3e50',
              fontSize: '53px',
              marginBottom: '30px',
              fontWeight: '800',
            }}
          >
            Hos<span style={{color:'#de698c'}}>tel</span> Paym<span style={{color:'#de698c'}}>ent</span> <span style={{color:'#de698c'}}>Man</span>agement <span style={{color:'#de698c'}}>Sys</span>tem
          </h1>
          <h1 style={{ color: 'BLACK' }}>REGISTER <FontAwesomeIcon icon={faUserPlus} />:</h1>
          <form
            onSubmit={handleRegister}
            className="w-75"
            style={{
              border: '2px solid black',
              padding: '20px',
              borderRadius: '8px',
            }}
          >
            <div className="form-group text-start">
              <label>Username</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group text-start">
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group text-start">
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="back-btn btn btn-primary">
              Register
            </button>
            {registerMessage && <p className="text-danger">{registerMessage}</p>}
          </form>
        </>
      )}
      <p>
        {isLogin ? "Don't have an account?" : 'Already have an account?'}
        <button
          className="btn btn-link"
          onClick={() => setIsLogin(!isLogin)}
          style={{ textDecoration: 'none', paddingLeft: '5px' }}
        >
          {isLogin ? 'Register here' : 'Login here'}
        </button>
      </p>
    </div>
  </center>
</div>
    </div>
  );
};

export default FormPage;
