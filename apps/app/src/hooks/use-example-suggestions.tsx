import { useConfigureSuggestions } from "@copilotkit/react-core/v2";

// Estore adaptation: shopping-focused starter suggestions.
const ESTORE_SUGGESTIONS = [
  { title: "Best laptops for work", message: "What are the best laptops for work in your store?" },
  { title: "Wireless headphones", message: "Show me wireless noise cancelling headphones under $450" },
  { title: "Compare phones", message: "Compare the iPhone 15 Pro Max and the Samsung Galaxy S24 Ultra" },
  { title: "Gift under $100", message: "Gift ideas under $100" },
];

export const useExampleSuggestions = () => {
  useConfigureSuggestions({
    suggestions: ESTORE_SUGGESTIONS,
    available: "always",
  });
};
