import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore, getDoc,  doc} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";


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

  onAuthStateChanged(au, (user) => {
    const inUID = localStorage.getItem('loggedInUserID');
    if(inUID) {
        const docRef = doc(dbs, "users", inUID);
        getDoc(docRef)
            .then((docSnap) => {
                if(docSnap.exists()) {
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
                    }

                } else {
                    console.log('No doc found matching ID.')
                }
            }).catch((error) => {
                console.log(error);
            })
    } else {
        console.log('No inUID');
    }
  })


  function stripeIt(sid) {
    fetch(`https://aaronandemberbe.onrender.com/service/${sid}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        let messageCont = document.getElementById('message');
    
        console.log(data);
    
        let customer = data;
        let card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${customer.name}</h3>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Phone:</strong> ${customer.phone}</p>
            <p><strong>Address:</strong> ${customer.address.line1}, ${customer.address.city}, ${customer.address.state} ${customer.address.postal_code}, ${customer.address.country}</p>
            <p><strong>Description:</strong> ${customer.description}</p>
            <p><strong>Balance:</strong> ${customer.currency.toUpperCase()} ${customer.balance}</p>
        `;
        messageCont.appendChild(card);
        }
    )
    .catch(error => {
        console.error('Error:', error);
    });
    
  }

  function onLogout() {
    localStorage.removeItem('loggedInUserID');
    localStorage.clear();
    sessionStorage.clear();
    signOut(au)
    .then (() => {
        console.log('Signed out')
        signOut(au);
        window.location.href='login.html';
    }) .catch((error) => {
        console.log('Error signing out: ', error);
    })
  }

  const logoutButton = document.getElementById('logoutButton');
  
  logoutButton.addEventListener('click', onLogout);

  