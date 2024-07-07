/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	theme: {
		container: {
			center: true,
			screens: {
				sm: "640px",
				md: "768px",
				lg: "1024px",
				xl: "1170px",
				"2xl": "1170px",
			},
			
		},
		extend: {
			colors: {
				primary: {
					400: "#f23d3d",
					500: "#e00000",
					600: "#ba0000",
				},
			},
			fontFamily: {
				roboto: ["Roboto", "sans-serif"],
			},

			backgroundImage: {
				banner: "url('/homepage-banner.png')"
			}
		},
	},
	plugins: [],
};
