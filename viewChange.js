const links = document.querySelectorAll('.nav-link');
        const contentDivs = document.querySelectorAll('.content-div');

        links.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();

                // Hide all content divs
                contentDivs.forEach(div => div.classList.add('hidden'));

                // Remove selected class from all links
                links.forEach(link => link.classList.remove('selected'));

                // Show the selected content div
                const targetId = link.getAttribute('data-target');
                document.getElementById(targetId).classList.remove('hidden');

                // Add selected class to the clicked link
                link.classList.add('selected');
            });
        });

        // Optionally, show the profile section by default
        document.querySelector('.nav-link[data-target="profile"]').click();