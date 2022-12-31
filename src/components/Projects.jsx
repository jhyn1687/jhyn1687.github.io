import ProjectCard from "./ProjectCard";
import {
  AiFillGithub as Github,
  AiFillCaretDown as Down,
  AiFillYoutube as YouTube
} from "react-icons/ai";
import { Link } from "react-scroll";

function Projects() {
  return (
    <div id="Projects" className="section flex-col">
      <div className="flex-col">
        <h1 className="section-title">Projects</h1>
        <p>Demonstration of Theory</p>
      </div>
      <div className="flex-row project-cards-container">
        <ProjectCard
          img="images/wwyfv2.png"
          title="WhereWhenYouFly V2 | Interactive Article"
          button1="Github"
          button1Link="//github.com/evaliu2002/WhereWhenYouFlyV2"
          button1Icon={Github}
          button2="Visualization"
          button2Link="//wwyfv2.tnyyn.com"
        />
        <ProjectCard
          img="images/stylegans.png"
          title="StyleGANs | Graphics Exploration"
          button1="Video"
          button1Link="//youtu.be/_x7jpMqJFF0"
          button1Icon={YouTube}
        />
        <ProjectCard
          img="images/cat-dog.png"
          title="Cats vs Dogs | ML Exploration"
          button1="Article"
          button1Link="//cat-dog.tnyyn.com"
        />
      </div>
      
      <Link to="Experiences" smooth={true} duration={1000}>
          <Down
            className="icon-link bounce"
          />
        </Link>
    </div>
  );
}

export default Projects;
