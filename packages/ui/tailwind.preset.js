const colors = {
  background: "#0a0a0a",
  backgroundSoft: "#121212",
  surface: "#181818",
  surfaceElevated: "#1f1f1f",
  surfaceCard: "#1a1a1a",
  surfaceCardAlt: "#222222",
  surfaceGlass: "rgba(24, 24, 24, 0.82)",
  accent: "#1ed760",
  accentSoft: "rgba(30, 215, 96, 0.14)",
  accentBorder: "#1db954",
  accentGlow: "rgba(30, 215, 96, 0.35)",
  text: "#ffffff",
  muted: "#a7a7a7",
  subtle: "#cbcbcb",
  emphasis: "#fdfdfd",
  negative: "#f3727f",
  warning: "#ffa42b",
  announcement: "#539df5",
  border: "rgba(255, 255, 255, 0.08)",
  borderLight: "rgba(255, 255, 255, 0.14)",
  separator: "#3f3f3f",
  artworkPlaceholder: "#282828",
  youtube: "#ff4b4b",
  jiosaavn: "#1ed760",
  spotify: "#1db954",
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        vault: colors,
      },
      fontFamily: {
        sans: ["Inter_400Regular", "System"],
        title: ["PlusJakartaSans_700Bold", "Inter_400Regular", "System"],
      },
      fontSize: {
        micro: ["10px", { lineHeight: "1" }],
        badge: ["10.5px", { lineHeight: "1.33" }],
        caption: ["14px", { lineHeight: "1.5" }],
        body: ["16px", { lineHeight: "1" }],
        heading: ["18px", { lineHeight: "1.3" }],
        title: ["24px", { lineHeight: "1" }],
      },
      borderRadius: {
        vault: {
          sm: "6px",
          md: "10px",
          lg: "14px",
          xl: "18px",
          "2xl": "22px",
          pill: "9999px",
        },
        pill: "9999px",
      },
      boxShadow: {
        vault: {
          soft: "0px 4px 24px rgba(0, 0, 0, 0.45)",
          medium: "0px 8px 32px rgba(0, 0, 0, 0.5)",
          heavy: "0px 16px 48px rgba(0, 0, 0, 0.65)",
          glow: "0px 0px 28px rgba(30, 215, 96, 0.22)",
          inset:
            "rgb(18, 18, 18) 0px 1px 0px, rgba(255, 255, 255, 0.08) 0px 0px 0px 1px inset",
        },
      },
      letterSpacing: {
        button: "1.4px",
      },
    },
  },
};
