const hamb = document.getElementById('menuMobile');


// Select the elements
const menu = document.getElementById('headerMini');
const nav = document.getElementById('navMobile');

// Function to toggle the menu
function toggleMenu() {

    console.log('Menu clicked'); // Debugging
    console.log(nav); 
    // Toggle the expanded and collapsed classes
    menu.classList.toggle('min-height');
    menu.classList.toggle('max-height');
    hamb.classList.toggle('hidden');
    nav.classList.toggle('hidden');

    // Optional: Toggle an "active" class for the hamburger animation
    menu.classList.toggle('active');
}

// Add an event listener to the menu button
menu.addEventListener('click', toggleMenu);

document.addEventListener('click', (event) => {
    if (!nav.contains(event.target) && !menu.contains(event.target)) {
        nav.classList.remove('menu-expanded');
        nav.classList.add('menu-collapsed');
        menu.classList.remove('active');
    }
});
