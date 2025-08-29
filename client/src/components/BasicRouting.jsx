import React from "react";
import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Shows from "./pages/Shows";
import Lists from "./pages/Lists";
import SignUp from "./pages/Signup";
import LogIn from "./pages/LogIn";
import SpecificShow from "./pages/SpecificShow";
import UserPage from "./pages/UserPage";

export default function BasicRouting() {
  return (
    <Routes>
      <Route path="/" element={<Home />}></Route>
      <Route path="/shows" element={<Shows />}></Route>
      <Route path="/shows/:showID" element={<SpecificShow />}></Route>
  <Route path="/user/:userId" element={<UserPage />}></Route>
      <Route path="/lists" element={<Lists />}></Route>
      <Route path="/signup" element={<SignUp />}></Route>
      <Route path="/login" element={<LogIn />}></Route>
    </Routes>
  );
}
