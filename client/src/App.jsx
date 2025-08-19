import React from "react";
import { useEffect, useState } from "react";
import BasicRouting from "./components/BasicRouting";
import { BrowserRouter } from "react-router";
import Navbar from "./components/multiuse/Navbar";
import SignupLoginButtons from "./components/multiuse/SignupLoginButtons";
import LoggedInNavbar from "./components/multiuse/LoggedInNavbar";
import { checkIsSignedIn } from "./utils/auth";

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const check = () => checkIsSignedIn().then(setIsSignedIn);
    check();
    // Listen for token changes in localStorage
    const onStorage = (e) => {
      if (e.key === "token") check();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <BrowserRouter>
      <Navbar></Navbar>
      {isSignedIn ? <LoggedInNavbar /> : <SignupLoginButtons />}
      <BasicRouting></BasicRouting>
    </BrowserRouter>
  );
}
