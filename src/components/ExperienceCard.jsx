function ExperienceCard(props) {
  const Icon1 = props.button1Icon;
  return (
    <div className="experience-card">
      <p className="experience-card-title"> {props.title} </p>
      <p className="experience-card-subtitle"> {props.subtitle} </p>
      <div className="experience-card-list">
        <ul>
          {props.list && props.list.map(item => <li key={item} className="experience-card-item">{item}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default ExperienceCard;
