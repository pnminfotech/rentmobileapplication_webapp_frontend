import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../stylecss/LoginRegister.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('    http://localhost:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/login'); // Redirect to login page
      } else {
        setMessage(data.message || 'Registration failed');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
   <>
    <center>
    
    <form onSubmit={handleRegister} className='w-75' style={{ border: '2px solid black', padding: '20px', borderRadius: '8px' }}>
        
    <div class="form-group">
<label for="exampleInputUsername1">Username</label>
<input type="text" class="form-control" id="exampleInputEmail1"  placeholder="Username"  value={username}
            onChange={(e) => setUsername(e.target.value)}
            required/>
{/* <small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small> */}
</div>
<div class="form-group">
<label for="exampleInputEmail1">Email address</label>
<input type="email" class="form-control"   onChange={(e) => setEmail(e.target.value)} placeholder="Enter email"/>
{/* <small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small> */}
</div>
<div class="form-group">
<label for="exampleInputPassword1">Password</label>
<input type="password" class="form-control" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" required  />
</div>

<button type="submit" class="btn btn-primary">Register</button>
{message && <p>{message}</p>}

</form> </center>
   </>
  );
};

export default Register;
