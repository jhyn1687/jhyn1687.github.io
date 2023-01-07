import ExperienceCard from "./ExperienceCard";
import {
  AiFillCaretDown as Down
} from "react-icons/ai";
import {
  IoDocumentTextSharp as Document
} from "react-icons/io5";
import { Link } from "react-scroll";

function Experiences() {
  return (
    <div id="Experiences" className="section flex-col">
      <div className="flex-col">
        <h1 className="section-title">Experiences</h1>
        <p>Cultivation of Knowledge</p>
      </div>
      <div className="flex-row experience-cards-container">
        <ExperienceCard
          img=""
          title="SHAPELAB"
          subtitle="@ UW"
          list={["Designed server infrastructure", "Rebuilt lab website", "Setup and maintain on-site NAS"]}
        />
        <ExperienceCard
          img="images/Port_of_Seattle_Logo.svg"
          title="Asset Management Intern"
          subtitle="@ Port of Seattle"
          list={["Preliminary development of asset tracking software", "Composed and revised Port-wide policies", "Nominated for an internal innovation award"]}
        />
      </div>
      <a href="resume.pdf">
        <button className="resume-button">
          <Document className="experience-card-icon"/> Resume
        </button>
      </a>
      <Link to="Contact" smooth={true} duration={1000}>
          <Down
            className="icon-link bounce"
          />
        </Link>
    </div>
  );
}

export default Experiences;
