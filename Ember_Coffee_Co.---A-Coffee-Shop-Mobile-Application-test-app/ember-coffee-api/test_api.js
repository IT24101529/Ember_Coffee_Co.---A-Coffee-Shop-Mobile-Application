async function test() {
  try {
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test History User',
        email: 'historytest23@ember.com',
        password: 'password123'
      })
    });
    const regData = await regRes.json();
    const token = regData.token;
    console.log('Got token:', token ? 'Yes' : 'No');
    
    // Now request history
    const histRes = await fetch('http://localhost:5000/api/rewards/history', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('History Status:', histRes.status);
    const histData = await histRes.text();
    console.log('History Data:', histData);
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}
test();
