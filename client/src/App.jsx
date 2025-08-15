import React from "react";
import BasicRouting from "./components/BasicRouting";
import { BrowserRouter } from "react-router";
import Navbar from "./components/multiuse/Navbar";
import SignupLoginButtons from "./components/multiuse/SignupLoginButtons";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar></Navbar>
      <SignupLoginButtons></SignupLoginButtons>
      <BasicRouting></BasicRouting>
    </BrowserRouter>
  );
}
