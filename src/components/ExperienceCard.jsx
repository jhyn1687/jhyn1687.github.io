import FloatUpDiv from "./FloatUpDiv";

function ExperienceCard(props) {
  return (
    <FloatUpDiv whileHover={{ rotate: 1, scale: 1.025 }}>
      <div className={props.current ? "experience-card current-experience" : "experience-card"}>
        <p className="experience-card-title"> {props.title} </p>
        <p className="experience-card-subtitle"> {props.subtitle} </p>
        <div className="experience-card-list">
          <ul>
            {props.list &&
              props.list.map((item) => (
                <li key={item} className="experience-card-item">
                  {item}
                </li>
              ))}
          </ul>
        </div>
        <div className="project-card-links">
          {props.button && (
            <a href={props.buttonLink}>
              <button className="experience-card-button">{props.button}</button>
            </a>
          )}
        </div>
      </div>
    </FloatUpDiv>
  );
}

export default ExperienceCard;
