import { useEffect, useRef } from 'react';
import Globe from 'react-globe.gl'

import useWindowSize from '../hooks/useWindowSize';

function Earth() {
  const globeEl = useRef();
  const globeContainerRef = useRef(null);
  const [width, height] = useWindowSize();

  const objs = [{lat: 22.728689, lng: 113.824020}, {lat: 47.608013, lng: -122.335167}, {lat: 37.554169, lng: -122.313057}]
  const arcs = [{startLat: 22.728689, startLng: 113.824020, endLat: 47.608013, endLng: -122.335167},
    {startLat: 47.608013, startLng: -122.335167, endLat: 37.554169, endLng: -122.313057}]
  
  useEffect(() => {
    // Auto-rotate
    globeEl.current.pointOfView({lat: 39.6, lng: -98.5, altitude: 3})
    globeEl.current.controls().autoRotate = true;
    globeEl.current.controls().autoRotateSpeed = .75;
    globeEl.current.controls().enabled = false;
  }, []);

  return (
    <div id='Globe' ref={globeContainerRef}>
      <Globe
        ref={globeEl}
        arcsData={arcs}
        objectsData={objs}
        objectAltitude={0}
        height={height}
        width={width}
        arcAltitudeAutoScale={0.25}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      />
    </div>
  )
}

export default Earth;