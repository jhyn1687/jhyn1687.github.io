import { useRef , useEffect } from 'react';
import Globe from 'react-globe.gl'

function Earth() {
  const globeEl = useRef()
  useEffect(() => {
    // Auto-rotate
    globeEl.current.pointOfView({lat: 39.6, lng: -98.5})
    globeEl.current.controls().autoRotate = true;
    globeEl.current.controls().autoRotateSpeed = -0.5;
    globeEl.current.controls().enabled = false;
  }, []);

  return (
    <div>
      
    <Globe
      ref={globeEl}
      height={window.innerHeight}
      width={window.innerWidth * 0.5}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
    />
    </div>
  )
}

export default Earth;