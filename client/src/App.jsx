import React from "react";
import BasicRouting from "./components/BasicRouting";
import { BrowserRouter } from "react-router";
import Navbar from "./components/multiuse/Navbar";
import SignupLoginButtons from "./components/multiuse/SignupLoginButtons";
import LoggedInNavBar from "./components/multiuse/LoggedInNavBar";

export default function App() {
  const token = localStorage.getItem("token");
  const isSignedIn = Boolean(token);

  return (
    <BrowserRouter>
      <Navbar></Navbar>
      {isSignedIn ? <LoggedInNavBar /> : <SignupLoginButtons />}
      <BasicRouting></BasicRouting>
    </BrowserRouter>
  );
}
