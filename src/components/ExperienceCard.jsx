import FloatUpDiv from './FloatUpDiv';

function ExperienceCard({ experience: { job_title, company, highlights, link } }) {
  return (
    <FloatUpDiv className='experience-card'>
      <p className='experience-card-title'> {job_title} </p>
      <p className='experience-card-subtitle'> @ {company} </p>
      <ul className='experience-card-list'>
        {highlights.map((item) => (
          <li key={item} className='experience-card-item'>
            {item}
          </li>
        ))}
      </ul>
      <div className='experience-card-links'>
        {link && (
          <a href={link.link}>
            <button className='experience-card-button'>{link.text}</button>
          </a>
        )}
      </div>
    </FloatUpDiv>
  );
}

export default ExperienceCard;
