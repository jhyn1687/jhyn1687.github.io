import ExperienceCard from "./ExperienceCard";
import { AiOutlineFileText as Document } from "react-icons/ai";
import FloatUpDiv from "./FloatUpDiv";
import Marquee from "react-fast-marquee";
import { useEffect, useState } from "react";
import getExperiences from "../utils/getExperiences";
import getFileUrl from "../utils/getFileUrl";
import ExperienceCardSkeleton from "./ExperienceCardSkeleton";

const N_SKELETONS = 4;

function Experiences() {
  const [experiences, setExperiences] = useState([]);
  useEffect(() => {
    getExperiences().then((experience) => {
      setExperiences(experience);
    });
  }, []);
  return (
    <section id="Experiences" className="section flex-col">
      <div className="marquee-container">
        <Marquee
          className="marquee"
          autoFill={true}
          speed={200}
          direction="right"
        >
          <h1 className="marquee-text">Experiences</h1>
        </Marquee>
      </div>
      <div className="flex-col">
        <h1 className="section-title">Experiences</h1>
        <p>Cultivation of Knowledge</p>
      </div>
      <div className="flex-row experience-cards-container">
        {experiences.length > 0
          ? experiences.map((experience) => (
              <ExperienceCard experience={experience} key={experience.id} />
            ))
          : [...Array(N_SKELETONS)].map((_, i) => (
              <ExperienceCardSkeleton key={i} />
            ))}
      </div>
      <a href={getFileUrl({filePath: "resume.pdf", download: true})}>
        <FloatUpDiv>
          <button className="resume-button">
            <Document className="experience-card-icon" /> Resume
          </button>
        </FloatUpDiv>
      </a>
    </section>
  );
}

export default Experiences;
