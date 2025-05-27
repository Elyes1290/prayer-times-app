// app/index.tsx
import React from "react";
import HomeScreen from "../screens/HomeScreen";

// Index.tsx se contente de renvoyer HomeScreen, le layout gère le drawer
export default function Index() {
  return <HomeScreen />;
}
