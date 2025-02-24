import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyLPg3mbTjKXfx_44iB8JyQXzFURX33bs",
  authDomain: "auth-airember.firebaseapp.com",
  projectId: "auth-airember",
  storageBucket: "auth-airember.firebasestorage.app",
  messagingSenderId: "232838222436",
  appId: "1:232838222436:web:1faf1906c0fadeb0ca4571"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

console.log('We made it bro');

const au = getAuth();
const dbs = getFirestore();

async function fetchProtectedData(url) {
  const token = localStorage.getItem('tokeen'); // Retrieve the token from localStorage
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Set the Authorization header with the token
    }
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Protected data:', data);
  } else {
    console.error('Failed to fetch protected data');
  }
}

// Example usage:
fetchProtectedData('http://localhost:3000/service');

// In your secure.html, other functions can use fetchProtectedData:
async function stripeIt(sid) {
  try {
    await fetchProtectedData(`https://aaronandemberbe.onrender.com/service/${sid}`);
    // Handle the fetched data
  } catch (error) {
    console.error('Error:', error);
  }
}

async function getInvoices(sid) {
  try {
    await fetchProtectedData(`https://aaronandemberbe.onrender.com/service/invoices/${sid}`);
    // Handle the fetched data
  } catch (error) {
    console.error('Error:', error);
  }
}

onAuthStateChanged(au, (user) => {
  const inUID = localStorage.getItem('loggedInUserID');
  
  if (inUID) {
    const docRef = doc(dbs, "users", inUID);
    getDoc(docRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          console.log(userData);
          if (userData) {
            localStorage.setItem('sid', userData.stripeID);
            const placement = document.getElementById('clientInfo');
            placement.innerHTML = `
              <h1>Welcome ${userData.fname} </h1>
              <hr>
              <p>First Name: ${userData.fname}</p>
              <p>Last Name: ${userData.lname}</p>
              <p>Email: ${userData.email}</p>
              <p>Phone: ${userData.phone}</p>
            `;
            stripeIt(userData.stripeID);
            getInvoices(userData.stripeID);
          }
        } else {
          console.log('No doc found matching ID.');
        }
      }).catch((error) => {
        console.log(error);
      });
  } else {
    console.log('No inUID');
  }
});

function onLogout() {
  localStorage.removeItem('loggedInUserID');
  localStorage.clear();
  sessionStorage.clear();
  signOut(au)
    .then(() => {
      console.log('Signed out');
      window.location.href = 'login.html';
    }).catch((error) => {
      console.log('Error signing out: ', error);
    });
}

const logoutButton = document.getElementById('logoutButton');
logoutButton.addEventListener('click', onLogout);
