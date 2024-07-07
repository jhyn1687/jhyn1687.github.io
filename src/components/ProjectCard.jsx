import FloatUpDiv from "./FloatUpDiv";
import {
  AiFillGithub as GitHub,
  AiFillYoutube as YouTube,
} from "react-icons/ai";
import getImageUrl from "../utils/getImageUrl";
import Button from "./Button";

function ProjectCard({ project: { title, buttons, image_path } }) {
  return (
    <FloatUpDiv>
      <div className="project-card">
        <img
          className="project-card-image"
          src={getImageUrl({ filePath: image_path })}
        />
        <p className="project-card-title"> {title} </p>
        <div className="project-card-links">
          {buttons.map((button) => {
            let Icon;
            switch (button.icon) {
              case "GitHub":
                Icon = GitHub;
                break;
              case "YouTube":
                Icon = YouTube;
                break;
              default:
                Icon = null;
                break;
            }
            return (
              <Button
              className="project-card-button"
                key={button.text}
                icon={Icon}
                link={button.link}
                text={button.text}
              />
            );
          })}
        </div>
      </div>
    </FloatUpDiv>
  );
}

export default ProjectCard;
