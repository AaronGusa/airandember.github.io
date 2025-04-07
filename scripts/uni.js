const loggedLinks = document.getElementsByClassName('loginLink');

// Loop through all elements with the class 'loginLink'
for (let i = 0; i < loggedLinks.length; i++) {
    if (!localStorage.loggedIn || localStorage.loggedIn === 'False') {
        console.log('Entered LocalStorage NOT Logged in');
        loggedLinks[i].innerHTML = "Login";
        loggedLinks[i].href = "/airandember/pages/login.html";
    } else if (localStorage.loggedIn === 'True') {
        console.log("We're Logged in!");
        loggedLinks[i].innerHTML = "Dashboard";
        loggedLinks[i].href = "/airandember/pages/secure.html"; // Example redirect
    }
}