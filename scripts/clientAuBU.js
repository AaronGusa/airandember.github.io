import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore, getDoc,  doc} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import 'dotenv/config';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.apiKey,
    authDomain: process.authDomain,
    projectId: process.projectId,
    storageBucket: process.storageBucket,
    messagingSenderId: process.messagingSenderId,
    appId: process.appId
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
                        getInvoices(userData.stripeID);  
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
        let messageCont = document.getElementById('profileDiv');
    
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

  function getInvoices(sid) {
    fetch(`https://aaronandemberbe.onrender.com/service/invoices/${sid}`, {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data.data);
        let messageCont = document.getElementById('invoiceDiv');

        let invoicesByYear = {};

        if (data.data.length > 0) {
            // Organize invoices by year
            data.data.forEach(invoice => {
                let year = new Date(invoice.created * 1000).getFullYear();
                if (!invoicesByYear[year]) {
                    invoicesByYear[year] = [];
                }
                invoicesByYear[year].push(invoice);
            });

            // Create the accordion structure
            Object.keys(invoicesByYear).forEach(year => {
                let yearDiv = document.createElement('div');
                yearDiv.className = 'yearAccordion';
                yearDiv.innerHTML = `
                    <div class="accordion-header">
                        <h2>${year} Invoices</h2>
                        <div class='downArrow'>
                            <h2>View <span >&#x21A1<span></h2>
                        </div>
                    </div>
                    <div class="accordion-content hide" style='max-height: 0px;'>
                    </div>
                `;
                messageCont.appendChild(yearDiv);

                let accordionContent = yearDiv.querySelector('.accordion-content');

                invoicesByYear[year].forEach(invoice => {
                    let dateCreated = new Date(invoice.created * 1000).toLocaleDateString('en-US', {month: 'long', day: '2-digit'});
                    let moneyMaker = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'});
                    let amount = moneyMaker.format(invoice.amount_due);
                    let amountPaid = moneyMaker.format(invoice.amount_paid);
                    let status;
                    if (invoice.status === 'paid') {
                        status = 'invoiceStatusGreen';
                    } else {
                        status = 'invoiceStatusNotGreen';
                    };

                    let card = document.createElement('div');
                    card.className = 'invoiceCard';
                    card.innerHTML = `
                        <h3>${dateCreated} </h3>
                        <p><strong>Description:</strong> ${invoice.description}</p>
                        <p><strong>Amount:</strong> ${amount}</p>
                        <h3 class=${status}>${invoice.status.toUpperCase()}<?h3>
                    `;
                    accordionContent.appendChild(card);
                });

                yearDiv.querySelector('.accordion-header').addEventListener('click', () => {
                    let content = yearDiv.querySelector('.accordion-content');
                    toggleAccordion(content);
                
            })})
        }
    })
    .catch(error => {
        if (error instanceof SyntaxError) {
            console.error('SyntaxError: Unexpected end of input - Check if the response is valid JSON:', error);
        } else {
            console.error('Error:', error);
        }
    })
}

function toggleAccordion(content) {
    if (content.classList.contains('show')) {
        content.classList.remove('show');
        content.classList.add('hide');
        content.style.maxHeight = 0;
    } else {
        content.classList.remove('hide');
        content.classList.add('show');
        content.style.maxHeight = content.scrollHeight + 'px';
    }
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

  