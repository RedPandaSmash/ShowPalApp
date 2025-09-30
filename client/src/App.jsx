import React from "react";
import { useEffect, useState } from "react";
import BasicRouting from "./components/BasicRouting";
import { BrowserRouter } from "react-router-dom";
import Navbar from "./components/multiuse/Navbar";
import SignupLoginButtons from "./components/multiuse/SignupLoginButtons";
import LoggedInNavbar from "./components/multiuse/LoggedInNavbar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Footer from "./components/multiuse/Footer";

function InnerApp() {
  const { isSignedIn } = useAuth();
  return (
    <div style={{ background: "#0a174e", minHeight: "100vh", width: "100vw" }}>
      <BrowserRouter>
        <Navbar />
        {isSignedIn ? <LoggedInNavbar /> : <SignupLoginButtons />}
        <div style={{ paddingBottom: 140 }}>
          <BasicRouting />
        </div>
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}
