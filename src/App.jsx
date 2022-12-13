
import { useEffect } from "react";
import Header from "./components/Header";
import Home from "./components/Home";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import "./App.css";

function App() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  
  return (
    <div className="App">
      <Header />
      <Home />
      <Projects />
      <Contact />
    </div>
  );
}

export default App;
