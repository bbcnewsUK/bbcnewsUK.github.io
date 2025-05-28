// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyASICdqWjF3bzvtwASwCIXVe0AUfoUeTqU",
  authDomain: "castclick-cdfeb.firebaseapp.com",
  projectId: "castclick-cdfeb",
  storageBucket: "castclick-cdfeb.firebasestorage.app",
  messagingSenderId: "578052056343",
  appId: "1:578052056343:web:1042963805caa11f360352"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let xp = 0;
let refEarn = 0;
let taskClicks = { twitter: 0, telegram: 0, farcaster: 0 };
let isRegistered = false;
let userId = null;
let username = 'User';

async function registerWithFarcaster() {
  // Simulate Farcaster registration
  userId = `fid_${Math.random().toString(36).substring(7)}`;
  username = `@user_${userId}`;
  const userData = {
    fid: userId,
    username: username,
    xp: 0,
    refCount: 0,
    referralCode: userId
  };

  try {
    await db.collection('users').doc(userId).set(userData);
    isRegistered = true;
    localStorage.setItem('userId', userId);
    document.getElementById('username').innerText = username;
    document.getElementById('headerUsername').innerText = username;
    document.getElementById('registerPopup').classList.add('hidden');
    document.getElementById('navBar').classList.remove('hidden');
    document.getElementById('profileBtn').style.display = 'flex';
    document.getElementById('referralLink').innerText = `${window.location.origin}?ref=${userId}`;
    showPage('earn');
    updateLeaderboard();
    trackReferral();
  } catch (err) {
    console.error('Registration error:', err);
    alert('Registration failed. Please try again.');
  }
}

function logout() {
  isRegistered = false;
  userId = null;
  localStorage.removeItem('userId');
  document.getElementById('registerPopup').classList.remove('hidden');
  document.getElementById('navBar').classList.add('hidden');
  document.getElementById('profileBtn').style.display = 'none';
  document.getElementById('username').innerText = 'User';
  document.getElementById('headerUsername').innerText = 'User';
  document.getElementById('xp').innerText = '0';
  document.getElementById('profileBalance').innerText = '0';
  document.getElementById('profileReferrals').innerText = '0';
  document.getElementById('refEarn').innerText = '0';
  showPage('earn');
}

async function incrementXP() {
  if (!isRegistered) {
    document.getElementById('registerPopup').classList.remove('hidden');
    return;
  }
  xp++;
  try {
    await db.collection('users').doc(userId).update({ xp });
    document.getElementById('xp').innerText = xp;
    document.getElementById('profileBalance').innerText = xp;
    updateLeaderboard();
  } catch (err) {
    console.error('XP update error:', err);
  }
}

function showPage(id) {
  if (!isRegistered && id !== 'earn') {
    document.getElementById('registerPopup').classList.remove('hidden');
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function trackTask(name) {
  if (!isRegistered) {
    document.getElementById('registerPopup').classList.remove('hidden');
    return;
  }
  taskClicks[name]++;
  if (taskClicks.twitter >= 1 && taskClicks.telegram >= 1 && taskClicks.farcaster >= 1 && 
      (taskClicks.twitter + taskClicks.telegram + taskClicks.farcaster) >= 3) {
    document.getElementById('claimTask').style.display = 'inline-block';
  }
}

async function claimTask() {
  if (!isRegistered) {
    document.getElementById('registerPopup').classList.remove('hidden');
    return;
  }
  xp += 50;
  try {
    await db.collection('users').doc(userId).update({ xp });
    document.getElementById('xp').innerText = xp;
    document.getElementById('profileBalance').innerText = xp;
    document.getElementById('claimTask').innerText = 'Claimed!';
    document.getElementById('claimTask').disabled = true;
    updateLeaderboard();
  } catch (err) {
    console.error('Task claim error:', err);
  }
}

function copyReferralLink() {
  const referralLink = document.getElementById('referralLink').innerText;
  navigator.clipboard.writeText(referralLink).then(() => {
    alert('Referral link copied to clipboard!');
  });
}

function updateLeaderboard() {
  db.collection('users')
    .orderBy('xp', 'desc')
    .limit(20)
    .onSnapshot((snapshot) => {
      const leaderboardData = snapshot.docs.map((doc, index) => ({
        number: index + 1,
        username: doc.data().username,
        balance: doc.data().xp
      }));
      const table = document.getElementById('leaderboardTable');
      table.innerHTML = `
        <tr>
          <th>Number</th>
          <th>Username</th>
          <th>Balance</th>
        </tr>
        ${leaderboardData.map(row => `
          <tr>
            <td>${row.number}</td>
            <td>${row.username}</td>
            <td>${row.balance} CAST</td>
          </tr>
        `).join('')}
      `;
    }, (err) => {
      console.error('Leaderboard error:', err);
    });
}

async function trackReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode && userId && refCode !== userId) {
    try {
      const refDoc = await db.collection('users').doc(refCode).get();
      if (refDoc.exists) {
        const refCount = (refDoc.data().refCount || 0) + 1;
        const refXP = (refDoc.data().xp || 0) + 25;
        await db.collection('users').doc(refCode).update({
          refCount: refCount,
          xp: refXP
        });
        refEarn = refCount * 25;
        document.getElementById('refEarn').innerText = refEarn;
        document.getElementById('profileReferrals').innerText = refCount;
        document.getElementById('refList').innerHTML = Array(refCount).fill().map((_, i) => `<li>@ref${i + 1}</li>`).join('');
      }
    } catch (err) {
      console.error('Referral tracking error:', err);
    }
  }
}

// Auto-login if session exists
window.onload = async () => {
  const storedUserId = localStorage.getItem('userId');
  if (storedUserId) {
    try {
      const userDoc = await db.collection('users').doc(storedUserId).get();
      if (userDoc.exists) {
        const user = userDoc.data();
        isRegistered = true;
        userId = storedUserId;
        username = user.username;
        xp = user.xp;
        refEarn = (user.refCount || 0) * 25;
        document.getElementById('username').innerText = username;
        document.getElementById('headerUsername').innerText = username;
        document.getElementById('xp').innerText = xp;
        document.getElementById('profileBalance').innerText = xp;
        document.getElementById('profileReferrals').innerText = user.refCount || 0;
        document.getElementById('refEarn').innerText = refEarn;
        document.getElementById('referralLink').innerText = `${window.location.origin}?ref=${user.referralCode}`;
        document.getElementById('registerPopup').classList.add('hidden');
        document.getElementById('navBar').classList.remove('hidden');
        document.getElementById('profileBtn').style.display = 'flex';
        showPage('earn');
        updateLeaderboard();
        trackReferral();
      }
    } catch (err) {
      console.error('Auto-login error:', err);
    }
  }
};