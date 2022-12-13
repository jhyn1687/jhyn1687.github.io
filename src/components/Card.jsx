function Card(props) {
  const Icon1 = props.button1Icon;
  return (
    <div className="card">
      <img className="card-image" src={props.img} />
      <p className="card-title"> {props.title} </p>
      <div className="card-links">
        {props.button1 && (
          <a href={props.button1Link}>
            <button className="card-button">
              {Icon1 && <Icon1 className="card-icon" />}{' '}
              {props.button1}
            </button>
          </a>
        )}
        {props.button2 && (
          <a href={props.button2Link}>
            <button className="card-button">{props.button2}</button>
          </a>
        )}
      </div>
    </div>
  );
}

export default Card;
