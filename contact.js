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
  const phone = document.getElementById('phone').value;
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value;

  const emailContent = {
      name,
      companyName,
      subject,
      phone,
      email,
      message
  };

   // Show the loading circle
   document.getElementById('loadingCircle').classList.remove('hidden');

  fetch('https://aaronandemberbe.onrender.com/contact', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailContent)
  })
  .then(response => response.json())
  .then(data => {
      console.log('Email sent:');
      console.log(data);
      // Display success message
      document.getElementById('loadingCircle').classList.add('hidden');
      document.getElementById('contactForm').classList.add('hidden');
      document.getElementById('emailConfirm').classList.remove('hidden');
  })
  .catch(error => {
      console.error('Error:', error);
      // Display error message
      alert('Oops! Something went wrong. Please try again later or email support@airandember.com for help.');
  });
});
