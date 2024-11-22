import ProjectCard from './ProjectCard';

import { useEffect, useState } from 'react';
import Marquee from 'react-fast-marquee';
import getProjects from '../utils/getProjects';
import ProjectCardSkeleton from './ProjectCardSkeleton';

const N_SKELETONS = 4;

function Projects() {
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    getProjects().then((project) => {
      setProjects(project);
    });
  }, []);
  return (
    <section id='Projects' className='section flex-col'>
      <div className='marquee-container'>
        <Marquee className='marquee' autoFill={true} speed={200}>
          <h1 className='marquee-text'>Projects</h1>
        </Marquee>
      </div>
      <div className='flex-col'>
        <h1 className='section-title'>Projects</h1>
        <p>Demonstration of Theory</p>
      </div>
      <div className='flex-row project-cards-container'>
        {projects.length > 0
          ? projects.map((project) => <ProjectCard key={project.id} project={project} />)
          : [...Array(N_SKELETONS)].map((_, i) => <ProjectCardSkeleton key={i} />)}
      </div>
    </section>
  );
}

export default Projects;
