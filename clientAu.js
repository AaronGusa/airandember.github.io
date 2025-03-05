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
    return data;
  } else {
    console.error('Failed to fetch protected data ' + response.json() );
  }
}

// Example usage:
// fetchProtectedData('https://aaronandemberbe.onrender.com/service/');

// In your secure.html, other functions can use fetchProtectedData:
async function stripeIt(sid) {
  try {
    await fetchProtectedData(`https://aaronandemberbe.onrender.com/service/${sid}`)
    // .then(response => response.json())
    .then(data => {
        let messageCont = document.getElementById('profileDiv');
    
        console.log("Data: " + data);
    
        let customer = data;
        let card = document.createElement('div');
        console.log(customer)
        card.className = 'strInfo ';
        card.innerHTML = `
            <p><strong>Name:</strong> ${customer.name}</p>
            <p><strong>Email:</strong>      ${customer.email}</p>
            <p><strong>Phone:</strong>      ${customer.phone}</p>
            <p><strong>Address:</strong>    ${customer.address.line1}, ${customer.address.city}, ${customer.address.state} ${customer.address.postal_code}, ${customer.address.country}</p>
            <p><strong>Description:</strong> ${customer.description}</p>
            <!--<p><strong>Balance:</strong>     $${customer.balance} ${customer.currency.toUpperCase()}</p>-->
        `;
        messageCont.appendChild(card);
        }
    )
    .catch(error => {
        console.error('Error:', error);
    });
    

  } catch (error) {
    console.error('Error:', error);
  }
}

async function getInvoices(sid) {
  try {
    await fetchProtectedData(`https://aaronandemberbe.onrender.com/service/invoices/${sid}`)
    // .then(response => {
    //     if (!response.ok) {
    //         throw new Error('Network response was not ok');
    //     }
    //     return response.json();
    // })
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
  } catch (error) {
    console.error('Error:', error);
  }
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
            const welcomeName = document.getElementById('clientWelcomeName');
            welcomeName.innerHTML = `${userData.fname}`;  


            const placement = document.getElementById('clientInfo');
            placement.innerHTML = `
              
              <p><strong>First Name:</strong> ${userData.fname}</p>
              <p><strong>Last Name:</strong> ${userData.lname}</p>
              <p><strong>Email:</strong> ${userData.email}</p>
              <p><strong>Phone:</strong> (${userData.phone[0]}${userData.phone[1]}${userData.phone[2]}) ${userData.phone[3]}${userData.phone[4]}${userData.phone[5]}-${userData.phone[6]}${userData.phone[7]}${userData.phone[8]}${userData.phone[9]}</p>
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
