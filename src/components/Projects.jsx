import {
  AiFillCaretDown as Down
} from "react-icons/ai";
import {
  Link
} from "react-scroll";

function Projects() {
  return (
    <div id="Projects" className="section flex-row">
      <div className="flex-row">
        <p>These are some projects that I've worked on</p>
        <p>These are some projects that I've worked on</p>
        <p>These are some projects that I've worked on</p>
        <p>These are some projects that I've worked on</p>
      </div>
      <div className="flex-col">
        <h1>Projects</h1>
        <p>These are some projects that I've worked on</p>
        <Link
          to="Projects"
          smooth={true}
          duration={1000}
        >
          <Down className="icon-link bounce" style={{fontSize: "2rem", marginTop: "2rem"}}/>
        </Link>
      </div>
    </div>
  );
}

export default Projects;
