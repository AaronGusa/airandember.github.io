function sendMail() { document.getElementById('contactForm').addEventListener('submit', function(event) { event.preventDefault();
    const honeypot = document.querySelector('[name="contact_me_by_email"]').checked;
     if (honeypot) { 
       console.log('Spam bot detected');
        return;
     } 
     const name = document.getElementById('name').value;
     const famName = document.getElementById('famName').value;
     const subject = `RING A DING: You've got site mail!`;
     const email = document.getElementById('email').value;
     const message = document.getElementById('message').value;
     const emailContent = `Name: ${name}\nFamily:${famName}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`;
     const mailtoLink = `mailto:drgoose@drgoose.ink?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`;
     window.location.href = mailtoLink; 
     console.log(emailContent);
   }
 );
 }
 