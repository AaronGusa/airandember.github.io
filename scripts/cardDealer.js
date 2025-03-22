const designArray = [
    {
        designName: "Asymmetrical",
        designImg: "../assets/images/designAssets/SITE_Asymm.png",
        designDesc: "Breaks conventional grid-based layouts. Often dynamic and unpredictable, with unique design approaches.",
        designPage: "../pages/designs/aysmmetrical.html"
    },
    {
        designName: "Brutalist",
        designImg: "../assets/images/designAssets/SITE_Brut.png",
        designDesc: `Raw and unconventional design with a "rough" aesthetic, breaking traditional rules. It's functional, edgy, and appeals to niche audiences.`,
        designPage: "../pages/designs/brutalist.html"
    },
    {
        designName: "Dark Mode",
        designImg: "../assets/images/placeholder.png",
        designDesc: `Uses darker color schemes to reduce eye strain and create a modern look. Often complemented with neon accents or minimalistic details.`,
        designPage: "../pages/designs/darkMode.html"
    },
    {
        designName: "Flat Design",
        designImg: "../assets/images/placeholder.png",
        designDesc: "Emphasizes simplicity with two-dimensional elements, bright colors, and clean typography. Focuses on clarity and functionality.",
        designPage: "../pages/designs/flatDesign.html"
    },
    {
        designName: "Illustration-Led",
        designImg: "../assets/images/placeholder.png",
        designDesc: "Features hand-drawn or digital illustrations as focal points. Adds a playful, artistic vibe to the user experience.",
        designPage: "../pages/designs/illustrationLed.html"
    },
    {
        designName: "Material Design",
        designImg: "../assets/images/placeholder.png",
        designDesc: "Inspired by Google’s design philosophy, it uses depth, shadows, and animations to create a tactile and realistic feel.",
        designPage: "../pages/designs/material.html"
    },
    {
        designName: "Maximalist",
        designImg: "../assets/images/placeholder.png",
        designDesc: "Vibrant and bold visuals with intricate layouts, patterns, and textures. Used to tell immersive stories or leave a strong impression.",
        designPage: "../pages/designs/maximalist.html"
    },
    {
        designName: "Minimalist",
        designImg: "../assets/images/placeholder.png",
        designDesc: "Clean, simple layouts with ample white space. Focuses on clarity, usability, and visual harmony.",
        designPage: "../pages/designs/minimalist.html"
    },
    {
        designName: "Neumorphism",
        designImg: "../assets/images/placeholder.png",
        designDesc: "A combination of flat design and skeuomorphism, featuring soft shadows and gradients to create a subtle 3D effect.",
        designPage: "../pages/designs/neumorphism.html"
    },
    {
        designName: "Retro/Vintage",
        designImg: "../assets/images/placeholder.png",
        designDesc: "Nostalgic designs inspired by past decades, using vintage typography, textures, and color schemes to evoke familiarity.",
        designPage: "../pages/designs/retro.html"
    },
    {
        designName: "Skeuomorphic",
        designImg: "../assets/images/placeholder.png",
        designDesc: "Mimics real-world objects with realistic textures, shadows, and details, creating a sense of familiarity and tangibility.",
        designPage: "../pages/designs/skeuomorphic.html"
    },
    {
        designName: "Typography",
        designImg: "../assets/images/placeholder.png",
        designDesc: "Centers the design around typography, using bold, creative fonts as a key visual element with minimal imagery.",
        designPage: "../pages/designs/typography.html"
    }
]

const cardGrid = document.getElementById('designCardGrid');

for (let i = 0; i < designArray.length; i++) {
    const { designName, designImg, designDesc, designPage } = designArray[i];

    const html = `
        <a href="${designPage}" class="designCardLink">
            <div class="designCardCont">
                <img src="${designImg}" alt="${designName} Image" class="designCardImg">
                <div class="designCardWordCont">
                    <h2 class="designCardTitle">${designName}</h2>
                    <p class="designCardDesc">
                        ${designDesc}
                    </p>
                </div>
            </div>
        </a>    
    `;

    // Append the HTML to the designCardGrid
    cardGrid.innerHTML += html;
}
