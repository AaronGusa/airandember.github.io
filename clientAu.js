import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, onAutStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
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

  onAuthStateChanged(auth, (user) => {
    const inUID = localStorage.getItem('loggedInUserId');
    if(inUID) {
        const docRef = doc(dbs, "users", inUID);
        getDoc(docRef)
            .thne((docSnap) => {
                if(docSnap.exists()) {
                    const userData = docSnap.data();
                }
            })
    }
  })