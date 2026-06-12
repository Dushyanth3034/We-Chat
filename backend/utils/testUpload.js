const fs = require('fs');
const path = require('path');

async function test() {
  try {
    console.log('1. Attempting login as alice@wechat.com...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@wechat.com', password: 'password123' })
    });
    
    if (!loginRes.ok) {
      const errText = await loginRes.text();
      console.error('Login failed:', errText);
      return;
    }
    
    const { token } = await loginRes.json();
    console.log('Login successful. Token obtained.');

    const dummyFilePath = path.join(__dirname, 'dummy.png');
    fs.writeFileSync(dummyFilePath, 'dummy image content');

    console.log('2. Sending message with dummy.png...');
    const formData = new FormData();
    formData.append('receiverId', '2'); // Bob's ID is 2
    formData.append('message', 'Hello Bob, check this out!');
    
    const fileBuffer = fs.readFileSync(dummyFilePath);
    const fileBlob = new Blob([fileBuffer], { type: 'image/png' });
    formData.append('file', fileBlob, 'dummy.png');

    const uploadRes = await fetch('http://localhost:5000/api/chats/message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log('3. Server Response Status:', uploadRes.status);
    const resData = await uploadRes.json();
    console.log('Server Response Data:', JSON.stringify(resData, null, 2));

    fs.unlinkSync(dummyFilePath);
  } catch (err) {
    console.error('Test error encountered:', err.message);
  }
}

test();
