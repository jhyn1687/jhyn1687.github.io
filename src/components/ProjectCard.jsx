function ProjectCard(props) {
  const Icon1 = props.button1Icon;
  return (
    <div className="project-card">
      <img className="project-card-image" src={props.img} />
      <p className="project-card-title"> {props.title} </p>
      <div className="project-card-links">
        {props.button1 && (
          <a href={props.button1Link}>
            <button className="project-card-button">
              {Icon1 && <Icon1 className="project-card-icon" />}{' '}
              {props.button1}
            </button>
          </a>
        )}
        {props.button2 && (
          <a href={props.button2Link}>
            <button className="project-card-button">{props.button2}</button>
          </a>
        )}
      </div>
    </div>
  );
}

export default ProjectCard;
