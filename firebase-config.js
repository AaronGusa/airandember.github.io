console.log('We made it sis');

  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
  import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
  import { getFirestore, setDoc,  doc} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
  import 'dotenv/config';
  
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: process.env.apiKey,
    authDomain: process.env.authDomain,
    projectId: process.env.projectId,
    storageBucket: process.env.storageBucket,
    messagingSenderId: process.env.messagingSenderId,
    appId: process.env.appId
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);


  console.log('We made it bro');

  function showMessage( message, divId) {
    let messageDiv = document.getElementById(divId);
    messageDiv.style.display = 'block';
    messageDiv.innerHTML = message;
    messageDiv.style.opacity = 1;
    setTimeout(function() {
      messageDiv.style.opacity = 0;
    }, 5000);
  }

 const signIn = document.getElementById('signIn');
 
 signIn.addEventListener('click', (event) => {
  console.log("We're logging in");
  event.preventDefault();
  const email = document.getElementById('email').value;
  const pass = document.getElementById('password').value;
  const auth = getAuth();

  signInWithEmailAndPassword(auth, email, pass)
    .then(async  (userCredential) => {
      showMessage('login is successful', 'loginMessage');
      const user=userCredential.user;
      const token = await user.getIdToken();
      localStorage.setItem('loggedInUserID', user.uid);
      localStorage.setItem('tokeen', token);
      window.location.href='secure.html';
    })
    .catch((error) => {
      const errorCode = error.code;
      if(errorCode === 'auth/invaliid-credential') {
        showMessage('Incorrect Email or Password', 'loginMessage');
      } else {
        showMessage('Account does not Exist.' + "ErrorCode: " + errorCode, 'loginMessage')
      }
    }) 
 } )
  