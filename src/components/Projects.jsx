import Card from "./Card";
import {
  AiFillGithub as Github,
  AiFillCaretDown as Down,
} from "react-icons/ai";
import { Link } from "react-scroll";

function Projects() {
  return (
    <div id="Projects" className="section flex-row">
      <div className="flex-row">
        <Card
          className="shadow-dark-green"
          img="images/alhaitham.jpg"
          title="hi"
        />
        <Card
          img="images/alhaitham.jpg"
          title="al-hi-tham"
          button1="Github"
          button1Link="//tnyyn.com"
          button1Icon={Github}
          button2="Demo"
          button2Link="//tnyyn.com"
        />
      </div>
      <div className="flex-col">
        <h1>Projects</h1>
        <p>These are some projects that I've worked on</p>
        <Link to="Projects" smooth={true} duration={1000}>
          <Down
            className="icon-link bounce"
            style={{ fontSize: "2rem", marginTop: "2rem" }}
          />
        </Link>
      </div>
    </div>
  );
}

export default Projects;
