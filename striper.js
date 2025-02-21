fetch('https://aaronandemberbe.onrender.com/service/', {
    method: 'GET'
})
.then(response => response.json())
.then(data => {
    let dataCustomers = data.data;
    let messageCont = document.getElementById('message');

    console.log(dataCustomers);

    for (let i = 0; i < dataCustomers.length; i++) {
        let customer = dataCustomers[i];
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
})
.catch(error => {
    console.error('Error:', error);
});


// );
// wbs.onmessage = (event) => {
//     const message = JSON.parse(event.data);
//     let messageCont = document.getElementById('message');
//     messageCont.innerText(message);
// };
// wbs.send('Hello from the client')