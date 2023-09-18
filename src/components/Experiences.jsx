import ExperienceCard from "./ExperienceCard";
import { AiOutlineFileText as Document } from "react-icons/ai";
import FloatUpDiv from "./FloatUpDiv";

function Experiences() {
  return (
    <div id="Experiences" className="section flex-col">
      <div className="flex-col">
        <h1 className="section-title">Experiences</h1>
        <p>Cultivation of Knowledge</p>
      </div>
      <div className="flex-row experience-cards-container">
        <ExperienceCard
          title="Software Engineer"
          subtitle="@ Center for Reproducible Biomedical Modeling"
          list={[
            "Designed and developed a web UI for biology researchers to access published articles and associated models/simulation in Biosimulations",
          ]}
        />
        <ExperienceCard
          title="Student Assistant"
          subtitle="@ SHAPELAB UW"
          list={[
            "Designed server infrastructure",
            "Rebuilt lab website",
            "Setup and maintain on-site NAS",
          ]}
        />
        <ExperienceCard
          title="Asset Management Intern"
          subtitle="@ Port of Seattle"
          list={[
            "Preliminary development of asset tracking software",
            "Composed and revised Port-wide policies",
            "Nominated for an internal innovation award",
          ]}
        />
      </div>
      <a href="resume.pdf">
        <FloatUpDiv>
        <button className="resume-button">
          <Document className="experience-card-icon" /> Resume
        </button>
        </FloatUpDiv>
      </a>
    </div>
  );
}

export default Experiences;
