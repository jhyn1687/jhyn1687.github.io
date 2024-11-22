import { useEffect } from 'react';
import Header from './components/Header';
import Home from './components/Home';
import Projects from './components/Projects';
import Experiences from './components/Experiences';
import { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './App.css';

function App() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className='App'>
      <SkeletonTheme baseColor='#00000000' highlightColor='#5050507c' borderRadius='.5rem'>
        <Header />
        <Home />
        <Experiences />
        <Projects />
      </SkeletonTheme>
    </div>
  );
}

export default App;
