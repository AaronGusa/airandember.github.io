document.getElementById('contactForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const honeypot = document.querySelector('[name="contact_me_back"]').checked;
  if (honeypot) {
      console.log('Spam bot detected');
      return;
  }

  const name = document.getElementById('name').value;
  const companyName = document.getElementById('company_name').value;
  const subject = `RING A DING: You've got Air& Ember site contact e-mail!`;
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value;

  const emailContent = {
      name,
      companyName,
      subject,
      email,
      message
  };

  fetch('https://aaronandemberbe.onrender.com/contact', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailContent)
  })
  .then(response => response.json())
  .then(data => {
      console.log('Email sent:', data);
  })
  .catch(error => {
      console.error('Error:', error);
  });
})