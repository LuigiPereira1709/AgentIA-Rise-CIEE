import {
  type BrandVariants,
  createDarkTheme,
  createLightTheme,
  type Theme,
} from "@fluentui/react-components";

// CIEE Brand Palette based on design.md
const brandColors: BrandVariants = {
  10: "#0b0512",
  20: "#160a25",
  30: "#210f38",
  40: "#2c154b",
  50: "#3d2060", // Roxo texto (used as dark shade)
  60: "#482372",
  70: "#522781",
  80: "#5b2a8c", // Roxo CIEE (Primary)
  90: "#69339e", 
  100: "#7a47a8", // Roxo médio (Hover)
  110: "#8b59b5",
  120: "#9e70c4",
  130: "#b58fd4",
  140: "#ccb0e3",
  150: "#d4c2ed", // Roxo pastel (Borders/Badges)
  160: "#ede8f5", // Lavanda suave
};

export const lightTheme: Theme = {
  ...createLightTheme(brandColors),
  colorNeutralBackground1: "#ffffff", // Branco
  colorNeutralBackground2: "#f8f6fa", // bg-alt
  colorNeutralBackground3: "#f0edf5", // bg-canvas
  colorNeutralBackground4: "#f0edf5",
  colorNeutralForeground1: "#1a0b2e", // Tinta profunda
  colorNeutralForeground2: "#3d2060", // Roxo texto
  colorNeutralForeground3: "#4a4a52", // Cinza corpo
  colorNeutralForeground4: "#8e8e99", // Cinza muted
};

export const darkTheme: Theme = {
  ...createDarkTheme(brandColors),
  colorNeutralBackground1: "#1a0b2e", // Tinta Profunda
  colorNeutralBackground2: "#24133b", // Roxo Noturno
  colorNeutralBackground3: "#2f1b4a", // Roxo Eclipse
  colorNeutralBackground4: "#2f1b4a", 
  colorNeutralBackground5: "#2f1b4a", 
  colorNeutralBackground6: "#2f1b4a", 
  colorSubtleBackgroundHover: "rgba(255, 255, 255, 0.05)",
  colorSubtleBackgroundPressed: "rgba(255, 255, 255, 0.1)",
  colorSubtleBackgroundSelected: "rgba(255, 255, 255, 0.1)",
  colorNeutralForeground1: "#ffffff", // Branco Puro
  colorNeutralForeground2: "#e2dbec", // Lilás Brilhante
  colorNeutralForeground3: "#b3b3b3", // Cinza Claro Clássico
  colorNeutralForeground4: "#757575", // Cinza Opaco
  colorBrandForeground1: brandColors[110],
  colorBrandForeground2: brandColors[120],
  colorBrandForegroundLink: brandColors[140],
};
