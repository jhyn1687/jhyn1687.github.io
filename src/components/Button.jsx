const Button = ({ icon, link, text, className }) => {
  const Icon = icon;
  return (
    <a href={link}>
      <button className={className}>
        {Icon && <Icon className="button-icon" />} {text}
      </button>
    </a>
  );
};

export default Button;
